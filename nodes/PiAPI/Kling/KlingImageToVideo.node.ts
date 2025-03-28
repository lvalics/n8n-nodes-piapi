import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeConnectionType,
} from 'n8n-workflow';

import { piApiRequest, waitForTaskCompletion } from '../shared/GenericFunctions';

export class KlingImageToVideo implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'PiAPI Kling Image to Video',
        name: 'klingImageToVideo',
        icon: 'file:../piapi.svg',
        group: ['transform'],
        version: 1,
        description: 'Generate videos from images using PiAPI Kling',
        defaults: {
            name: 'Kling Image to Video',
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
                description: 'URL of the image to transform into a video',
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
                displayName: 'End Frame Image Source',
                name: 'endFrameImageSource',
                type: 'options',
                options: [
                    {
                        name: 'None',
                        value: 'none',
                        description: 'Do not use an end frame image',
                    },
                    {
                        name: 'URL',
                        value: 'url',
                        description: 'Load end frame image from URL',
                    },
                    {
                        name: 'Binary Data',
                        value: 'binaryData',
                        description: 'Use end frame image from binary field',
                    },
                ],
                default: 'none',
                description: 'Whether to use an end frame image',
            },
            {
                displayName: 'End Frame Image URL',
                name: 'endFrameImageUrl',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        endFrameImageSource: ['url'],
                    },
                },
                description: 'URL of the end frame image',
            },
            {
                displayName: 'End Frame Binary Property',
                name: 'endFrameBinaryPropertyName',
                type: 'string',
                default: 'endFrame',
                required: true,
                displayOptions: {
                    show: {
                        endFrameImageSource: ['binaryData'],
                    },
                },
                description: 'Name of the binary property containing the end frame image',
            },
            {
                displayName: 'Prompt',
                name: 'prompt',
                type: 'string',
                typeOptions: {
                    rows: 4,
                },
                default: '',
                required: false,
                description: 'Text prompt to guide the video generation',
            },
            {
                displayName: 'Negative Prompt',
                name: 'negativePrompt',
                type: 'string',
                typeOptions: {
                    rows: 4,
                },
                default: '',
                description: 'Negative prompt to avoid certain elements in the video',
            },
            {
                displayName: 'Use Elements',
                name: 'useElements',
                type: 'boolean',
                default: false,
                description: 'Whether to use elements feature (V1.6 only)',
            },
            {
                displayName: 'Elements',
                name: 'elements',
                type: 'fixedCollection',
                typeOptions: {
                    multipleValues: true,
                    sortable: true,
                },
                default: {},
                displayOptions: {
                    show: {
                        useElements: [true],
                    },
                },
                options: [
                    {
                        name: 'elementsList',
                        displayName: 'Element',
                        values: [
                            {
                                displayName: 'Element Image URL',
                                name: 'elementImageUrl',
                                type: 'string',
                                default: '',
                                description: 'URL of the element image',
                            },
                        ],
                    },
                ],
                description: 'Elements to include in the video (1-4 images)',
            },
            {
                displayName: 'Duration',
                name: 'duration',
                type: 'options',
                options: [
                    {
                        name: '5 Seconds',
                        value: 5,
                    },
                    {
                        name: '10 Seconds',
                        value: 10,
                    },
                ],
                default: 5,
                description: 'Duration of the generated video',
            },
            {
                displayName: 'Aspect Ratio',
                name: 'aspectRatio',
                type: 'options',
                options: [
                    {
                        name: 'Landscape (16:9)',
                        value: '16:9',
                    },
                    {
                        name: 'Portrait (9:16)',
                        value: '9:16',
                    },
                    {
                        name: 'Square (1:1)',
                        value: '1:1',
                    },
                ],
                default: '16:9',
                description: 'Aspect ratio of the generated video',
            },
            {
                displayName: 'Mode',
                name: 'mode',
                type: 'options',
                options: [
                    {
                        name: 'Standard',
                        value: 'std',
                    },
                    {
                        name: 'Professional',
                        value: 'pro',
                    },
                ],
                default: 'std',
                description: 'Generation mode of the video',
            },
            {
                displayName: 'Version',
                name: 'version',
                type: 'options',
                options: [
                    {
                        name: 'V1.0',
                        value: '1.0',
                    },
                    {
                        name: 'V1.5',
                        value: '1.5',
                    },
                    {
                        name: 'V1.6',
                        value: '1.6',
                    },
                ],
                default: '1.6',
                description: 'Model version to use',
            },
            {
                displayName: 'CFG Scale',
                name: 'cfgScale',
                type: 'number',
                typeOptions: {
                    minValue: 0,
                    maxValue: 1,
                    numberPrecision: 2,
                },
                default: 0.5,
                description: 'How strongly the video adheres to the prompt (between 0-1, recommended: 0.5)',
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
                const endFrameImageSource = this.getNodeParameter('endFrameImageSource', i) as string;
                const prompt = this.getNodeParameter('prompt', i, '') as string;
                const negativePrompt = this.getNodeParameter('negativePrompt', i, '') as string;
                const duration = this.getNodeParameter('duration', i) as number;
                const aspectRatio = this.getNodeParameter('aspectRatio', i) as string;
                const mode = this.getNodeParameter('mode', i) as string;
                const version = this.getNodeParameter('version', i) as string;
                const cfgScale = this.getNodeParameter('cfgScale', i) as number;
                const useElements = this.getNodeParameter('useElements', i, false) as boolean;
                const waitForCompletion = this.getNodeParameter('waitForCompletion', i, false) as boolean;

                let imageUrl = '';
                let endFrameImageUrl = '';
                let elements: Array<{ image_url: string }> = [];

                // Get the main image
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
                    
                    // Add await here to properly resolve the Promise
                    const binaryData = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
                    if (!binaryData) {
                        throw new Error(`No binary data found in property ${binaryPropertyName}`);
                    }
                    
                    const binaryMimeType = binaryItem.mimeType || 'image/png';
                    imageUrl = `data:${binaryMimeType};base64,${binaryData.toString('base64')}`;
                }

                // Get the end frame image if needed
                if (endFrameImageSource === 'url') {
                    endFrameImageUrl = this.getNodeParameter('endFrameImageUrl', i) as string;
                    
                    // Validate URL
                    try {
                        new URL(endFrameImageUrl);
                    } catch (error) {
                        throw new Error(`Invalid end frame image URL: ${error.message}`);
                    }
                } else if (endFrameImageSource === 'binaryData') {
                    const endFrameBinaryPropertyName = this.getNodeParameter('endFrameBinaryPropertyName', i) as string;
                    const binaryItem = items[i].binary?.[endFrameBinaryPropertyName];
                    if (!binaryItem) {
                        throw new Error(`No binary data found in property ${endFrameBinaryPropertyName}`);
                    }
                    
                    const binaryData = await this.helpers.getBinaryDataBuffer(i, endFrameBinaryPropertyName);
                    if (!binaryData) {
                        throw new Error(`No binary data found in property ${endFrameBinaryPropertyName}`);
                    }
                    
                    const binaryMimeType = binaryItem.mimeType || 'image/png';
                    endFrameImageUrl = `data:${binaryMimeType};base64,${binaryData.toString('base64')}`;
                }

                // Get elements if useElements is true
                if (useElements) {
                    const elementsList = this.getNodeParameter('elements.elementsList', i, []) as Array<{
                        elementImageUrl: string;
                    }>;
                    
                    if (elementsList.length === 0) {
                        throw new Error('Elements feature requires at least one element image');
                    } else if (elementsList.length > 4) {
                        throw new Error('Elements feature supports a maximum of 4 element images');
                    }
                    
                    elements = elementsList.map(element => ({
                        image_url: element.elementImageUrl,
                    }));
                }

                // Construct request body
                const body: any = {
                    model: 'kling',
                    task_type: 'video_generation',
                    input: {
                        prompt,
                        negative_prompt: negativePrompt,
                        duration,
                        aspect_ratio: aspectRatio,
                        mode,
                        version,
                        cfg_scale: cfgScale,
                    },
                    config: {
                        webhook_config: {
                            endpoint: '',
                            secret: '',
                        },
                    },
                };

                // Add image_url if not using elements
                if (!useElements) {
                    body.input.image_url = imageUrl;
                    
                    // Add image_tail_url if end frame is specified
                    if (endFrameImageSource !== 'none' && endFrameImageUrl) {
                        body.input.image_tail_url = endFrameImageUrl;
                    }
                } else {
                    // If using elements, add them to the input
                    body.input.elements = elements;
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
