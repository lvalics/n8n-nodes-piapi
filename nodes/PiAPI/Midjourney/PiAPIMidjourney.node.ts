import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeConnectionType,
    NodeOperationError,
    IDataObject,
} from 'n8n-workflow';

import { piApiRequest, waitForTaskCompletion } from '../shared/GenericFunctions';
import { MidjourneyImagineParams, MidjourneyUpscaleParams, MidjourneyDescribeParams } from '../shared/Interfaces';

export class PiAPIMidjourney implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'PiAPI Midjourney',
        name: 'piAPIMidjourney',
        icon: 'file:../piapi.svg',
        group: ['transform'],
        version: 1,
        description: 'Generate and manipulate images using PiAPI Midjourney',
        defaults: {
            name: 'Midjourney',
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
            // Operation
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                options: [
                    {
                        name: 'Imagine',
                        value: 'imagine',
                        description: 'Generate 4 images from a text prompt',
                    },
                    {
                        name: 'Upscale',
                        value: 'upscale',
                        description: 'Upscale a selected image from a previous Imagine result',
                    },
                    {
                        name: 'Describe',
                        value: 'describe',
                        description: 'Generate prompt suggestions based on an image',
                    },
                ],
                default: 'imagine',
                description: 'Operation to perform',
            },

            // Imagine operation fields
            {
                displayName: 'Prompt',
                name: 'prompt',
                type: 'string',
                typeOptions: {
                    rows: 4,
                },
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        operation: ['imagine'],
                    },
                },
                description: 'Text prompt to generate images',
            },
            {
                displayName: 'Aspect Ratio',
                name: 'aspectRatio',
                type: 'options',
                options: [
                    {
                        name: 'Square (1:1)',
                        value: '1:1',
                        description: 'Square images',
                    },
                    {
                        name: 'Portrait (9:16)',
                        value: '9:16',
                        description: 'Vertical images',
                    },
                    {
                        name: 'Landscape (16:9)',
                        value: '16:9',
                        description: 'Horizontal widescreen images',
                    },
                    {
                        name: 'Ultra Landscape (21:9)',
                        value: '21:9',
                        description: 'Ultra-wide horizontal images',
                    },
                ],
                default: '1:1',
                displayOptions: {
                    show: {
                        operation: ['imagine'],
                    },
                },
                description: 'Aspect ratio of the generated images',
            },
            {
                displayName: 'Process Mode',
                name: 'processMode',
                type: 'options',
                options: [
                    {
                        name: 'Relax',
                        value: 'relax',
                        description: 'Lower priority but cheaper',
                    },
                    {
                        name: 'Fast',
                        value: 'fast',
                        description: 'Standard processing speed',
                    },
                    {
                        name: 'Turbo',
                        value: 'turbo',
                        description: 'Higher priority but more expensive',
                    },
                ],
                default: 'fast',
                displayOptions: {
                    show: {
                        operation: ['imagine', 'describe'],
                    },
                },
                description: 'Processing speed priority',
            },
            {
                displayName: 'Skip Prompt Check',
                name: 'skipPromptCheck',
                type: 'boolean',
                default: false,
                displayOptions: {
                    show: {
                        operation: ['imagine'],
                    },
                },
                description: 'Whether to skip content filtering on prompts',
            },

            // Upscale operation fields
            {
                displayName: 'Origin Task ID',
                name: 'originTaskId',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        operation: ['upscale'],
                    },
                },
                description: 'Task ID of the original Imagine operation',
            },
            {
                displayName: 'Image Index',
                name: 'imageIndex',
                type: 'options',
                options: [
                    {
                        name: 'Image 1',
                        value: '1',
                        description: 'First image in the grid',
                    },
                    {
                        name: 'Image 2',
                        value: '2',
                        description: 'Second image in the grid',
                    },
                    {
                        name: 'Image 3',
                        value: '3',
                        description: 'Third image in the grid',
                    },
                    {
                        name: 'Image 4',
                        value: '4',
                        description: 'Fourth image in the grid',
                    },
                ],
                default: '1',
                required: true,
                displayOptions: {
                    show: {
                        operation: ['upscale'],
                    },
                },
                description: 'Which image to upscale from the original grid',
            },

            // Describe operation fields
            {
                displayName: 'Image Input Method',
                name: 'imageInputMethod',
                type: 'options',
                options: [
                    {
                        name: 'URL',
                        value: 'url',
                    },
                    {
                        name: 'Binary Data',
                        value: 'binaryData',
                    },
                ],
                default: 'url',
                displayOptions: {
                    show: {
                        operation: ['describe'],
                    },
                },
                description: 'Method to input the image data',
            },
            {
                displayName: 'Binary Property',
                name: 'binaryPropertyName',
                type: 'string',
                default: 'data',
                required: true,
                displayOptions: {
                    show: {
                        operation: ['describe'],
                        imageInputMethod: ['binaryData'],
                    },
                },
                description: 'Name of the binary property containing the image data',
            },
            {
                displayName: 'Image URL',
                name: 'imageUrl',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        operation: ['describe'],
                        imageInputMethod: ['url'],
                    },
                },
                description: 'URL of the image to describe',
            },

            // Advanced options for all operations
            {
                displayName: 'Advanced Options',
                name: 'advancedOptions',
                type: 'collection',
                placeholder: 'Add Option',
                default: {},
                options: [
                    {
                        displayName: 'Service Mode',
                        name: 'serviceMode',
                        type: 'options',
                        options: [
                            {
                                name: 'Public (PAYG)',
                                value: 'public',
                                description: 'Process under Pay-As-You-Go mode',
                            },
                            {
                                name: 'Private (HYA)',
                                value: 'private',
                                description: 'Process under Host-Your-Account mode',
                            },
                        ],
                        default: '',
                        description: 'Choose how this task will be processed',
                    },
                    {
                        displayName: 'Bot ID',
                        name: 'botId',
                        type: 'number',
                        default: 0,
                        displayOptions: {
                            show: {
                                '/operation': ['describe'],
                            },
                        },
                        description: 'Specify which Midjourney account will process this task (HYA Pro Plan only)',
                    },
                ],
            },

            // Wait for completion
            {
                displayName: 'Wait For Completion',
                name: 'waitForCompletion',
                type: 'boolean',
                default: false,
                description: 'Whether to wait for the operation to complete before continuing',
            },
            {
                displayName: 'Max Retries',
                name: 'maxRetries',
                type: 'number',
                default: 60,
                description: 'Maximum number of retries to check task status',
                displayOptions: {
                    show: {
                        waitForCompletion: [true],
                    },
                },
            },
            {
                displayName: 'Retry Interval',
                name: 'retryInterval',
                type: 'number',
                default: 5000,
                description: 'Interval between retries in milliseconds',
                displayOptions: {
                    show: {
                        waitForCompletion: [true],
                    },
                },
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];

        for (let i = 0; i < items.length; i++) {
            try {
                // Get base parameters
                const operation = this.getNodeParameter('operation', i) as string;
                const waitForCompletion = this.getNodeParameter('waitForCompletion', i, false) as boolean;
                const advancedOptions = this.getNodeParameter('advancedOptions', i, {}) as {
                    serviceMode?: string;
                    botId?: number;
                };

                let response;

                // Prepare common config
                const config: any = {};
                if (advancedOptions.serviceMode) {
                    config.service_mode = advancedOptions.serviceMode;
                }

                // Handle different operations
                if (operation === 'imagine') {
                    // Get imagine-specific parameters
                    const prompt = this.getNodeParameter('prompt', i) as string;
                    const aspectRatio = this.getNodeParameter('aspectRatio', i, '1:1') as string;
                    const processMode = this.getNodeParameter('processMode', i, 'fast') as string;
                    const skipPromptCheck = this.getNodeParameter('skipPromptCheck', i, false) as boolean;

                    // Prepare request parameters
                    const requestBody: MidjourneyImagineParams = {
                        model: 'midjourney',
                        task_type: 'imagine',
                        input: {
                            prompt,
                            aspect_ratio: aspectRatio,
                            process_mode: processMode,
                            skip_prompt_check: skipPromptCheck,
                        },
                        config,
                    };

                    // Make the API request
                    response = await piApiRequest.call(
                        this,
                        'POST',
                        '/api/v1/task',
                        requestBody as unknown as IDataObject,
                    );

                } else if (operation === 'upscale') {
                    // Get upscale-specific parameters
                    const originTaskId = this.getNodeParameter('originTaskId', i) as string;
                    const imageIndex = this.getNodeParameter('imageIndex', i) as string;

                    // Prepare request parameters
                    const requestBody: MidjourneyUpscaleParams = {
                        model: 'midjourney',
                        task_type: 'upscale',
                        input: {
                            origin_task_id: originTaskId,
                            index: imageIndex,
                        },
                        config,
                    };

                    // Make the API request
                    response = await piApiRequest.call(
                        this,
                        'POST',
                        '/api/v1/task',
                        requestBody as unknown as IDataObject,
                    );

                } else if (operation === 'describe') {
                    // Get describe-specific parameters
                    const imageInputMethod = this.getNodeParameter('imageInputMethod', i) as string;
                    const processMode = this.getNodeParameter('processMode', i, 'fast') as string;

                    let imageUrl: string;

                    // Get image data based on input method
                    if (imageInputMethod === 'url') {
                        imageUrl = this.getNodeParameter('imageUrl', i) as string;
                    } else {
                        // Binary data method
                        const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
                        const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);

                        if (binaryData.mimeType && !binaryData.mimeType.includes('image')) {
                            throw new NodeOperationError(
                                this.getNode(),
                                'The provided binary data is not an image',
                                { itemIndex: i },
                            );
                        }

                        // Convert binary data to base64
                        const base64String = Buffer.from(await this.helpers.getBinaryDataBuffer(i, binaryPropertyName)).toString('base64');
                        imageUrl = `data:${binaryData.mimeType};base64,${base64String}`;
                    }

                    // Prepare request parameters
                    const requestBody: MidjourneyDescribeParams = {
                        model: 'midjourney',
                        task_type: 'describe',
                        input: {
                            image_url: imageUrl,
                            process_mode: processMode,
                        },
                        config,
                    };

                    // Add bot ID if provided
                    if (advancedOptions.botId) {
                        requestBody.input.bot_id = advancedOptions.botId;
                    }

                    // Make the API request
                    response = await piApiRequest.call(
                        this,
                        'POST',
                        '/api/v1/task',
                        requestBody as unknown as IDataObject,
                    );
                }

                const taskId = response.data?.task_id;

                if (!taskId) {
                    throw new NodeOperationError(this.getNode(), 'Failed to get a valid task ID from the API');
                }

                let executionData;

                if (waitForCompletion) {
                    const maxRetries = this.getNodeParameter('maxRetries', i, 60) as number;
                    const retryInterval = this.getNodeParameter('retryInterval', i, 5000) as number;

                    // Wait for the task to complete and get the result
                    executionData = await waitForTaskCompletion.call(
                        this,
                        taskId,
                        maxRetries,
                        retryInterval,
                    );
                } else {
                    // Return just the task ID and status
                    executionData = {
                        task_id: taskId,
                        status: response.data?.status || 'pending',
                    };
                }

                returnData.push({
                    json: executionData,
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
