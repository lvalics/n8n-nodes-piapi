import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeConnectionType,
    IDataObject,
} from 'n8n-workflow';

import { piApiRequest, waitForTaskCompletion } from '../shared/GenericFunctions';
import { QubicoSegmentParams } from '../shared/Interfaces';

export class QubicoSegment implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'PiAPI Qubico Image Segmentation',
        name: 'qubicoSegment',
        icon: 'file:../piapi.svg',
        group: ['transform'],
        version: 1,
        description: 'Segment images using semantic prompts via PiAPI Qubico',
        defaults: {
            name: 'Qubico Segment',
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
                displayName: 'Image Input Method',
                name: 'imageInputMethod',
                type: 'options',
                options: [
                    {
                        name: 'URL',
                        value: 'url',
                    },
                    {
                        name: 'Binary Field',
                        value: 'binaryField',
                    },
                ],
                default: 'url',
                description: 'How to input the image to segment',
            },
            {
                displayName: 'Image URL',
                name: 'imageUrl',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        imageInputMethod: ['url'],
                    },
                },
                description: 'URL of the image to segment',
            },
            {
                displayName: 'Binary Field',
                name: 'binaryField',
                type: 'string',
                default: 'data',
                required: true,
                displayOptions: {
                    show: {
                        imageInputMethod: ['binaryField'],
                    },
                },
                description: 'The binary field containing the image to segment',
            },
            {
                displayName: 'Prompt',
                name: 'prompt',
                type: 'string',
                typeOptions: {
                    rows: 4,
                },
                default: '',
                placeholder: 'clothes,shoes',
                required: true,
                description: 'The semantic prompt of the things that you want to segment, separate by comma',
            },
            {
                displayName: 'Negative Prompt',
                name: 'negativePrompt',
                type: 'string',
                typeOptions: {
                    rows: 4,
                },
                default: '',
                placeholder: 'pants',
                description: 'The semantic prompt of the things that you do not want to segment, separate by comma',
            },
            {
                displayName: 'Segment Factor',
                name: 'segmentFactor',
                type: 'number',
                default: 0,
                description: 'Pixels that expand or shrink on the edge, positive integer for expansion, negative for shrinking',
            },
            {
                displayName: 'Wait For Completion',
                name: 'waitForCompletion',
                type: 'boolean',
                default: false,
                description: 'Whether to wait for the segmentation to complete',
            },
            {
                displayName: 'Return Binary Data',
                name: 'returnBinaryData',
                type: 'boolean',
                default: false,
                description: 'Whether to return the segmented image as binary data',
                displayOptions: {
                    show: {
                        waitForCompletion: [true],
                    },
                },
            },
            {
                displayName: 'Binary Property',
                name: 'binaryPropertyName',
                type: 'string',
                default: 'data',
                required: true,
                displayOptions: {
                    show: {
                        returnBinaryData: [true],
                        waitForCompletion: [true],
                    },
                },
                description: 'Name of the binary property to which to write the data of the segmented image',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];

        for (let i = 0; i < items.length; i++) {
            try {
                // Get parameters
                const imageInputMethod = this.getNodeParameter('imageInputMethod', i) as string;
                const prompt = this.getNodeParameter('prompt', i) as string;
                const negativePrompt = this.getNodeParameter('negativePrompt', i, '') as string;
                const segmentFactor = this.getNodeParameter('segmentFactor', i, 0) as number;
                const waitForCompletion = this.getNodeParameter('waitForCompletion', i, false) as boolean;

                // Get image URL
                let imageUrl: string;
                if (imageInputMethod === 'url') {
                    imageUrl = this.getNodeParameter('imageUrl', i) as string;
                } else {
                    // Handle binary input
                    const binaryField = this.getNodeParameter('binaryField', i) as string;
                    if (items[i].binary === undefined) {
                        throw new Error('No binary data exists on item!');
                    }
                    const binaryData = items[i].binary![binaryField as string];
                    if (binaryData === undefined) {
                        throw new Error(`No binary data found for field "${binaryField}"!`);
                    }

                    // If we have URL from a previous API upload or data URI (base64 data)
                    if (binaryData.url) {
                        imageUrl = String(binaryData.url);
                    } else {
                        // Convert binary to base64
                        const mimeType = binaryData.mimeType;
                        const base64 = Buffer.from(binaryData.data, 'base64').toString('base64');
                        imageUrl = `data:${mimeType};base64,${base64}`;
                    }
                }

                // Prepare parameters for the API request
                const params: QubicoSegmentParams = {
                    model: 'Qubico/image-toolkit',
                    task_type: 'segment',
                    input: {
                        image: imageUrl,
                        prompt,
                        negative_prompt: negativePrompt,
                        segment_factor: segmentFactor,
                    },
                };

                // Make API request to create the segmentation task
                const response = await piApiRequest.call(this, 'POST', '/api/v1/task', params as unknown as IDataObject);
                const taskId = response.data.task_id;

                if (waitForCompletion) {
                    // Wait for the task to complete
                    const completedTask = await waitForTaskCompletion.call(this, taskId);

                    // Check if we should return binary data
                    const returnBinaryData = this.getNodeParameter('returnBinaryData', i, false) as boolean;
                    
                    if (returnBinaryData) {
                        // Get the binary property name
                        const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
                        
                        // Get the segmented image URL
                        const segmentedImageUrl = completedTask.output && typeof completedTask.output === 'object' 
                            ? (completedTask.output as IDataObject).image_url as string 
                            : undefined;
                        
                        if (segmentedImageUrl) {
                            // Download the image and return as binary data
                            const imageData = await this.helpers.request({
                                method: 'GET',
                                url: segmentedImageUrl,
                                encoding: null,
                                resolveWithFullResponse: true,
                            });

                            const newItem: INodeExecutionData = {
                                json: completedTask,
                                binary: {},
                            };

                            if (newItem.binary) {
                                newItem.binary[binaryPropertyName] = await this.helpers.prepareBinaryData(
                                    Buffer.from(imageData.body as Buffer),
                                    segmentedImageUrl.split('/').pop() || 'segmented-image.png',
                                    imageData.headers['content-type'],
                                );
                            }

                            returnData.push(newItem);
                        } else {
                            // No image URL found in the response
                            returnData.push({
                                json: {
                                    ...completedTask,
                                    error: 'No segmented image URL found in the response',
                                },
                            });
                        }
                    } else {
                        // Return the completed task without binary data
                        returnData.push({
                            json: completedTask,
                        });
                    }
                } else {
                    // Return the task information without waiting for completion
                    returnData.push({
                        json: {
                            taskId,
                            ...response.data,
                        },
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
