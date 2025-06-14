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
import { TTSParams } from '../shared/Interfaces';

export class TextToSpeech implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'PiAPI Text to Speech',
        name: 'textToSpeech',
        icon: 'file:../piapi.svg',
        group: ['transform'],
        version: 1,
        description: 'Generate speech audio from text using PiAPI TTS',
        defaults: {
            name: 'Text to Speech',
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
            // Text to convert to speech
            {
                displayName: 'Text',
                name: 'text',
                type: 'string',
                typeOptions: {
                    rows: 4,
                },
                default: '',
                required: true,
                description: 'Text to be converted to speech',
            },
            
            // Reference Audio
            {
                displayName: 'Reference Audio Input Method',
                name: 'refAudioInputMethod',
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
            },
            {
                displayName: 'Reference Audio Binary Property',
                name: 'refAudioBinaryPropertyName',
                type: 'string',
                default: 'data',
                required: true,
                displayOptions: {
                    show: {
                        refAudioInputMethod: ['binaryData'],
                    },
                },
                description: 'Name of the binary property containing the reference audio data',
            },
            {
                displayName: 'Reference Audio URL',
                name: 'refAudioUrl',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        refAudioInputMethod: ['url'],
                    },
                },
                description: 'URL of the reference audio for voice cloning',
            },
            
            // Reference Text (optional)
            {
                displayName: 'Include Reference Text',
                name: 'includeRefText',
                type: 'boolean',
                default: false,
                description: 'Whether to include text corresponding to the reference audio',
            },
            {
                displayName: 'Reference Text',
                name: 'refText',
                type: 'string',
                typeOptions: {
                    rows: 2,
                },
                default: '',
                displayOptions: {
                    show: {
                        includeRefText: [true],
                    },
                },
                description: 'Text corresponding to the reference audio (can improve voice cloning quality)',
            },
            
            // Wait for completion
            {
                displayName: 'Wait For Completion',
                name: 'waitForCompletion',
                type: 'boolean',
                default: false,
                description: 'Whether to wait for the speech generation process to complete before continuing',
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
                const text = this.getNodeParameter('text', i) as string;
                const refAudioInputMethod = this.getNodeParameter('refAudioInputMethod', i) as string;
                const includeRefText = this.getNodeParameter('includeRefText', i, false) as boolean;
                const waitForCompletion = this.getNodeParameter('waitForCompletion', i, false) as boolean;
                
                // Process reference audio based on input method
                let refAudioData: string;
                
                if (refAudioInputMethod === 'url') {
                    refAudioData = this.getNodeParameter('refAudioUrl', i) as string;
                } else {
                    // Binary data method
                    const refAudioBinaryPropertyName = this.getNodeParameter('refAudioBinaryPropertyName', i) as string;
                    const refAudioBinaryData = this.helpers.assertBinaryData(i, refAudioBinaryPropertyName);
                    
                    if (refAudioBinaryData.mimeType && !refAudioBinaryData.mimeType.includes('audio')) {
                        throw new NodeOperationError(
                            this.getNode(),
                            'The provided binary data is not an audio file',
                            { itemIndex: i },
                        );
                    }
                    
                    // Convert binary data to base64
                    const base64String = Buffer.from(await this.helpers.getBinaryDataBuffer(i, refAudioBinaryPropertyName)).toString('base64');
                    refAudioData = `data:${refAudioBinaryData.mimeType};base64,${base64String}`;
                }
                
                // Prepare request parameters
                const requestBody: TTSParams = {
                    model: 'Qubico/tts',
                    task_type: 'zero-shot',
                    input: {
                        gen_text: text,
                        ref_audio: refAudioData,
                    },
                    config: {
                        service_mode: 'public',
                    },
                };
                
                // Add reference text if provided
                if (includeRefText) {
                    const refText = this.getNodeParameter('refText', i, '') as string;
                    if (refText) {
                        requestBody.input.ref_text = refText;
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
