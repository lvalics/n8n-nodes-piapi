import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeConnectionType,
} from 'n8n-workflow';

import { piApiRequest, waitForTaskCompletion } from '../shared/GenericFunctions';

export class KlingEffects implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'PiAPI Kling Effects',
        name: 'klingEffects',
        icon: 'file:../piapi.svg',
        group: ['transform'],
        version: 1,
        description: 'Generate videos with special effects using PiAPI Kling',
        defaults: {
            name: 'Kling Effects',
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
            {
                displayName: 'Image Source',
                name: 'imageSource',
                type: 'options',
                options: [
                    {
                        name: 'URL',
                        value: 'url',
                        description: 'Load image from URL',
                    },
                    {
                        name: 'Binary Data',
                        value: 'binaryData',
                        description: 'Use image from binary field',
                    },
                ],
                default: 'url',
                description: 'Where to get the image from',
            },
            {
                displayName: 'Image URL',
                name: 'imageUrl',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        imageSource: ['url'],
                    },
                },
                description: 'URL of the image to apply effects to',
            },
            {
                displayName: 'Binary Property',
                name: 'binaryPropertyName',
                type: 'string',
                default: 'data',
                required: true,
                displayOptions: {
                    show: {
                        imageSource: ['binaryData'],
                    },
                },
                description: 'Name of the binary property containing the image',
            },
            {
                displayName: 'Effect',
                name: 'effect',
                type: 'options',
                options: [
                    {
                        name: 'Squish',
                        value: 'squish',
                        description: 'Apply a squish effect to generate video',
                    },
                    {
                        name: 'Expansion',
                        value: 'expansion',
                        description: 'Apply an expansion effect to generate video',
                    },
                ],
                default: 'squish',
                description: 'Type of effect to apply',
            },
            {
                displayName: 'Wait for Completion',
                name: 'waitForCompletion',
                type: 'boolean',
                default: false,
                description: 'Whether to wait for the task to complete before returning',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];

        for (let i = 0; i < items.length; i++) {
            try {
                const imageSource = this.getNodeParameter('imageSource', i) as string;
                const effect = this.getNodeParameter('effect', i) as string;
                const waitForCompletion = this.getNodeParameter('waitForCompletion', i, false) as boolean;

                let imageUrl = '';

                // Get the image
                if (imageSource === 'url') {
                    imageUrl = this.getNodeParameter('imageUrl', i) as string;
                    
                    // Validate URL
                    try {
                        new URL(imageUrl);
                    } catch (error) {
                        throw new Error(`Invalid image URL: ${error.message}`);
                    }
                } else if (imageSource === 'binaryData') {
                    const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
                    const binaryItem = items[i].binary?.[binaryPropertyName];
                    if (!binaryItem) {
                        throw new Error(`No binary data found in property ${binaryPropertyName}`);
                    }
                    
                    const binaryData = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
                    if (!binaryData) {
                        throw new Error(`No binary data found in property ${binaryPropertyName}`);
                    }
                    
                    const binaryMimeType = binaryItem.mimeType || 'image/png';
                    imageUrl = `data:${binaryMimeType};base64,${binaryData.toString('base64')}`;
                }

                // Construct request body
                const body = {
                    model: 'kling',
                    task_type: 'effects',
                    input: {
                        image_url: imageUrl,
                        effect,
                    },
                    config: {
                        webhook_config: {
                            endpoint: '',
                            secret: '',
                        },
                    },
                };

                // Initialize task
                const response = await piApiRequest.call(this, 'POST', '/api/v1/task', body);

                if (response.code !== 200) {
                    throw new Error(`API Error: ${response.message}`);
                }

                const taskId = response.data.task_id;
                let taskData = response.data;

                // If waitForCompletion is true, poll until the task is complete
                if (waitForCompletion) {
                    taskData = await waitForTaskCompletion.call(this, taskId);
                }

                returnData.push({
                    json: taskData,
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
