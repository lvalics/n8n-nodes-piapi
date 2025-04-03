import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';

import { llmApiRequest, waitForTaskCompletion } from '../shared/GenericFunctions';
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
		description: 'Transform images using PiAPI GPT-4o Image Generation',
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
						name: 'GPT-4o Image Preview',
						value: 'gpt-4o-image-preview',
					},
				],
				default: 'gpt-4o-image-preview',
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
			{
				displayName: 'Wait for Completion',
				name: 'waitForCompletion',
				type: 'boolean',
				default: false,
				description: 'Wait for task to complete and return results',
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
			const waitForCompletion = this.getNodeParameter('waitForCompletion', i, true) as boolean;

			let imageUrl = '';

			if (imageSource === 'url') {
				imageUrl = this.getNodeParameter('imageUrl', i) as string;
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
					imageUrl = `data:${binaryData.mimeType};base64,${dataBuffer.toString('base64')}`;
				} else if (binaryData.url) {
					imageUrl = binaryData.url as string;
				} else {
					throw new Error('No usable image data found in the provided binary property');
				}
			}

			// GPT-4o requires messages in chat format with image in content
			const body = {
				model,
				messages: [
					{
						role: 'user',
						content: [
							{
								type: 'image_url',
								image_url: {
									url: imageUrl,
								},
							},
							{
								type: 'text',
								text: generatePromptWithAspectRatio(this, i, prompt),
							},
						],
					},
				],
				stream: true, // GPT-4o image preview requires stream mode
			};

			try {
				// Call the LLM API endpoint with Bearer token auth
				const response = await llmApiRequest.call(this, body);

				let taskResult = response;

				// If we need to wait for completion, poll until the task is done
				if (waitForCompletion && response.data?.task_id) {
					taskResult = await waitForTaskCompletion.call(this, response.data.task_id);
				}

				returnData.push({
					json: taskResult,
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
