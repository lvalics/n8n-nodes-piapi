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
  processStreamedResponse,
  extractProgressPercentage
} from '../shared/GenericFunctions';
import { ASPECT_RATIO_OPTIONS, LORA_OPTIONS } from '../shared/Constants';


export class LLMTextToImage implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PiAPI GPT-4o Text to Image',
		name: 'llmTextToImage',
		icon: 'file:../piapi.svg',
		group: ['transform'],
		version: 1,
		description: 'Generate images using PiAPI GPT-4o Image Generation',
		defaults: {
			name: 'GPT-4o Text to Image',
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
						name: 'GPT-4o Image Preview',
						value: 'gpt-4o-image-preview',
					},
				],
				default: 'gpt-4o-image-preview',
				description: 'The model to use for image generation',
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
				description: 'Text prompt for image generation',
			},
			{
				displayName: 'Aspect Ratio',
				name: 'aspectRatio',
				type: 'options',
				options: ASPECT_RATIO_OPTIONS,
				default: '1024:1024',
				description: 'Aspect ratio for the generated image',
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
				description: 'Custom width of the generated image',
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
				description: 'Custom height of the generated image',
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
			const aspectRatio = this.getNodeParameter('aspectRatio', i, '1:1') as string;

			// GPT-4o requires messages in chat format
			const body = {
				model,
				messages: [
					{
						role: 'user',
						content: prompt,
					},
				],
				stream: true, // GPT-4o image preview requires stream mode
			};

			// Get image style if specified
			const imageStyle = this.getNodeParameter('imageStyle', i, 'none') as string;

			// Determine aspect ratio to include in the prompt
			let aspectRatioText = '';

			if (aspectRatio === 'custom') {
				const width = this.getNodeParameter('width', i, 1024) as number;
				const height = this.getNodeParameter('height', i, 1024) as number;
				aspectRatioText = `Image size: ${width}x${height}. `;
			} else if (aspectRatio !== 'square_header' && aspectRatio !== 'landscape_header' && aspectRatio !== 'portrait_header') {
				aspectRatioText = `Image size: ${aspectRatio}. `;
			}

			// Add style to the prompt if selected
			let styleText = '';
			if (imageStyle !== 'none') {
				styleText = `Image style: ${imageStyle}. `;
			}

			// Add aspect ratio and style to the prompt text
			body.messages[0].content = `${aspectRatioText}${styleText}${prompt}`;

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
				
				// Extract progress information
				const progressPercentage = extractProgressPercentage(rawStreamResponse);
				
				if (failed) {
					const { reason, suggestion } = extractFailureDetails(processedContent);
					simplifiedResponse = {
						prompt,
						status,
						progress: progressPercentage,  // Add progress information
						progress_display: `${progressPercentage}%`,  // Formatted for display
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
						image_url: imageUrl || null,
						progress: progressPercentage,  // Add progress information
						progress_display: `${progressPercentage}%`,  // Formatted for display
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
