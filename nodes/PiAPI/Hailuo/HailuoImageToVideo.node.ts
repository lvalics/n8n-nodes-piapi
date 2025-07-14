import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeConnectionType,
} from 'n8n-workflow';

import { piApiRequest, waitForTaskCompletion } from '../shared/GenericFunctions';
import { HailuoImageToVideoParams } from '../shared/Interfaces';

export class HailuoImageToVideo implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Hailuo Image to Video',
        name: 'hailuoImageToVideo',
        icon: 'file:../piapi.svg',
        group: ['transform'],
        version: 1,
        description: 'Generate video from image using Hailuo API',
        defaults: {
            name: 'Hailuo Image to Video',
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
                displayName: 'Image URL',
                name: 'imageUrl',
                type: 'string',
                default: '',
                required: true,
                description: 'URL of input image (JPG/PNG, 300-4096px, aspect ratio 2:5 to 5:2, max 10MB)',
            },
            {
                displayName: 'Model',
                name: 'model',
                type: 'options',
                options: [
                    {
                        name: 'Image to Video (i2v-01)',
                        value: 'i2v-01',
                        description: 'Standard image-to-video model',
                    },
                    {
                        name: 'Image to Video Live (i2v-01-live)',
                        value: 'i2v-01-live',
                        description: 'Image-to-video model with more natural movements',
                    },
                    {
                        name: 'Image to Video Director (i2v-01-director)',
                        value: 'i2v-01-director',
                        description: 'Image-to-video with camera movement control. Use [Pan left], [Push in], etc. in your prompt',
                    },
                    {
                        name: 'Image to Video v2 (i2v-02)',
                        value: 'i2v-02',
                        description: 'Advanced image-to-video model with duration and resolution options ($0.25-$0.80)',
                    },
                ],
                default: 'i2v-01',
                description: 'The model to use for image-to-video generation',
            },
            {
                displayName: 'Text Prompt',
                name: 'prompt',
                type: 'string',
                typeOptions: {
                    rows: 4,
                },
                default: '',
                displayOptions: {
                    show: {
                        model: ['i2v-01-director'],
                    },
                },
                required: true,
                description: 'Text prompt for video generation with camera instructions (max 2000 characters)',
            },
            {
                displayName: 'Text Prompt',
                name: 'prompt',
                type: 'string',
                typeOptions: {
                    rows: 4,
                },
                default: '',
                displayOptions: {
                    hide: {
                        model: ['i2v-01-director'],
                    },
                },
                required: false,
                description: 'Optional text prompt to guide video generation (max 2000 characters)',
            },
            {
                displayName: 'Expand Prompt',
                name: 'expandPrompt',
                type: 'boolean',
                default: false,
                description: 'Whether to expand the input prompt to add details',
            },
            {
                displayName: 'Duration (seconds)',
                name: 'duration',
                type: 'options',
                displayOptions: {
                    show: {
                        model: ['i2v-02'],
                    },
                },
                options: [
                    {
                        name: '6 seconds',
                        value: 6,
                        description: 'Generate a 6-second video',
                    },
                    {
                        name: '10 seconds',
                        value: 10,
                        description: 'Generate a 10-second video (not available with 1080p)',
                    },
                ],
                default: 6,
                description: 'Duration of the generated video',
            },
            {
                displayName: 'Resolution',
                name: 'resolution',
                type: 'options',
                displayOptions: {
                    show: {
                        model: ['i2v-02'],
                    },
                },
                options: [
                    {
                        name: '768p',
                        value: 768,
                        description: 'Generate video at 768p resolution',
                    },
                    {
                        name: '1080p',
                        value: 1080,
                        description: 'Generate video at 1080p resolution (not available with 10s duration)',
                    },
                ],
                default: 768,
                description: 'Resolution of the generated video',
            },
            {
                displayName: 'Wait for Completion',
                name: 'waitForCompletion',
                type: 'boolean',
                default: false,
                description: 'Whether to wait for the video generation to complete',
            },
            {
                displayName: 'Maximum Retries',
                name: 'maxRetries',
                type: 'number',
                displayOptions: {
                    show: {
                        waitForCompletion: [true],
                    },
                },
                default: 20,
                description: 'Maximum number of times to check task status',
            },
            {
                displayName: 'Retry Interval (ms)',
                name: 'retryInterval',
                type: 'number',
                displayOptions: {
                    show: {
                        waitForCompletion: [true],
                    },
                },
                default: 3000,
                description: 'Time to wait between status checks in milliseconds',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];

        for (let i = 0; i < items.length; i++) {
            try {
                // Get parameters
                const imageUrl = this.getNodeParameter('imageUrl', i) as string;
                const model = this.getNodeParameter('model', i) as string;
                const prompt = this.getNodeParameter('prompt', i, '') as string;
                const expandPrompt = this.getNodeParameter('expandPrompt', i, false) as boolean;
                const waitForCompletion = this.getNodeParameter('waitForCompletion', i, true) as boolean;
                const maxRetries = waitForCompletion ? this.getNodeParameter('maxRetries', i, 20) as number : 0;
                const retryInterval = waitForCompletion ? this.getNodeParameter('retryInterval', i, 3000) as number : 0;

                // Set up API parameters
                const parameters: HailuoImageToVideoParams = {
                    image_url: imageUrl,
                    model,
                };

                // Add optional parameters if provided
                if (prompt) {
                    parameters.prompt = prompt;
                }

                if (expandPrompt) {
                    parameters.expand_prompt = expandPrompt;
                }

                // Add duration and resolution for i2v-02 model
                if (model === 'i2v-02') {
                    const duration = this.getNodeParameter('duration', i) as number;
                    const resolution = this.getNodeParameter('resolution', i) as number;
                    
                    // Validate that 1080p+10s combination is not selected
                    if (resolution === 1080 && duration === 10) {
                        throw new Error('1080p resolution with 10 seconds duration is not supported. Please choose either 768p resolution or 6 seconds duration.');
                    }
                    
                    parameters.duration = duration;
                    parameters.resolution = resolution;
                }

                // Make API request
                const response = await piApiRequest.call(
                    this,
                    'POST',
                    '/api/v1/task',
                    {
                        model: 'hailuo',
                        task_type: 'video_generation',
                        input: parameters,
                        config: {
                            service_mode: 'public',
                        },
                    },
                );

                if (waitForCompletion) {
                    // Wait for task to complete
                    const taskId = response.data.task_id;
                    const taskData = await waitForTaskCompletion.call(
                        this,
                        taskId,
                        maxRetries,
                        retryInterval,
                    );
                    returnData.push({
                        json: taskData,
                    });
                } else {
                    // Return immediately with task ID
                    returnData.push({
                        json: response.data,
                    });
                }
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
