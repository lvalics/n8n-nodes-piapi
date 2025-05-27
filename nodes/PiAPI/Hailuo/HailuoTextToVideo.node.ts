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
                        description: 'Standard text-to-video model',
                    },
                    {
                        name: 'Text to Video Director (t2v-01-director)',
                        value: 't2v-01-director',
                        description: 'Text-to-video with camera movement control. Use [Pan left], [Push in], etc. in your prompt',
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
