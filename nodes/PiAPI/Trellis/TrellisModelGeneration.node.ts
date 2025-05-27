import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeConnectionType,
} from 'n8n-workflow';

import { piApiRequest, waitForTaskCompletion } from '../shared/GenericFunctions';

export class TrellisModelGeneration implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'PiAPI Trellis Image to 3D Model',
        name: 'trellis3DModelGeneration',
        icon: 'file:../piapi.svg',
        group: ['transform'],
        version: 1,
        description: 'Generate 3D models from images using Microsoft Trellis via PiAPI',
        defaults: {
            name: 'Trellis 3D Model Generation',
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
                        description: 'Image accessible via URL',
                    },
                    {
                        name: 'Base64',
                        value: 'base64',
                        description: 'Base64 encoded image data',
                    },
                    {
                        name: 'Binary Data',
                        value: 'binaryData',
                        description: 'Binary data from previous node',
                    },
                ],
                default: 'url',
                description: 'How to input the image',
            },
            {
                displayName: 'Image URL',
                name: 'imageUrl',
                type: 'string',
                default: '',
                required: true,
                description: 'URL of the image to convert to 3D (max size 1024x1024, image will be downloaded and converted to base64)',
                displayOptions: {
                    show: {
                        imageInputMethod: ['url'],
                    },
                },
            },
            {
                displayName: 'Base64 Image',
                name: 'base64Image',
                type: 'string',
                typeOptions: {
                    rows: 4,
                },
                default: '',
                required: true,
                description: 'Base64 encoded image data (max image size is 1024x1024)',
                displayOptions: {
                    show: {
                        imageInputMethod: ['base64'],
                    },
                },
            },
            {
                displayName: 'Binary Property',
                name: 'binaryPropertyName',
                type: 'string',
                default: 'data',
                required: true,
                description: 'Name of the binary property containing the image to convert to 3D',
                displayOptions: {
                    show: {
                        imageInputMethod: ['binaryData'],
                    },
                },
            },
            {
                displayName: 'Seed',
                name: 'seed',
                type: 'number',
                default: 0,
                description: 'Random seed for reproducible results (0 for random)',
            },
            {
                displayName: 'Advanced Options',
                name: 'advancedOptions',
                type: 'collection',
                placeholder: 'Add Option',
                default: {},
                options: [
                    {
                        displayName: 'Surface Sampling Steps',
                        name: 'ssSamplingSteps',
                        type: 'number',
                        typeOptions: {
                            minValue: 10,
                            maxValue: 50,
                        },
                        default: 50,
                        description: 'Number of sampling steps for surface creation (10-50, higher means better quality but slower)',
                    },
                    {
                        displayName: 'SLAT Sampling Steps',
                        name: 'slatSamplingSteps',
                        type: 'number',
                        typeOptions: {
                            minValue: 10,
                            maxValue: 50,
                        },
                        default: 50,
                        description: 'Number of sampling steps for SLAT process (10-50, higher means better quality but slower)',
                    },
                    {
                        displayName: 'Surface Guidance Strength',
                        name: 'ssGuidanceStrength',
                        type: 'number',
                        typeOptions: {
                            minValue: 0.1,
                            maxValue: 10,
                        },
                        default: 7.5,
                        description: 'Guidance strength for surface creation (0.1-10)',
                    },
                    {
                        displayName: 'SLAT Guidance Strength',
                        name: 'slatGuidanceStrength',
                        type: 'number',
                        typeOptions: {
                            minValue: 0.1,
                            maxValue: 10,
                        },
                        default: 3,
                        description: 'Guidance strength for SLAT process (0.1-10)',
                    },
                ],
            },
            {
                displayName: 'Wait for Completion',
                name: 'waitForCompletion',
                type: 'boolean',
                default: false,
                description: 'Whether to wait for the 3D model generation to complete before returning',
            },
            {
                displayName: 'Note',
                name: 'note',
                type: 'notice',
                default: '3D model generation can take several minutes. Use the Task Status node to check progress and retrieve results later.',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];

        for (let i = 0; i < items.length; i++) {
            try {
                const imageInputMethod = this.getNodeParameter('imageInputMethod', i) as string;
                const seed = this.getNodeParameter('seed', i, 0) as number;
                const waitForCompletion = this.getNodeParameter('waitForCompletion', i, false) as boolean;
                const advancedOptions = this.getNodeParameter('advancedOptions', i, {}) as {
                    ssSamplingSteps?: number;
                    slatSamplingSteps?: number;
                    ssGuidanceStrength?: number;
                    slatGuidanceStrength?: number;
                };

                // Get image based on input method
                let image = '';
                if (imageInputMethod === 'url') {
                    const imageUrl = this.getNodeParameter('imageUrl', i) as string;
                    
                    try {
                        // Download the image first and convert to base64
                        const imageResponse = await this.helpers.request({
                            method: 'GET',
                            url: imageUrl,
                            encoding: null,
                            resolveWithFullResponse: true,
                        });
                        
                        const buffer = Buffer.from(imageResponse.body as Buffer);
                        const contentType = imageResponse.headers['content-type'] || 'image/png';
                        image = `data:${contentType};base64,${buffer.toString('base64')}`;
                    } catch (error) {
                        throw new Error(`Failed to download image from URL: ${error.message}. Trellis API requires direct access to images, which some websites block. Try downloading the image first and using the Binary Data input method instead.`);
                    }
                } else if (imageInputMethod === 'base64') {
                    image = this.getNodeParameter('base64Image', i) as string;
                    // Ensure it has the proper prefix if not present
                    if (!image.startsWith('data:image/')) {
                        image = `data:image/jpeg;base64,${image}`;
                    }
                } else if (imageInputMethod === 'binaryData') {
                    const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
                    const binaryItem = items[i].binary?.[binaryPropertyName];
                    if (!binaryItem) {
                        throw new Error(`No binary data found in property "${binaryPropertyName}"`);
                    }

                    const binaryData = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
                    if (!binaryData) {
                        throw new Error(`No binary data found in property "${binaryPropertyName}"`);
                    }

                    const binaryMimeType = binaryItem.mimeType || 'image/png';
                    image = `data:${binaryMimeType};base64,${binaryData.toString('base64')}`;
                }

                // Construct request body
                const body = {
                    model: 'Qubico/trellis',
                    task_type: 'image-to-3d',
                    input: {
                        image,
                        seed,
                        ss_sampling_steps: advancedOptions.ssSamplingSteps || 50,
                        slat_sampling_steps: advancedOptions.slatSamplingSteps || 50,
                        ss_guidance_strength: advancedOptions.ssGuidanceStrength || 7.5,
                        slat_guidance_strength: advancedOptions.slatGuidanceStrength || 3,
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
