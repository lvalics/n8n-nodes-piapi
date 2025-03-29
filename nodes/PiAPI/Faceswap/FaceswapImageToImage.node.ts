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
import { FaceswapImageParams } from '../shared/Interfaces';

export class FaceswapImageToImage implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'PiAPI Faceswap',
        name: 'faceswapImageToImage',
        icon: 'file:../piapi.svg',
        group: ['transform'],
        version: 1,
        description: 'Swap faces in images using PiAPI Faceswap',
        defaults: {
            name: 'Faceswap',
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
            // Target Image (the image that will have faces replaced)
            {
                displayName: 'Target Image Input Method',
                name: 'targetImageInputMethod',
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
                description: 'Method to input the target image data',
            },
            {
                displayName: 'Target Image Binary Property',
                name: 'targetBinaryPropertyName',
                type: 'string',
                default: 'data',
                required: true,
                displayOptions: {
                    show: {
                        targetImageInputMethod: ['binaryData'],
                    },
                },
                description: 'Name of the binary property containing the target image data',
            },
            {
                displayName: 'Target Image URL',
                name: 'targetImageUrl',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        targetImageInputMethod: ['url'],
                    },
                },
                description: 'URL of the target image that will have faces replaced',
            },
            
            // Swap Image (the image containing the face(s) to use)
            {
                displayName: 'Swap Image Input Method',
                name: 'swapImageInputMethod',
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
                description: 'Method to input the swap image data',
            },
            {
                displayName: 'Swap Image Binary Property',
                name: 'swapBinaryPropertyName',
                type: 'string',
                default: 'data',
                required: true,
                displayOptions: {
                    show: {
                        swapImageInputMethod: ['binaryData'],
                    },
                },
                description: 'Name of the binary property containing the swap image data',
            },
            {
                displayName: 'Swap Image URL',
                name: 'swapImageUrl',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        swapImageInputMethod: ['url'],
                    },
                },
                description: 'URL of the image containing the face(s) to swap',
            },
            
            // Face Indices Information
            {
                displayName: 'Face Indices Information',
                name: 'faceIndicesInfo',
                type: 'notice',
                default: 'Faces are detected in order from left to right in most cases. For diagonal positioning, top-left might be 1 and bottom-right 0. Leave blank to swap all detected faces.',
            },
            
            // Advanced options
            {
                displayName: 'Advanced Options',
                name: 'advancedOptions',
                type: 'collection',
                placeholder: 'Add Option',
                default: {},
                options: [
                    {
                        displayName: 'Swap Faces Index',
                        name: 'swapFacesIndex',
                        type: 'string',
                        default: '',
                        placeholder: '0 or 0,1',
                        description: 'Index(es) of faces to use from the swap image (e.g., "0" or "1,0")',
                    },
                    {
                        displayName: 'Target Faces Index',
                        name: 'targetFacesIndex',
                        type: 'string',
                        default: '',
                        placeholder: '0 or 0,1',
                        description: 'Index(es) of faces to replace in the target image (e.g., "0" or "0,1")',
                    },
                ],
            },
            
            // Wait for completion
            {
                displayName: 'Wait For Completion',
                name: 'waitForCompletion',
                type: 'boolean',
                default: false,
                description: 'Whether to wait for the face swap process to complete before continuing',
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
                const targetImageInputMethod = this.getNodeParameter('targetImageInputMethod', i) as string;
                const swapImageInputMethod = this.getNodeParameter('swapImageInputMethod', i) as string;
                const waitForCompletion = this.getNodeParameter('waitForCompletion', i, false) as boolean;
                
                // Get advanced options if enabled
                const advancedOptions = this.getNodeParameter('advancedOptions', i, {}) as {
                    swapFacesIndex?: string;
                    targetFacesIndex?: string;
                };
                
                // Process target image based on input method
                let targetImageData: string;
                
                if (targetImageInputMethod === 'url') {
                    targetImageData = this.getNodeParameter('targetImageUrl', i) as string;
                } else {
                    // Binary data method
                    const targetBinaryPropertyName = this.getNodeParameter('targetBinaryPropertyName', i) as string;
                    const targetBinaryData = this.helpers.assertBinaryData(i, targetBinaryPropertyName);
                    
                    if (targetBinaryData.mimeType && !targetBinaryData.mimeType.includes('image')) {
                        throw new NodeOperationError(
                            this.getNode(),
                            'The provided target binary data is not an image',
                            { itemIndex: i },
                        );
                    }
                    
                    // Convert binary data to base64
                    const base64String = Buffer.from(await this.helpers.getBinaryDataBuffer(i, targetBinaryPropertyName)).toString('base64');
                    targetImageData = `data:${targetBinaryData.mimeType};base64,${base64String}`;
                }
                
                // Process swap image based on input method
                let swapImageData: string;
                
                if (swapImageInputMethod === 'url') {
                    swapImageData = this.getNodeParameter('swapImageUrl', i) as string;
                } else {
                    // Binary data method
                    const swapBinaryPropertyName = this.getNodeParameter('swapBinaryPropertyName', i) as string;
                    const swapBinaryData = this.helpers.assertBinaryData(i, swapBinaryPropertyName);
                    
                    if (swapBinaryData.mimeType && !swapBinaryData.mimeType.includes('image')) {
                        throw new NodeOperationError(
                            this.getNode(),
                            'The provided swap binary data is not an image',
                            { itemIndex: i },
                        );
                    }
                    
                    // Convert binary data to base64
                    const base64String = Buffer.from(await this.helpers.getBinaryDataBuffer(i, swapBinaryPropertyName)).toString('base64');
                    swapImageData = `data:${swapBinaryData.mimeType};base64,${base64String}`;
                }
                
                // Prepare request parameters
                const requestBody: FaceswapImageParams = {
                    model: 'Qubico/image-toolkit',
                    task_type: 'face-swap',
                    input: {
                        target_image: targetImageData,
                        swap_image: swapImageData,
                    },
                };
                
                // Add face indices if provided
                if (advancedOptions.swapFacesIndex) {
                    requestBody.input.swap_faces_index = advancedOptions.swapFacesIndex;
                }
                
                if (advancedOptions.targetFacesIndex) {
                    requestBody.input.target_faces_index = advancedOptions.targetFacesIndex;
                }
                
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
                    const errorMessage = 'The API could not process the provided image. Please ensure the image is accessible, in a common format (JPEG, PNG), and meets the size requirements (under 2048x2048 resolution).';
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
