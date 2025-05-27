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
import { DiffRhythmAudioParams } from '../shared/Interfaces';

export class DiffRhythmAudioGeneration implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'PiAPI DiffRhythm Audio Generation',
        name: 'diffRhythmAudioGeneration',
        icon: 'file:../piapi.svg',
        group: ['transform'],
        version: 1,
        description: 'Generate audio based on lyrics or style using PiAPI DiffRhythm',
        defaults: {
            name: 'DiffRhythm Audio Generation',
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
            // Task Type
            {
                displayName: 'Task Type',
                name: 'taskType',
                type: 'options',
                options: [
                    {
                        name: 'Base (1.35 min)',
                        value: 'txt2audio-base',
                        description: 'Generate audio up to 1.35 minutes in length',
                    },
                    {
                        name: 'Full (4.45 min)',
                        value: 'txt2audio-full',
                        description: 'Generate audio up to 4.45 minutes in length',
                    },
                ],
                default: 'txt2audio-base',
                description: 'Type of audio generation task',
            },
            
            // Style Prompt
            {
                displayName: 'Style Prompt',
                name: 'stylePrompt',
                type: 'string',
                typeOptions: {
                    rows: 4,
                },
                default: 'pop',
                description: 'Describe the style of audio that you want to generate',
            },
            
            // Lyrics
            {
                displayName: 'Include Lyrics',
                name: 'includeLyrics',
                type: 'boolean',
                default: false,
                description: 'Whether to include timestamped lyrics in the audio generation',
            },
            {
                displayName: 'Lyrics',
                name: 'lyrics',
                type: 'string',
                typeOptions: {
                    rows: 10,
                },
                default: '',
                description: 'The lyrics of the audio with timestamps (e.g., [00:10.00] First line [00:17.00] Second line)',
                placeholder: '[00:10.00] Drifting through the Milky Way\'s glow, stars hum low and bright\n[00:17.00] Every shadow hides a cosmos, burning without light',
                displayOptions: {
                    show: {
                        includeLyrics: [true],
                    },
                },
            },
            {
                displayName: 'Lyrics Format',
                name: 'lyricsFormat',
                type: 'notice',
                default: 'Lyrics should be formatted with timestamps like: [00:10.00] First line [00:17.00] Second line',
                displayOptions: {
                    show: {
                        includeLyrics: [true],
                    },
                },
            },
            
            // Reference Audio
            {
                displayName: 'Include Reference Audio',
                name: 'includeReferenceAudio',
                type: 'boolean',
                default: false,
                description: 'Whether to include a reference audio for style',
            },
            {
                displayName: 'Reference Audio Input Method',
                name: 'referenceAudioInputMethod',
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
                description: 'Method to input the reference audio data',
                displayOptions: {
                    show: {
                        includeReferenceAudio: [true],
                    },
                },
            },
            {
                displayName: 'Reference Audio Binary Property',
                name: 'referenceAudioBinaryPropertyName',
                type: 'string',
                default: 'data',
                required: true,
                displayOptions: {
                    show: {
                        includeReferenceAudio: [true],
                        referenceAudioInputMethod: ['binaryData'],
                    },
                },
                description: 'Name of the binary property containing the reference audio data',
            },
            {
                displayName: 'Reference Audio URL',
                name: 'referenceAudioUrl',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        includeReferenceAudio: [true],
                        referenceAudioInputMethod: ['url'],
                    },
                },
                description: 'URL of the reference audio for style',
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
                default: 60,
                description: 'Maximum number of retries to check task status (audio generation may take longer)',
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
                const taskType = this.getNodeParameter('taskType', i) as string;
                const stylePrompt = this.getNodeParameter('stylePrompt', i) as string;
                const includeLyrics = this.getNodeParameter('includeLyrics', i, false) as boolean;
                const includeReferenceAudio = this.getNodeParameter('includeReferenceAudio', i, false) as boolean;
                const waitForCompletion = this.getNodeParameter('waitForCompletion', i, false) as boolean;
                
                // Prepare request parameters
                const requestBody: DiffRhythmAudioParams = {
                    model: 'Qubico/diffrhythm',
                    task_type: taskType,
                    input: {
                        style_prompt: stylePrompt,
                    },
                    config: {},
                };
                
                // Add lyrics if included
                if (includeLyrics) {
                    const lyrics = this.getNodeParameter('lyrics', i, '') as string;
                    if (lyrics) {
                        requestBody.input.lyrics = lyrics;
                    }
                }
                
                // Add reference audio if included
                if (includeReferenceAudio) {
                    const referenceAudioInputMethod = this.getNodeParameter('referenceAudioInputMethod', i) as string;
                    
                    if (referenceAudioInputMethod === 'url') {
                        const referenceAudioUrl = this.getNodeParameter('referenceAudioUrl', i) as string;
                        requestBody.input.style_audio = referenceAudioUrl;
                    } else {
                        // Binary data method
                        const referenceAudioBinaryPropertyName = this.getNodeParameter('referenceAudioBinaryPropertyName', i) as string;
                        const referenceAudioBinaryData = this.helpers.assertBinaryData(i, referenceAudioBinaryPropertyName);
                        
                        if (referenceAudioBinaryData.mimeType && !referenceAudioBinaryData.mimeType.includes('audio')) {
                            throw new NodeOperationError(
                                this.getNode(),
                                'The provided binary data is not an audio file',
                                { itemIndex: i },
                            );
                        }
                        
                        // Convert binary data to base64
                        const base64String = Buffer.from(await this.helpers.getBinaryDataBuffer(i, referenceAudioBinaryPropertyName)).toString('base64');
                        requestBody.input.style_audio = `data:${referenceAudioBinaryData.mimeType};base64,${base64String}`;
                    }
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
                    const maxRetries = this.getNodeParameter('maxRetries', i, 60) as number;
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
