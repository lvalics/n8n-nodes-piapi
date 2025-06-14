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
        displayName: 'PiAPI Image Faceswap (Single & Multi-Face)',
        name: 'faceswapImageToImage',
        icon: 'file:../piapi.svg',
        group: ['transform'],
        version: 1,
        description: 'Swap one or multiple faces in images with precise face index control using PiAPI Faceswap API',
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
            // Multi-Face Support Highlight
            {
                displayName: 'Multi-Face Support',
                name: 'multiFaceSupport',
                type: 'notice',
                default: 'This node supports swapping multiple faces between images. Use the Advanced Options to specify which faces to swap with index numbers (0,1,2, etc.).',
            },
            
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
            
            // Enable Multi-Face Selection toggle
            {
                displayName: 'Enable Multi-Face Selection',
                name: 'enableMultiFaceSelection',
                type: 'boolean',
                default: false,
                description: 'Whether to manually select specific faces by index',
            },
            
            // Face Indices Information - only shown when multi-face selection is enabled
            {
                displayName: 'Face Indices Information',
                name: 'faceIndicesInfo',
                type: 'notice',
                displayOptions: {
                    show: {
                        enableMultiFaceSelection: [true],
                    },
                },
                default: 'Faces are detected in order from left to right in most cases. For diagonal positioning, top-left might be 1 and bottom-right 0.',
            },
            
            // Face index inputs - directly in the main UI when enabled
            {
                displayName: 'Swap Faces Index',
                name: 'swapFacesIndex',
                type: 'string',
                default: '0',
                displayOptions: {
                    show: {
                        enableMultiFaceSelection: [true],
                    },
                },
                placeholder: '0 or 0,1',
                description: 'Index(es) of faces to use from the swap image (e.g., "0" for first face, "0,1" for first and second faces)',
            },
            {
                displayName: 'Target Faces Index',
                name: 'targetFacesIndex',
                type: 'string',
                default: '0',
                displayOptions: {
                    show: {
                        enableMultiFaceSelection: [true],
                    },
                },
                placeholder: '0 or 0,1',
                description: 'Index(es) of faces to replace in the target image (e.g., "0" for first face, "0,1" for first and second faces)',
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
                
                // Get face indices if multi-face selection is enabled
                const enableMultiFaceSelection = this.getNodeParameter('enableMultiFaceSelection', i, false) as boolean;
                
                let swapFacesIndex = '';
                let targetFacesIndex = '';
                
                if (enableMultiFaceSelection) {
                    swapFacesIndex = this.getNodeParameter('swapFacesIndex', i, '0') as string;
                    targetFacesIndex = this.getNodeParameter('targetFacesIndex', i, '0') as string;
                }
                
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
                    task_type: enableMultiFaceSelection ? 'multi-face-swap' : 'face-swap',
                    input: {
                        target_image: targetImageData,
                        swap_image: swapImageData,
                    },
                };
                
                // Add face indices if multi-face selection is enabled
                if (enableMultiFaceSelection) {
                    requestBody.input.swap_faces_index = swapFacesIndex;
                    requestBody.input.target_faces_index = targetFacesIndex;
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
