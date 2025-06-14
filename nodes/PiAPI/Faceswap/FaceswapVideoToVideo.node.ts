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
import { FaceswapVideoParams } from '../shared/Interfaces';

export class FaceswapVideoToVideo implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'PiAPI Video Faceswap (Single & Multi-Face)',
        name: 'faceswapVideoToVideo',
        icon: 'file:../piapi.svg',
        group: ['transform'],
        version: 1,
        description: 'Swap one or multiple faces from an image to a video with precise face index control using PiAPI Video Faceswap API',
        defaults: {
            name: 'Video Faceswap',
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
                default: 'This node supports swapping multiple faces from an image to a video. Use the Advanced Options to specify which faces to swap with index numbers (0,1,2, etc.).',
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
            
            // Target Video (the video that will have faces replaced)
            {
                displayName: 'Target Video Input Method',
                name: 'targetVideoInputMethod',
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
                description: 'Method to input the target video data',
            },
            {
                displayName: 'Target Video Binary Property',
                name: 'targetVideoBinaryPropertyName',
                type: 'string',
                default: 'data',
                required: true,
                displayOptions: {
                    show: {
                        targetVideoInputMethod: ['binaryData'],
                    },
                },
                description: 'Name of the binary property containing the target video data',
            },
            {
                displayName: 'Target Video URL',
                name: 'targetVideoUrl',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        targetVideoInputMethod: ['url'],
                    },
                },
                description: 'URL of the target video that will have faces replaced (MP4 only, max 10MB, max 720p)',
            },
            
            // Important Notes
            {
                displayName: 'Video Requirements',
                name: 'videoRequirements',
                type: 'notice',
                default: 'Video must be MP4 format, maximum 10MB size, maximum 720p resolution, and maximum 600 frames.',
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
                description: 'Index(es) of faces to replace in the target video (e.g., "0" for first face, "0,1" for first and second faces)',
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
                const swapImageInputMethod = this.getNodeParameter('swapImageInputMethod', i) as string;
                const targetVideoInputMethod = this.getNodeParameter('targetVideoInputMethod', i) as string;
                const waitForCompletion = this.getNodeParameter('waitForCompletion', i, false) as boolean;
                
                // Get face indices if multi-face selection is enabled
                const enableMultiFaceSelection = this.getNodeParameter('enableMultiFaceSelection', i, false) as boolean;
                
                let swapFacesIndex = '';
                let targetFacesIndex = '';
                
                if (enableMultiFaceSelection) {
                    swapFacesIndex = this.getNodeParameter('swapFacesIndex', i, '0') as string;
                    targetFacesIndex = this.getNodeParameter('targetFacesIndex', i, '0') as string;
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
                
                // Process target video based on input method
                let targetVideoData: string;
                
                if (targetVideoInputMethod === 'url') {
                    targetVideoData = this.getNodeParameter('targetVideoUrl', i) as string;
                } else {
                    // Binary data method
                    const targetVideoBinaryPropertyName = this.getNodeParameter('targetVideoBinaryPropertyName', i) as string;
                    const targetVideoBinaryData = this.helpers.assertBinaryData(i, targetVideoBinaryPropertyName);
                    
                    if (targetVideoBinaryData.mimeType && !targetVideoBinaryData.mimeType.includes('video/mp4')) {
                        throw new NodeOperationError(
                            this.getNode(),
                            'The provided target binary data is not an MP4 video',
                            { itemIndex: i },
                        );
                    }
                    
                    // Convert binary data to base64
                    const base64String = Buffer.from(await this.helpers.getBinaryDataBuffer(i, targetVideoBinaryPropertyName)).toString('base64');
                    targetVideoData = `data:${targetVideoBinaryData.mimeType};base64,${base64String}`;
                }
                
                // Prepare request parameters
                const requestBody: FaceswapVideoParams = {
                    model: 'Qubico/video-toolkit',
                    task_type: 'face-swap',
                    input: {
                        swap_image: swapImageData,
                        target_video: targetVideoData,
                    },
                    config: {
                        service_mode: 'public'
                    }
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
                
                if (error.message && error.message.includes('failed to get valid video')) {
                    const errorMessage = 'The API could not process the provided video. Please ensure the video is accessible, in MP4 format, under 10MB, maximum 720p resolution, and maximum 600 frames.';
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
