import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';

import { llmApiRequest, waitForTaskCompletion } from '../shared/GenericFunctions';
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
			const aspectRatio = this.getNodeParameter('aspectRatio', i, '1:1') as string;
			const waitForCompletion = this.getNodeParameter('waitForCompletion', i, true) as boolean;

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
