import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeConnectionType,
} from 'n8n-workflow';

import { piApiRequest, waitForTaskCompletion } from '../shared/GenericFunctions';

export class KlingTextToVideo implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'PiAPI Kling Text to Video',
        name: 'klingTextToVideo',
        icon: 'file:../piapi.svg',
        group: ['transform'],
        version: 1,
        description: 'Generate videos from text using PiAPI Kling',
        defaults: {
            name: 'Kling Text to Video',
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
                default: '',
                required: true,
                description: 'Text prompt for video generation',
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
                    {
                        name: 'V2.0 ($0.96 for 5s, $1.92 for 10s)',
                        value: '2.0',
                        description: 'Warning: Higher price',
                    },
										{
                        name: 'V2.1',
                        value: '2.1',
                    },
                    {
                        name: 'V2.1 Master',
                        value: '2.1-master',
                        description: 'Warning: Higher price',
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
            const prompt = this.getNodeParameter('prompt', i) as string;
            const negativePrompt = this.getNodeParameter('negativePrompt', i, '') as string;
            const duration = this.getNodeParameter('duration', i) as number;
            const aspectRatio = this.getNodeParameter('aspectRatio', i) as string;
            const mode = this.getNodeParameter('mode', i) as string;
            const version = this.getNodeParameter('version', i) as string;
            const cfgScale = this.getNodeParameter('cfgScale', i) as number;
            const waitForCompletion = this.getNodeParameter('waitForCompletion', i, false) as boolean;

            // Construct request body
            const body = {
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
