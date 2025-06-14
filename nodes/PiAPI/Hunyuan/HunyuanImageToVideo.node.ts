import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeConnectionType,
} from 'n8n-workflow';

import { piApiRequest, waitForTaskCompletion } from '../shared/GenericFunctions';

export class HunyuanImageToVideo implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'PiAPI Hunyuan Image to Video',
        name: 'hunyuanImageToVideo',
        icon: 'file:../piapi.svg',
        group: ['transform'],
        version: 1,
        description: 'Generate videos from images using PiAPI Hunyuan',
        defaults: {
            name: 'Hunyuan Image to Video',
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
                displayName: 'Task Type',
                name: 'taskType',
                type: 'options',
                options: [
                    {
                        name: 'Image to Video Concat',
                        value: 'img2video-concat',
                        description: 'Generate videos based on images for better movement (20 steps, 85 FPS)',
                    },
                    {
                        name: 'Image to Video Replace',
                        value: 'img2video-replace',
                        description: 'Generate videos following the guiding image better (20 steps, 85 FPS)',
                    },
                ],
                default: 'img2video-concat',
                description: 'Type of image-to-video transformation',
            },
            {
                displayName: 'Prompt',
                name: 'prompt',
                type: 'string',
                typeOptions: {
                    rows: 4,
                },
                default: '',
                required: true,
                description: 'Text prompt to guide the video generation',
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
                        name: '16:9',
                        value: '16:9',
                        description: 'Landscape (544x960)',
                    },
                    {
                        name: '9:16',
                        value: '9:16',
                        description: 'Portrait (960x544)',
                    },
                    {
                        name: '1:1',
                        value: '1:1',
                        description: 'Square (720x720)',
                    },
                ],
                default: '16:9',
                description: 'Aspect ratio of the generated video',
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
            const taskType = this.getNodeParameter('taskType', i) as string;
            const prompt = this.getNodeParameter('prompt', i) as string;
            const imageSource = this.getNodeParameter('imageSource', i) as string;
            const aspectRatio = this.getNodeParameter('aspectRatio', i) as string;
            const waitForCompletion = this.getNodeParameter('waitForCompletion', i, true) as boolean;

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
                model: 'Qubico/hunyuan',
                task_type: taskType,
                input: {
                    prompt,
                    image: imageBase64,
                    aspect_ratio: aspectRatio,
                },
                config: {
                    webhook_config: {
                        endpoint: '',
                        secret: '',
                    },
                },
            };

            try {
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
