import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeConnectionType,
} from 'n8n-workflow';

import { piApiRequest, waitForTaskCompletion } from '../shared/GenericFunctions';
import { HailuoTextToVideoParams } from '../shared/Interfaces';

export class HailuoTextToVideo implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Hailuo Text to Video',
        name: 'hailuoTextToVideo',
        icon: 'file:../piapi.svg',
        group: ['transform'],
        version: 1,
        description: 'Generate video from text prompt using Hailuo API',
        defaults: {
            name: 'Hailuo Text to Video',
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
                displayName: 'Text Prompt',
                name: 'prompt',
                type: 'string',
                typeOptions: {
                    rows: 4,
                },
                default: '',
                required: true,
                description: 'Text prompt for video generation (max 2000 characters)',
            },
            {
                displayName: 'Model',
                name: 'model',
                type: 'options',
                options: [
                    {
                        name: 'Text to Video (t2v-01)',
                        value: 't2v-01',
                        description: 'Standard text-to-video model ($0.20)',
                    },
                    {
                        name: 'Text to Video Director (t2v-01-director)',
                        value: 't2v-01-director',
                        description: 'Text-to-video with camera movement control. Use [Pan left], [Push in], etc. in your prompt ($0.20)',
                    },
                    {
                        name: 'Text to Video v2 (t2v-02)',
                        value: 't2v-02',
                        description: 'Advanced text-to-video model with duration and resolution options ($0.25-$0.80)',
                    },
                ],
                default: 't2v-01',
                description: 'The model to use for text-to-video generation',
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
                        model: ['t2v-02'],
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
                        model: ['t2v-02'],
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
                const prompt = this.getNodeParameter('prompt', i) as string;
                const model = this.getNodeParameter('model', i) as string;
                const expandPrompt = this.getNodeParameter('expandPrompt', i, false) as boolean;
                const waitForCompletion = this.getNodeParameter('waitForCompletion', i, true) as boolean;
                const maxRetries = waitForCompletion ? this.getNodeParameter('maxRetries', i, 20) as number : 0;
                const retryInterval = waitForCompletion ? this.getNodeParameter('retryInterval', i, 3000) as number : 0;

                // Set up API parameters
                const parameters: HailuoTextToVideoParams = {
                    prompt,
                    model,
                    expand_prompt: expandPrompt,
                };

                // Add duration and resolution for t2v-02 model
                if (model === 't2v-02') {
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
