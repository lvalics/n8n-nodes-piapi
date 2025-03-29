import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeConnectionType,
} from 'n8n-workflow';

import { FileUploadParams } from '../shared/Interfaces';

export class FileUpload implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'PiAPI File Upload',
        name: 'fileUpload',
        icon: 'file:../piapi.svg',
        group: ['transform'],
        version: 1,
        description: 'Upload temporary files that will be automatically deleted after 24 hours',
        defaults: {
            name: 'File Upload',
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
                displayName: 'Input Method',
                name: 'inputMethod',
                type: 'options',
                options: [
                    {
                        name: 'Binary File',
                        value: 'binaryFile',
                    },
                    {
                        name: 'URL',
                        value: 'url',
                    },
                    {
                        name: 'Manual Input',
                        value: 'manualInput',
                    },
                ],
                default: 'binaryFile',
                description: 'How to input the file to upload',
            },
            {
                displayName: 'Binary Property',
                name: 'binaryPropertyName',
                type: 'string',
                default: 'data',
                required: true,
                displayOptions: {
                    show: {
                        inputMethod: ['binaryFile'],
                    },
                },
                description: 'The binary property containing the file to upload',
            },
            {
                displayName: 'File Name',
                name: 'fileName',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        inputMethod: ['manualInput'],
                    },
                },
                description: 'Name of the file with extension (jpg, jpeg, png, webp, mp4, wav, mp3)',
            },
            {
                displayName: 'File Data',
                name: 'fileData',
                type: 'string',
                typeOptions: {
                    rows: 4,
                },
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        inputMethod: ['manualInput'],
                    },
                },
                description: 'Base64 encoded file data',
            },
            {
                displayName: 'File URL',
                name: 'fileUrl',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        inputMethod: ['url'],
                    },
                },
                description: 'URL of the file to download and upload',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];

        // Helper functions (moved inside execute method to access via closure instead of 'this')
        const generateHashFilename = (extension: string): string => {
            // Generate a simple hash
            const randomHash = Math.random().toString(36).substring(2, 15) + 
                           Math.random().toString(36).substring(2, 15);
            return `${randomHash}.${extension}`;
        };

        const getMimeTypeExtension = (mimeType: string): string => {
            const mimeTypeToExtension: {[key: string]: string} = {
                'image/jpeg': 'jpg',
                'image/png': 'png',
                'image/webp': 'webp',
                'video/mp4': 'mp4',
                'audio/wav': 'wav',
                'audio/mpeg': 'mp3',
            };
            
            return mimeTypeToExtension[mimeType] || 'jpg';
        };

        for (let i = 0; i < items.length; i++) {
            try {
                const inputMethod = this.getNodeParameter('inputMethod', i) as string;
                let fileName: string;
                let fileData: string;

                let extension: string = '';

                if (inputMethod === 'binaryFile') {
                    // Handle binary input
                    const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
                    
                    if (items[i].binary === undefined) {
                        throw new Error('No binary data exists on item!');
                    }
                    
                    const binaryData = items[i].binary![binaryPropertyName as string];
                    
                    if (binaryData === undefined) {
                        throw new Error(`No binary data found for field "${binaryPropertyName}"!`);
                    }

                    // Get extension from filename or mime type
                    if (binaryData.fileName) {
                        extension = binaryData.fileName.split('.').pop()?.toLowerCase() || 
                                  getMimeTypeExtension(binaryData.mimeType);
                    } else {
                        extension = getMimeTypeExtension(binaryData.mimeType);
                    }
                    
                    // Generate hash-based filename
                    fileName = generateHashFilename(extension);
                    
                    // Get base64 data
                    fileData = binaryData.data;
                } else if (inputMethod === 'url') {
                    // Handle URL input
                    const fileUrl = this.getNodeParameter('fileUrl', i) as string;
                    
                    // Get extension from URL
                    extension = fileUrl.split('.').pop()?.toLowerCase() || 'jpg';
                    if (extension.includes('?')) {
                        extension = extension.split('?')[0];
                    }
                    
                    // Generate hash-based filename
                    fileName = generateHashFilename(extension);
                    
                    // Download the file from the URL
                    const response = await this.helpers.request({
                        method: 'GET',
                        url: fileUrl,
                        encoding: null,
                        resolveWithFullResponse: true,
                    });
                    
                    // If we have content-type, use it to get a better extension
                    if (response.headers['content-type']) {
                        const contentTypeExt = getMimeTypeExtension(response.headers['content-type']);
                        if (contentTypeExt) {
                            fileName = generateHashFilename(contentTypeExt);
                        }
                    }
                    
                    // Convert to base64
                    const buffer = Buffer.from(response.body as Buffer);
                    fileData = buffer.toString('base64');
                } else {
                    // Manual input
                    fileName = this.getNodeParameter('fileName', i) as string;
                    fileData = this.getNodeParameter('fileData', i) as string;
                    
                    // Get extension from filename
                    extension = fileName.split('.').pop()?.toLowerCase() || '';
                }
                
                // Check if file extension is supported
                const supportedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'wav', 'mp3'];
                
                if (!extension || !supportedExtensions.includes(extension)) {
                    throw new Error(`File extension "${extension}" is not supported. Supported extensions: ${supportedExtensions.join(', ')}`);
                }

                // Prepare request parameters
                const params: FileUploadParams = {
                    file_name: fileName,
                    file_data: fileData,
                };

                // Get credentials
                const credentials = await this.getCredentials('piAPIApi');
                
                // Make API request
                const response = await this.helpers.request({
                    method: 'POST',
                    url: 'https://upload.theapi.app/api/ephemeral_resource',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': credentials.apiKey as string,
                    },
                    body: params,
                    json: true,
                });

                // Return the response
                returnData.push({
                    json: response,
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
