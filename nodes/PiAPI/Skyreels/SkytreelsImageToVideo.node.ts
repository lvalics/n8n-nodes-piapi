import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeConnectionType,
} from 'n8n-workflow';

import { piApiRequest, waitForTaskCompletion } from '../shared/GenericFunctions';

export class SkytreelsImageToVideo implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'PiAPI Skyreels Image to Video',
        name: 'skyreelsImageToVideo',
        icon: 'file:../piapi.svg',
        group: ['transform'],
        version: 1,
        description: 'Generate videos from images using PiAPI Skyreels',
        defaults: {
            name: 'Skyreels Image to Video',
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
                displayName: 'Prompt',
                name: 'prompt',
                type: 'string',
                typeOptions: {
                    rows: 4,
                },
                default: 'FPS-24, ',
                required: true,
                description: 'Text prompt to guide video generation. Include "FPS-24" for optimal frame rate.',
                placeholder: 'FPS-24, video of a young woman with long hair. She is wearing a light gray t-shirt.',
            },
            {
                displayName: 'Negative Prompt',
                name: 'negativePrompt',
                type: 'string',
                typeOptions: {
                    rows: 4,
                },
                default: '',
                required: false,
                description: 'Elements to avoid in the generated video',
                placeholder: 'chaotic, distortion, morphing',
            },
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
                displayName: 'Aspect Ratio',
                name: 'aspectRatio',
                type: 'options',
                options: [
                    {
                        name: 'Landscape (16:9)',
                        value: '16:9',
                        description: 'Landscape format, optimal for desktop viewing',
                    },
                    {
                        name: 'Portrait (9:16)',
                        value: '9:16',
                        description: 'Portrait format, optimal for mobile devices',
                    },
                    {
                        name: 'Square (1:1)',
                        value: '1:1',
                        description: 'Square format, works well on most platforms',
                    },
                ],
                default: '16:9',
                description: 'Aspect ratio of the generated video',
            },
            {
                displayName: 'Guidance Scale',
                name: 'guidanceScale',
                type: 'number',
                typeOptions: {
                    minValue: 0.1,
                    maxValue: 10,
                    numberPrecision: 1,
                },
                default: 3.5,
                description: 'Controls how closely the video adheres to the prompt (0.1-10, lower = more creative, higher = more accurate)',
            },
            {
                displayName: 'Wait for Completion',
                name: 'waitForCompletion',
                type: 'boolean',
                default: false,
                description: 'Whether to wait for the task to complete before returning',
            },
            {
                displayName: 'Image Requirements Notice',
                name: 'notice',
                type: 'notice',
                default: 'For best results: provide clear images with good lighting and minimal background distractions. Faces and human subjects generally produce the best results.',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];

        for (let i = 0; i < items.length; i++) {
            try {
                const prompt = this.getNodeParameter('prompt', i) as string;
                const negativePrompt = this.getNodeParameter('negativePrompt', i, '') as string;
                const imageSource = this.getNodeParameter('imageSource', i) as string;
                const aspectRatio = this.getNodeParameter('aspectRatio', i) as string;
                const guidanceScale = this.getNodeParameter('guidanceScale', i) as number;
                const waitForCompletion = this.getNodeParameter('waitForCompletion', i, false) as boolean;

                let imageBase64: string = '';

                // Get the image based on source
                if (imageSource === 'url') {
                    const imageUrl = this.getNodeParameter('imageUrl', i) as string;
                    
                    // Validate URL
                    try {
                        new URL(imageUrl);
                        
                        // Download the image and convert to base64
                        try {
                            const imageResponse = await this.helpers.request({
                                method: 'GET',
                                url: imageUrl,
                                encoding: null,
                                resolveWithFullResponse: true,
                            });
                            
                            const buffer = Buffer.from(imageResponse.body as Buffer);
                            const contentType = imageResponse.headers['content-type'] || 'image/png';
                            imageBase64 = `data:${contentType};base64,${buffer.toString('base64')}`;
                        } catch (error) {
                            throw new Error(`Failed to download image from URL: ${error.message}`);
                        }
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
                    imageBase64 = `data:${binaryMimeType};base64,${binaryData.toString('base64')}`;
                }

                // Construct request body
                const body = {
                    model: 'Qubico/skyreels',
                    task_type: 'img2video',
                    input: {
                        prompt,
                        negative_prompt: negativePrompt,
                        image: imageBase64,
                        aspect_ratio: aspectRatio,
                        guidance_scale: guidanceScale,
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
