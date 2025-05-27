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
import { ImageUpscaleParams } from '../shared/Interfaces';

export class ImageUpscale implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'PiAPI Image Upscale',
        name: 'imageUpscale',
        icon: 'file:../piapi.svg',
        group: ['transform'],
        version: 1,
        description: 'Enhance image resolution using PiAPI Image Upscale',
        defaults: {
            name: 'Image Upscale',
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
            // Image Input
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
                description: 'Method to input the image data',
            },
            {
                displayName: 'Image Binary Property',
                name: 'imageBinaryPropertyName',
                type: 'string',
                default: 'data',
                required: true,
                displayOptions: {
                    show: {
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
                        imageInputMethod: ['url'],
                    },
                },
                description: 'URL of the image to upscale',
            },
            
            // Image Requirements Notice
            {
                displayName: 'Image Requirements',
                name: 'imageRequirements',
                type: 'notice',
                default: 'The image should be in a common format (JPEG, PNG) and must not exceed 10MB in size.',
            },
            
            // Scale Factor (if supported by the API)
            {
                displayName: 'Scale Factor',
                name: 'scaleFactor',
                type: 'options',
                options: [
                    {
                        name: '2x',
                        value: 2,
                        description: 'Double the resolution (default)',
                    },
                    {
                        name: '4x',
                        value: 4,
                        description: 'Quadruple the resolution',
                    },
                ],
                default: 2,
                description: 'Factor by which to upscale the image resolution',
            },
            
            // Wait for completion
            {
                displayName: 'Wait For Completion',
                name: 'waitForCompletion',
                type: 'boolean',
                default: false,
                description: 'Whether to wait for the image upscaling process to complete before continuing',
            },
            {
                displayName: 'Max Retries',
                name: 'maxRetries',
                type: 'number',
                default: 20,
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
                default: 3000,
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
                // Get parameters
                const imageInputMethod = this.getNodeParameter('imageInputMethod', i) as string;
                const scaleFactor = this.getNodeParameter('scaleFactor', i, 2) as number;
                const waitForCompletion = this.getNodeParameter('waitForCompletion', i, false) as boolean;
                
                // Process image based on input method
                let imageData: string;
                
                if (imageInputMethod === 'url') {
                    imageData = this.getNodeParameter('imageUrl', i) as string;
                } else {
                    // Binary data method
                    const imageBinaryPropertyName = this.getNodeParameter('imageBinaryPropertyName', i) as string;
                    const imageBinaryData = this.helpers.assertBinaryData(i, imageBinaryPropertyName);
                    
                    if (imageBinaryData.mimeType && !imageBinaryData.mimeType.includes('image')) {
                        throw new NodeOperationError(
                            this.getNode(),
                            'The provided binary data is not an image',
                            { itemIndex: i },
                        );
                    }
                    
                    // Convert binary data to base64
                    const base64String = Buffer.from(await this.helpers.getBinaryDataBuffer(i, imageBinaryPropertyName)).toString('base64');
                    imageData = `data:${imageBinaryData.mimeType};base64,${base64String}`;
                }
                
                // Prepare request parameters
                const requestBody: ImageUpscaleParams = {
                    model: 'Qubico/image-toolkit',
                    task_type: 'upscale',
                    input: {
                        image: imageData,
                        scale: scaleFactor,
                    },
                };
                
                // Make the API request
                const response = await piApiRequest.call(
                    this,
                    'POST',
                    '/api/v1/task',
                    requestBody as unknown as IDataObject,
                );
                
                const taskId = response.data?.task_id;
                
                if (!taskId) {
                    throw new NodeOperationError(this.getNode(), 'Failed to get a valid task ID from the API');
                }
                
                let executionData;
                
                if (waitForCompletion) {
                    const maxRetries = this.getNodeParameter('maxRetries', i, 20) as number;
                    const retryInterval = this.getNodeParameter('retryInterval', i, 3000) as number;
                    
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
                // Add specific messaging for common errors
                if (error.message && error.message.includes('failed to get valid image')) {
                    const errorMessage = 'The API could not process the provided image. Please ensure the image is accessible, in a common format (JPEG, PNG), and not too large (under 10MB).';
                    if (this.continueOnFail()) {
                        returnData.push({
                            json: {
                                error: errorMessage,
                                details: error.message,
                            },
                        });
                        continue;
                    }
                    throw new NodeOperationError(this.getNode(), errorMessage);
                }
                
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
