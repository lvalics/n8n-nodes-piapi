import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';

import { 
  extractImageUrlFromResponse, 
  isGenerationFailed, 
  extractFailureDetails,
  processStreamedResponse
} from '../shared/GenericFunctions';
import { ASPECT_RATIO_OPTIONS, LORA_OPTIONS } from '../shared/Constants';


// Helper function to generate prompt with aspect ratio
function generatePromptWithAspectRatio(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
	prompt: string,
): string {
	const aspectRatio = executeFunctions.getNodeParameter('aspectRatio', itemIndex) as string;
	const imageStyle = executeFunctions.getNodeParameter('imageStyle', itemIndex, 'none') as string;

	let aspectRatioText = '';
	if (aspectRatio === 'custom') {
		const width = executeFunctions.getNodeParameter('width', itemIndex, 1024) as number;
		const height = executeFunctions.getNodeParameter('height', itemIndex, 1024) as number;
		aspectRatioText = `Image size: ${width}x${height}. `;
	} else if (aspectRatio !== 'square_header' && aspectRatio !== 'landscape_header' && aspectRatio !== 'portrait_header') {
		aspectRatioText = `Image size: ${aspectRatio}. `;
	}

	// Add style to the prompt if selected
	let styleText = '';
	if (imageStyle !== 'none') {
		styleText = `Image style: ${imageStyle}. `;
	}

	return `${aspectRatioText}${styleText}${prompt}`;
}

export class LLMImageToImage implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PiAPI GPT-4o Image to Image',
		name: 'llmImageToImage',
		icon: 'file:../piapi.svg',
		group: ['transform'],
		version: 1,
		description: 'Transform images using PiAPI GPT-4o Image Generation API',
		defaults: {
			name: 'GPT-4o Image to Image',
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
				displayName: 'Model',
				name: 'model',
				type: 'options',
				options: [
					{
						name: 'GPT-4o Image',
						value: 'gpt-4o-image',
					},
					{
						name: 'GPT-4o Image Preview (Legacy)',
						value: 'gpt-4o-image-preview',
					},
				],
				default: 'gpt-4o-image', // Set the new model as default
				description: 'The model to use for image transformation',
			},
			{
				displayName: 'Image Source',
				name: 'imageSource',
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
				description: 'The source of the input image',
			},
			{
				displayName: 'Multiple Images Input',
				name: 'multipleImages',
				type: 'boolean',
				default: false,
				description: 'Whether to use multiple images as input (only supported by GPT-4o Image)',
				displayOptions: {
					show: {
						imageSource: ['url'],
						model: ['gpt-4o-image'],
					},
				},
			},
			{
				displayName: 'Additional Image URLs',
				name: 'additionalImageUrls',
				type: 'string',
				typeOptions: {
					multipleValues: true,
				},
				default: [],
				description: 'Additional image URLs to include in the request',
				displayOptions: {
					show: {
						imageSource: ['url'],
						multipleImages: [true],
						model: ['gpt-4o-image'],
					},
				},
			},
			{
				displayName: 'Image URL',
				name: 'imageUrl',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						imageSource: ['url'],
					},
				},
				description: 'URL of the image to transform',
			},
			{
				displayName: 'Binary Property',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						imageSource: ['binaryData'],
					},
				},
				description: 'Name of the binary property containing the image data',
			},
			{
				displayName: 'Prompt',
				name: 'prompt',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				required: true,
				description: 'Text prompt for image transformation',
			},
			{
				displayName: 'Aspect Ratio',
				name: 'aspectRatio',
				type: 'options',
				options: ASPECT_RATIO_OPTIONS,
				default: '1024:1024',
				description: 'Aspect ratio for the output image',
			},
			{
				displayName: 'Custom Width',
				name: 'width',
				type: 'number',
				displayOptions: {
					show: {
						aspectRatio: ['custom'],
					},
				},
				default: 1024,
				description: 'Custom width of the output image',
			},
			{
				displayName: 'Custom Height',
				name: 'height',
				type: 'number',
				displayOptions: {
					show: {
						aspectRatio: ['custom'],
					},
				},
				default: 1024,
				description: 'Custom height of the output image',
			},
			{
				displayName: 'Image Style',
				name: 'imageStyle',
				type: 'options',
				options: LORA_OPTIONS,
				default: 'none',
				description: 'Style to apply to the generated image',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const model = this.getNodeParameter('model', i) as string;
			const prompt = this.getNodeParameter('prompt', i) as string;
			const imageSource = this.getNodeParameter('imageSource', i) as string;

			// Setup image URLs
			let imageUrls: string[] = [];
			
			if (imageSource === 'url') {
				const mainImageUrl = this.getNodeParameter('imageUrl', i) as string;
				imageUrls.push(mainImageUrl);
				
				// Check for multiple images if using gpt-4o-image
				if (model === 'gpt-4o-image') {
					const useMultipleImages = this.getNodeParameter('multipleImages', i, false) as boolean;
					
					if (useMultipleImages) {
						const additionalUrls = this.getNodeParameter('additionalImageUrls', i, []) as string[];
						imageUrls = imageUrls.concat(additionalUrls);
					}
				}
			} else {
				// Binary data
				const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
				const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);

				if (binaryData.mimeType && !binaryData.mimeType.includes('image/')) {
					throw new Error('The provided binary data is not an image');
				}

				// Use binary data URL or convert to base64
				if (binaryData.data) {
					const dataBuffer = Buffer.from(binaryData.data, 'base64');
					imageUrls.push(`data:${binaryData.mimeType};base64,${dataBuffer.toString('base64')}`);
				} else if (binaryData.url) {
					imageUrls.push(binaryData.url as string);
				} else {
					throw new Error('No usable image data found in the provided binary property');
				}
			}

			// GPT-4o requires messages in chat format with image in content
			const messageContent = [];
			
			// Add all image URLs to the content
			for (const url of imageUrls) {
				messageContent.push({
					type: 'image_url',
					image_url: {
						url: url,
					},
				});
			}
			
			// Add the text prompt
			messageContent.push({
				type: 'text',
				text: generatePromptWithAspectRatio(this, i, prompt),
			});
			
			const body = {
				model,
				messages: [
					{
						role: 'user',
						content: messageContent,
					},
				],
				stream: true, // GPT-4o image generation requires stream mode
			};

			try {
				// Call the LLM API endpoint with Bearer token auth
				// For streaming responses, we need to get the raw response
				const credentials = await this.getCredentials('piAPIApi');
				
				const options = {
					method: 'POST' as 'POST',
					body,
					url: 'https://api.piapi.ai/v1/chat/completions',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${credentials.apiKey as string}`,
					},
					json: true,
					returnFullResponse: true, // Get the full response including headers
				};

				// Get the full response as text to process the stream
				const response = await this.helpers.httpRequestWithAuthentication.call(
					this,
					'piAPIApi',
					options,
				);

				// The response will be the raw streamed data
				const rawStreamResponse = response.body;
				
				// Process the streamed response to get complete content
				const processedContent = processStreamedResponse(rawStreamResponse);
				
				// Check if generation failed
				const failed = isGenerationFailed(processedContent);
				const status = failed ? 'failed' : 'completed';
				
				// Create a simplified response
				let simplifiedResponse;
				
				if (failed) {
					const { reason, suggestion } = extractFailureDetails(processedContent);
					simplifiedResponse = {
						prompt,
						status,
						error: {
							reason,
							suggestion,
							full_message: processedContent,
						},
						original_response: rawStreamResponse // Keep original response for reference
					};
				} else {
					// Extract the image URL from the processed content
					const imageUrl = extractImageUrlFromResponse(rawStreamResponse);
					simplifiedResponse = {
						prompt,
						status,
						source_image: imageUrl,
						image_url: imageUrl || null,
						processed_content: processedContent,
						original_response: rawStreamResponse // Keep original response for reference
					};
				}

				returnData.push({
					json: simplifiedResponse,
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
