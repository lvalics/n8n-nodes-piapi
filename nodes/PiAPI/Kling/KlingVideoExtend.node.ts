import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeConnectionType,
} from 'n8n-workflow';

import { piApiRequest, waitForTaskCompletion } from '../shared/GenericFunctions';

export class KlingVideoExtend implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'PiAPI Kling Video Extend',
        name: 'klingVideoExtend',
        icon: 'file:../piapi.svg',
        group: ['transform'],
        version: 1,
        description: 'Extend an existing Kling video',
        defaults: {
            name: 'Kling Video Extend',
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
                displayName: 'Original Task ID',
                name: 'originTaskId',
                type: 'string',
                default: '',
                required: true,
                description: 'The task ID of the original Kling video to extend',
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
                const originTaskId = this.getNodeParameter('originTaskId', i) as string;
                const waitForCompletion = this.getNodeParameter('waitForCompletion', i, false) as boolean;

                // Construct request body
                const body = {
                    model: 'kling',
                    task_type: 'extend_video',
                    input: {
                        origin_task_id: originTaskId,
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
