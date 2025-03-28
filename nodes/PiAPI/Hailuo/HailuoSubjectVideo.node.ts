import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeConnectionType,
} from 'n8n-workflow';

import { piApiRequest, waitForTaskCompletion } from '../shared/GenericFunctions';
import { HailuoSubjectVideoParams } from '../shared/Interfaces';

export class HailuoSubjectVideo implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Hailuo Subject Reference Video',
        name: 'hailuoSubjectVideo',
        icon: 'file:../piapi.svg',
        group: ['transform'],
        version: 1,
        description: 'Generate video from text and reference image of a person using Hailuo API',
        defaults: {
            name: 'Hailuo Subject Reference Video',
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
                displayName: 'Reference Image URL',
                name: 'imageUrl',
                type: 'string',
                default: '',
                required: true,
                description: 'URL of reference image with a human face (JPG/PNG, 300-4096px, aspect ratio 2:5 to 5:2, max 10MB)',
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
                const imageUrl = this.getNodeParameter('imageUrl', i) as string;
                const expandPrompt = this.getNodeParameter('expandPrompt', i, false) as boolean;
                const waitForCompletion = this.getNodeParameter('waitForCompletion', i, true) as boolean;
                const maxRetries = waitForCompletion ? this.getNodeParameter('maxRetries', i, 20) as number : 0;
                const retryInterval = waitForCompletion ? this.getNodeParameter('retryInterval', i, 3000) as number : 0;

                // Set up API parameters
                const parameters: HailuoSubjectVideoParams = {
                    prompt,
                    image_url: imageUrl,
                    model: 's2v-01',
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
