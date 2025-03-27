import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';

import { piApiRequest, waitForTaskCompletion } from '../shared/GenericFunctions';
import { ASPECT_RATIO_OPTIONS } from '../shared/Constants';

export class FluxTextToImage implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PiAPI Flux Text to Image',
		name: 'fluxTextToImage',
		icon: 'file:../piapi.svg',
		group: ['transform'],
		version: 1,
		description: 'Generate images using PiAPI Flux Text-to-Image',
		defaults: {
			name: 'Flux Text to Image',
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
						name: 'Flux 1 Dev',
						value: 'Qubico/flux1-dev',
					},
					{
						name: 'Flux 1 Schnell',
						value: 'Qubico/flux1-schnell',
					},
					{
						name: 'Flux 1 Dev Advanced',
						value: 'Qubico/flux1-dev-advanced',
					},
				],
				default: 'Qubico/flux1-dev',
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
				displayName: 'Negative Prompt',
				name: 'negativePrompt',
				type: 'string',
				typeOptions: {
					rows: 2,
				},
				default: '',
				description: 'Negative text prompt for image generation',
			},
			{
				displayName: 'Aspect Ratio',
				name: 'aspectRatio',
				type: 'options',
				options: ASPECT_RATIO_OPTIONS,
				default: '1024:1024',
				description: 'Select a predefined aspect ratio for the output image',
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
				displayName: 'Guidance Scale',
				name: 'guidanceScale',
				type: 'number',
				default: 3,
				description: 'Guidance scale for image generation. Higher values improve prompt adherence but may reduce image quality.',
				typeOptions: {
					minValue: 1.5,
					maxValue: 5,
				},
			},
			{
				displayName: 'Batch Size',
				name: 'batchSize',
				type: 'number',
				default: 1,
				description: 'Number of images to generate. Only works for Flux 1 Schnell model.',
				typeOptions: {
					minValue: 1,
					maxValue: 4,
				},
			},
			{
				displayName: 'Wait for Completion',
				name: 'waitForCompletion',
				type: 'boolean',
				default: true,
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
			const negativePrompt = this.getNodeParameter('negativePrompt', i, '') as string;
			const aspectRatio = this.getNodeParameter('aspectRatio', i) as string;
			const guidanceScale = this.getNodeParameter('guidanceScale', i, 3) as number;
			const batchSize = this.getNodeParameter('batchSize', i, 1) as number;
			const waitForCompletion = this.getNodeParameter('waitForCompletion', i, true) as boolean;

			// Parse width and height from aspect ratio or use custom values
			let width = 1024;
			let height = 1024;

			if (aspectRatio === 'custom') {
				width = this.getNodeParameter('width', i, 1024) as number;
				height = this.getNodeParameter('height', i, 1024) as number;
			} else if (aspectRatio !== 'square_header' && aspectRatio !== 'landscape_header' && aspectRatio !== 'portrait_header') {
				const [w, h] = aspectRatio.split(':').map(Number);
				width = w;
				height = h;
			}

			const body = {
				model,
				task_type: 'txt2img',
				input: {
					prompt,
					negative_prompt: negativePrompt,
					width,
					height,
					guidance_scale: guidanceScale,
					batch_size: batchSize,
				},
			};

			try {
				// Create the task
				const response = await piApiRequest.call(this, 'POST', '/api/v1/task', body);

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
