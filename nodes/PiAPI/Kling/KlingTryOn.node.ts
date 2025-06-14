import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeConnectionType,
} from 'n8n-workflow';

import { piApiRequest, waitForTaskCompletion } from '../shared/GenericFunctions';

export class KlingTryOn implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'PiAPI Kling Virtual Try On',
        name: 'klingTryOn',
        icon: 'file:../piapi.svg',
        group: ['transform'],
        version: 1,
        description: 'Generate virtual clothing try-on images using PiAPI Kling ($0.07 per image)',
        defaults: {
            name: 'Kling Virtual Try On',
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
                displayName: 'Model Image Source',
                name: 'modelImageSource',
                type: 'options',
                options: [
                    {
                        name: 'URL',
                        value: 'url',
                        description: 'Load model image from URL',
                    },
                    {
                        name: 'Binary Data',
                        value: 'binaryData',
                        description: 'Use model image from binary field',
                    },
                ],
                default: 'url',
                description: 'Source of the model (person) image',
            },
            {
                displayName: 'Model Image URL',
                name: 'modelImageUrl',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        modelImageSource: ['url'],
                    },
                },
                description: 'URL of the model (person) image',
            },
            {
                displayName: 'Model Binary Property',
                name: 'modelBinaryPropertyName',
                type: 'string',
                default: 'model',
                required: true,
                displayOptions: {
                    show: {
                        modelImageSource: ['binaryData'],
                    },
                },
                description: 'Name of the binary property containing the model image',
            },
            {
                displayName: 'Garment Type',
                name: 'garmentType',
                type: 'options',
                options: [
                    {
                        name: 'Full Dress',
                        value: 'dress',
                        description: 'Full-body garment',
                    },
                    {
                        name: 'Upper and Lower Separately',
                        value: 'upperLower',
                        description: 'Upper and lower body garments separately',
                    },
                ],
                default: 'dress',
                description: 'Type of garment to try on',
            },
            {
                displayName: 'Dress Image Source',
                name: 'dressImageSource',
                type: 'options',
                options: [
                    {
                        name: 'URL',
                        value: 'url',
                        description: 'Load dress image from URL',
                    },
                    {
                        name: 'Binary Data',
                        value: 'binaryData',
                        description: 'Use dress image from binary field',
                    },
                ],
                default: 'url',
                displayOptions: {
                    show: {
                        garmentType: ['dress'],
                    },
                },
                description: 'Source of the dress image',
            },
            {
                displayName: 'Dress Image URL',
                name: 'dressImageUrl',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        garmentType: ['dress'],
                        dressImageSource: ['url'],
                    },
                },
                description: 'URL of the full-body garment image',
            },
            {
                displayName: 'Dress Binary Property',
                name: 'dressBinaryPropertyName',
                type: 'string',
                default: 'dress',
                required: true,
                displayOptions: {
                    show: {
                        garmentType: ['dress'],
                        dressImageSource: ['binaryData'],
                    },
                },
                description: 'Name of the binary property containing the dress image',
            },
            {
                displayName: 'Upper Garment Image Source',
                name: 'upperImageSource',
                type: 'options',
                options: [
                    {
                        name: 'URL',
                        value: 'url',
                        description: 'Load upper garment image from URL',
                    },
                    {
                        name: 'Binary Data',
                        value: 'binaryData',
                        description: 'Use upper garment image from binary field',
                    },
                ],
                default: 'url',
                displayOptions: {
                    show: {
                        garmentType: ['upperLower'],
                    },
                },
                description: 'Source of the upper garment image',
            },
            {
                displayName: 'Upper Garment Image URL',
                name: 'upperImageUrl',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        garmentType: ['upperLower'],
                        upperImageSource: ['url'],
                    },
                },
                description: 'URL of the upper-body garment image',
            },
            {
                displayName: 'Upper Garment Binary Property',
                name: 'upperBinaryPropertyName',
                type: 'string',
                default: 'upper',
                required: true,
                displayOptions: {
                    show: {
                        garmentType: ['upperLower'],
                        upperImageSource: ['binaryData'],
                    },
                },
                description: 'Name of the binary property containing the upper garment image',
            },
            {
                displayName: 'Lower Garment Image Source',
                name: 'lowerImageSource',
                type: 'options',
                options: [
                    {
                        name: 'URL',
                        value: 'url',
                        description: 'Load lower garment image from URL',
                    },
                    {
                        name: 'Binary Data',
                        value: 'binaryData',
                        description: 'Use lower garment image from binary field',
                    },
                ],
                default: 'url',
                displayOptions: {
                    show: {
                        garmentType: ['upperLower'],
                    },
                },
                description: 'Source of the lower garment image',
            },
            {
                displayName: 'Lower Garment Image URL',
                name: 'lowerImageUrl',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        garmentType: ['upperLower'],
                        lowerImageSource: ['url'],
                    },
                },
                description: 'URL of the lower-body garment image',
            },
            {
                displayName: 'Lower Garment Binary Property',
                name: 'lowerBinaryPropertyName',
                type: 'string',
                default: 'lower',
                required: true,
                displayOptions: {
                    show: {
                        garmentType: ['upperLower'],
                        lowerImageSource: ['binaryData'],
                    },
                },
                description: 'Name of the binary property containing the lower garment image',
            },
            {
                displayName: 'Batch Size',
                name: 'batchSize',
                type: 'number',
                typeOptions: {
                    minValue: 1,
                    maxValue: 4,
                },
                default: 1,
                description: 'Number of variations to generate (1-4)',
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
                const modelImageSource = this.getNodeParameter('modelImageSource', i) as string;
                const garmentType = this.getNodeParameter('garmentType', i) as string;
                const batchSize = this.getNodeParameter('batchSize', i, 1) as number;
                const waitForCompletion = this.getNodeParameter('waitForCompletion', i, false) as boolean;

                let modelImageUrl = '';
                let dressImageUrl = '';
                let upperImageUrl = '';
                let lowerImageUrl = '';

                // Get model image URL
                if (modelImageSource === 'url') {
                    modelImageUrl = this.getNodeParameter('modelImageUrl', i) as string;
                    
                    // Validate URL
                    try {
                        new URL(modelImageUrl);
                    } catch (error) {
                        throw new Error(`Invalid model image URL: ${error.message}`);
                    }
                } else if (modelImageSource === 'binaryData') {
                    const modelBinaryPropertyName = this.getNodeParameter('modelBinaryPropertyName', i) as string;
                    const binaryItem = items[i].binary?.[modelBinaryPropertyName];
                    if (!binaryItem) {
                        throw new Error(`No binary data found in property ${modelBinaryPropertyName}`);
                    }
                    
                    const binaryData = await this.helpers.getBinaryDataBuffer(i, modelBinaryPropertyName);
                    if (!binaryData) {
                        throw new Error(`No binary data found in property ${modelBinaryPropertyName}`);
                    }
                    
                    const binaryMimeType = binaryItem.mimeType || 'image/png';
                    modelImageUrl = `data:${binaryMimeType};base64,${binaryData.toString('base64')}`;
                }

                // Get garment images based on garment type
                if (garmentType === 'dress') {
                    const dressImageSource = this.getNodeParameter('dressImageSource', i) as string;
                    
                    if (dressImageSource === 'url') {
                        dressImageUrl = this.getNodeParameter('dressImageUrl', i) as string;
                        
                        // Validate URL
                        try {
                            new URL(dressImageUrl);
                        } catch (error) {
                            throw new Error(`Invalid dress image URL: ${error.message}`);
                        }
                    } else if (dressImageSource === 'binaryData') {
                        const dressBinaryPropertyName = this.getNodeParameter('dressBinaryPropertyName', i) as string;
                        const binaryItem = items[i].binary?.[dressBinaryPropertyName];
                        if (!binaryItem) {
                            throw new Error(`No binary data found in property ${dressBinaryPropertyName}`);
                        }
                        
                        const binaryData = await this.helpers.getBinaryDataBuffer(i, dressBinaryPropertyName);
                        if (!binaryData) {
                            throw new Error(`No binary data found in property ${dressBinaryPropertyName}`);
                        }
                        
                        const binaryMimeType = binaryItem.mimeType || 'image/png';
                        dressImageUrl = `data:${binaryMimeType};base64,${binaryData.toString('base64')}`;
                    }
                } else if (garmentType === 'upperLower') {
                    // Get upper garment image
                    const upperImageSource = this.getNodeParameter('upperImageSource', i) as string;
                    
                    if (upperImageSource === 'url') {
                        upperImageUrl = this.getNodeParameter('upperImageUrl', i) as string;
                        
                        // Validate URL
                        try {
                            new URL(upperImageUrl);
                        } catch (error) {
                            throw new Error(`Invalid upper garment image URL: ${error.message}`);
                        }
                    } else if (upperImageSource === 'binaryData') {
                        const upperBinaryPropertyName = this.getNodeParameter('upperBinaryPropertyName', i) as string;
                        const binaryItem = items[i].binary?.[upperBinaryPropertyName];
                        if (!binaryItem) {
                            throw new Error(`No binary data found in property ${upperBinaryPropertyName}`);
                        }
                        
                        const binaryData = await this.helpers.getBinaryDataBuffer(i, upperBinaryPropertyName);
                        if (!binaryData) {
                            throw new Error(`No binary data found in property ${upperBinaryPropertyName}`);
                        }
                        
                        const binaryMimeType = binaryItem.mimeType || 'image/png';
                        upperImageUrl = `data:${binaryMimeType};base64,${binaryData.toString('base64')}`;
                    }
                    
                    // Get lower garment image
                    const lowerImageSource = this.getNodeParameter('lowerImageSource', i) as string;
                    
                    if (lowerImageSource === 'url') {
                        lowerImageUrl = this.getNodeParameter('lowerImageUrl', i) as string;
                        
                        // Validate URL
                        try {
                            new URL(lowerImageUrl);
                        } catch (error) {
                            throw new Error(`Invalid lower garment image URL: ${error.message}`);
                        }
                    } else if (lowerImageSource === 'binaryData') {
                        const lowerBinaryPropertyName = this.getNodeParameter('lowerBinaryPropertyName', i) as string;
                        const binaryItem = items[i].binary?.[lowerBinaryPropertyName];
                        if (!binaryItem) {
                            throw new Error(`No binary data found in property ${lowerBinaryPropertyName}`);
                        }
                        
                        const binaryData = await this.helpers.getBinaryDataBuffer(i, lowerBinaryPropertyName);
                        if (!binaryData) {
                            throw new Error(`No binary data found in property ${lowerBinaryPropertyName}`);
                        }
                        
                        const binaryMimeType = binaryItem.mimeType || 'image/png';
                        lowerImageUrl = `data:${binaryMimeType};base64,${binaryData.toString('base64')}`;
                    }
                }

                // Construct request body
                const body: any = {
                    model: 'kling',
                    task_type: 'ai_try_on',
                    input: {
                        model_input: modelImageUrl,
                        batch_size: batchSize,
                    },
                    config: {
                        webhook_config: {
                            endpoint: '',
                            secret: '',
                        },
                    },
                };

                // Add garment images based on garment type
                if (garmentType === 'dress') {
                    body.input.dress_input = dressImageUrl;
                } else if (garmentType === 'upperLower') {
                    body.input.upper_input = upperImageUrl;
                    body.input.lower_input = lowerImageUrl;
                }

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
