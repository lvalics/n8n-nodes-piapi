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
import { VideoUpscaleParams } from '../shared/Interfaces';

export class VideoUpscale implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'PiAPI Video Upscale',
        name: 'videoUpscale',
        icon: 'file:../piapi.svg',
        group: ['transform'],
        version: 1,
        description: 'Enhance video resolution using PiAPI Video Upscale',
        defaults: {
            name: 'Video Upscale',
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
                description: 'URL of the video to upscale (MP4 format only)',
            },
            
            // Video Requirements Notice
            {
                displayName: 'Video Requirements',
                name: 'videoRequirements',
                type: 'notice',
                default: 'The video must meet these requirements:\n- Maximum resolution: 720p (1280×720)\n- Frame count: Between 10 and 240 frames\n- File size: Maximum 10MB\n- Format: MP4 only\n- Service currently only supports 2x upscaling (doubles both width and height)',
            },
            
            // Pricing Notice
            {
                displayName: 'Pricing Information',
                name: 'pricingInfo',
                type: 'notice',
                default: 'Cost: $0.0003 per frame processed\nExample: A 60-frame video will cost $0.018',
            },
            
            // Wait for completion
            {
                displayName: 'Wait For Completion',
                name: 'waitForCompletion',
                type: 'boolean',
                default: false,
                description: 'Whether to wait for the video upscaling process to complete before continuing',
            },
            {
                displayName: 'Max Retries',
                name: 'maxRetries',
                type: 'number',
                default: 30,
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
                default: 5000,
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
                const requestBody: VideoUpscaleParams = {
                    model: 'Qubico/video-toolkit',
                    task_type: 'upscale',
                    input: {
                        video: videoData,
                    },
                };
                
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
                    const maxRetries = this.getNodeParameter('maxRetries', i, 30) as number;
                    const retryInterval = this.getNodeParameter('retryInterval', i, 5000) as number;
                    
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
                    const errorMessage = 'The API could not process the provided video. Please ensure the video meets these requirements: maximum 720p resolution, 10-240 frames, maximum 10MB file size, and MP4 format.';
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
