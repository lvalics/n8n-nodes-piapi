import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeConnectionType,
} from 'n8n-workflow';

import { piApiRequest, waitForTaskCompletion } from '../shared/GenericFunctions';

export class HunyuanTextToVideo implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'PiAPI Hunyuan Text to Video',
        name: 'hunyuanTextToVideo',
        icon: 'file:../piapi.svg',
        group: ['transform'],
        version: 1,
        description: 'Generate videos from text prompts using PiAPI Hunyuan',
        defaults: {
            name: 'Hunyuan Text to Video',
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
                        name: 'Standard Text-to-Video',
                        value: 'txt2video',
                        description: 'Higher quality with more processing steps (20 steps, 85 FPS, 480x848/640x640)',
                    },
                    {
                        name: 'Fast Text-to-Video',
                        value: 'fast-txt2video',
                        description: 'Faster generation with fewer steps (6 steps, 85 FPS, 480x848/640x640)',
                    },
                ],
                default: 'txt2video',
                description: 'Type of video generation task',
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
                description: 'Text prompt for video generation',
            },
            {
                displayName: 'Aspect Ratio',
                name: 'aspectRatio',
                type: 'options',
                options: [
                    {
                        name: '16:9',
                        value: '16:9',
                        description: 'Landscape (480x848)',
                    },
                    {
                        name: '9:16',
                        value: '9:16',
                        description: 'Portrait (848x480)',
                    },
                    {
                        name: '1:1',
                        value: '1:1',
                        description: 'Square (640x640)',
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
            const aspectRatio = this.getNodeParameter('aspectRatio', i) as string;
            const waitForCompletion = this.getNodeParameter('waitForCompletion', i, true) as boolean;

            // Construct request body
            const body = {
                model: 'Qubico/hunyuan',
                task_type: taskType,
                input: {
                    prompt,
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
