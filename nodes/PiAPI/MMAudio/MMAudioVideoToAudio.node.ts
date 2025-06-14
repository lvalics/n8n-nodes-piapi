import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeConnectionType,
    NodeOperationError,
    IDataObject,
} from 'n8n-workflow';

import { piApiRequest, waitForTaskCompletion } from '../shared/GenericFunctions';
import { MMAudioVideoToAudioParams } from '../shared/Interfaces';

export class MMAudioVideoToAudio implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'PiAPI MMAudio',
        name: 'mmaudioVideoToAudio',
        icon: 'file:../piapi.svg',
        group: ['transform'],
        version: 1,
        description: 'Generate audio for videos using PiAPI MMAudio',
        defaults: {
            name: 'MMAudio Video to Audio',
        },
        inputs: [NodeConnectionType.Main],
        outputs: [NodeConnectionType.Main],
        credentials: [
            {
                name: 'piAPIApi',
                required: true,
            },
        ],
        properties: [
            // Video Input
            {
                displayName: 'Video Input Method',
                name: 'videoInputMethod',
                type: 'options',
                options: [
                    {
                        name: 'URL',
                        value: 'url',
                    },
                    {
                        name: 'Binary Data',
                        value: 'binaryData',
                    },
                ],
                default: 'url',
                description: 'Method to input the video data',
            },
            {
                displayName: 'Video Binary Property',
                name: 'videoBinaryPropertyName',
                type: 'string',
                default: 'data',
                required: true,
                displayOptions: {
                    show: {
                        videoInputMethod: ['binaryData'],
                    },
                },
                description: 'Name of the binary property containing the video data',
            },
            {
                displayName: 'Video URL',
                name: 'videoUrl',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        videoInputMethod: ['url'],
                    },
                },
                description: 'URL of the video (MP4 format only)',
            },
            {
                displayName: 'Video Requirements',
                name: 'videoRequirements',
                type: 'notice',
                default: 'Video must be in MP4 format. Maximum length is 30 seconds.',
            },
            
            // Prompt
            {
                displayName: 'Prompt',
                name: 'prompt',
                type: 'string',
                typeOptions: {
                    rows: 4,
                },
                default: '',
                description: 'Prompt text for audio generation',
            },
            
            // Negative Prompt
            {
                displayName: 'Negative Prompt',
                name: 'negativePrompt',
                type: 'string',
                typeOptions: {
                    rows: 4,
                },
                default: '',
                description: 'Negative prompt text for audio generation',
            },
            
            // Steps
            {
                displayName: 'Steps',
                name: 'steps',
                type: 'number',
                typeOptions: {
                    minValue: 20,
                    maxValue: 50,
                },
                default: 20,
                description: 'Number of steps for audio generation (20-50)',
            },
            
            // Seed
            {
                displayName: 'Seed',
                name: 'seed',
                type: 'number',
                default: 0,
                description: 'Seed for audio generation (0 for random)',
            },
            
            // Wait for completion
            {
                displayName: 'Wait For Completion',
                name: 'waitForCompletion',
                type: 'boolean',
                default: false,
                description: 'Whether to wait for the audio generation process to complete before continuing',
            },
            {
                displayName: 'Max Retries',
                name: 'maxRetries',
                type: 'number',
                default: 20,
                description: 'Maximum number of retries to check task status',
                displayOptions: {
                    show: {
                        waitForCompletion: [true],
                    },
                },
            },
            {
                displayName: 'Retry Interval',
                name: 'retryInterval',
                type: 'number',
                default: 3000,
                description: 'Interval between retries in milliseconds',
                displayOptions: {
                    show: {
                        waitForCompletion: [true],
                    },
                },
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];

        for (let i = 0; i < items.length; i++) {
            try {
                // Get parameters
                const videoInputMethod = this.getNodeParameter('videoInputMethod', i) as string;
                const prompt = this.getNodeParameter('prompt', i) as string;
                const negativePrompt = this.getNodeParameter('negativePrompt', i, '') as string;
                const steps = this.getNodeParameter('steps', i, 20) as number;
                const seed = this.getNodeParameter('seed', i, 0) as number;
                const waitForCompletion = this.getNodeParameter('waitForCompletion', i, false) as boolean;
                
                // Process video based on input method
                let videoData: string;
                
                if (videoInputMethod === 'url') {
                    videoData = this.getNodeParameter('videoUrl', i) as string;
                } else {
                    // Binary data method
                    const videoBinaryPropertyName = this.getNodeParameter('videoBinaryPropertyName', i) as string;
                    const videoBinaryData = this.helpers.assertBinaryData(i, videoBinaryPropertyName);
                    
                    if (videoBinaryData.mimeType && !videoBinaryData.mimeType.includes('video/mp4')) {
                        throw new NodeOperationError(
                            this.getNode(),
                            'The provided binary data is not an MP4 video',
                            { itemIndex: i },
                        );
                    }
                    
                    // Convert binary data to base64
                    const base64String = Buffer.from(await this.helpers.getBinaryDataBuffer(i, videoBinaryPropertyName)).toString('base64');
                    videoData = `data:${videoBinaryData.mimeType};base64,${base64String}`;
                }
                
                // Prepare request parameters
                const requestBody: MMAudioVideoToAudioParams = {
                    model: 'Qubico/mmaudio',
                    task_type: 'video2audio',
                    input: {
                        prompt,
                        video: videoData,
                    },
                    config: {},
                };
                
                // Add optional parameters if provided
                if (negativePrompt) {
                    requestBody.input.negative_prompt = negativePrompt;
                }
                
                if (steps) {
                    requestBody.input.steps = steps;
                }
                
                if (seed) {
                    requestBody.input.seed = seed;
                }
                
                // Make the API request
                const response = await piApiRequest.call(
                    this,
                    'POST',
                    '/api/v1/task',
                    requestBody as unknown as IDataObject,
                );
                
                const taskId = response.data?.task_id;
                
                if (!taskId) {
                    throw new NodeOperationError(this.getNode(), 'Failed to get a valid task ID from the API');
                }
                
                let executionData;
                
                if (waitForCompletion) {
                    const maxRetries = this.getNodeParameter('maxRetries', i, 20) as number;
                    const retryInterval = this.getNodeParameter('retryInterval', i, 3000) as number;
                    
                    // Wait for the task to complete and get the result
                    executionData = await waitForTaskCompletion.call(
                        this,
                        taskId,
                        maxRetries,
                        retryInterval,
                    );
                } else {
                    // Return just the task ID and status
                    executionData = {
                        task_id: taskId,
                        status: response.data?.status || 'pending',
                    };
                }
                
                returnData.push({
                    json: executionData,
                });
            } catch (error) {
                // Add specific messaging for common errors
                if (error.message && error.message.includes('failed to get valid video')) {
                    const errorMessage = 'The API could not process the provided video. Please ensure the video is accessible, in MP4 format, and no longer than 30 seconds.';
                    if (this.continueOnFail()) {
                        returnData.push({
                            json: {
                                error: errorMessage,
                                details: error.message,
                            },
                        });
                        continue;
                    }
                    throw new NodeOperationError(this.getNode(), errorMessage);
                }
                
                if (this.continueOnFail()) {
                    returnData.push({
                        json: {
                            error: error.message,
                        },
                    });
                    continue;
                }
                throw error;
            }
        }
        
        return [returnData];
    }
}
