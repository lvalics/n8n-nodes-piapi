import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';

import { piApiRequest, waitForTaskCompletion } from '../shared/GenericFunctions';
import { LORA_OPTIONS, CONTROLNET_TYPES } from '../shared/Constants';

export class FluxImageToImage implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PiAPI Flux Image to Image',
		name: 'fluxImageToImage',
		icon: 'file:../piapi.svg',
		group: ['transform'],
		version: 1,
		description: 'Transform images using PiAPI Flux Image-to-Image',
		defaults: {
			name: 'Flux Image to Image',
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
				displayName: 'Negative Prompt',
				name: 'negativePrompt',
				type: 'string',
				typeOptions: {
					rows: 2,
				},
				default: '',
				description: 'Negative text prompt for image transformation',
			},
			{
				displayName: 'Denoise Strength',
				name: 'denoiseStrength',
				type: 'number',
				default: 0.7,
				description: 'Determines how much to transform the image (0.0 to 1.0)',
				typeOptions: {
					minValue: 0.01,
					maxValue: 1,
					numberPrecision: 2,
				},
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
					numberPrecision: 1,
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
				displayName: 'Use LoRA',
				name: 'useLora',
				type: 'boolean',
				default: false,
				description: 'Whether to use LoRA model for generation (only available with Flux 1 Dev Advanced model)',
				displayOptions: {
					show: {
						model: ['Qubico/flux1-dev-advanced'],
					},
				},
			},
			{
				displayName: 'LoRA Type',
				name: 'loraType',
				type: 'options',
				displayOptions: {
					show: {
						useLora: [true],
					},
				},
				options: LORA_OPTIONS,
				default: 'none',
				description: 'The LoRA model to use for image generation',
			},
			{
				displayName: 'LoRA Strength',
				name: 'loraStrength',
				type: 'number',
				displayOptions: {
					show: {
						useLora: [true],
					},
				},
				default: 1,
				description: 'Strength of the LoRA effect (0.0 to 1.0)',
				typeOptions: {
					minValue: 0.1,
					maxValue: 1,
					numberPrecision: 2,
				},
			},
			{
				displayName: 'Use ControlNet',
				name: 'useControlNet',
				type: 'boolean',
				default: false,
				description: 'Whether to use ControlNet for generation (only available with Flux 1 Dev Advanced model)',
				displayOptions: {
					show: {
						model: ['Qubico/flux1-dev-advanced'],
					},
				},
			},
			{
				displayName: 'ControlNet Type',
				name: 'controlNetType',
				type: 'options',
				displayOptions: {
					show: {
						useControlNet: [true],
					},
				},
				options: CONTROLNET_TYPES,
				default: 'none',
				description: 'The ControlNet type to use for image generation',
			},
			{
				displayName: 'Control Strength',
				name: 'controlStrength',
				type: 'number',
				displayOptions: {
					show: {
						useControlNet: [true],
					},
				},
				default: 0.5,
				description: 'Strength of the ControlNet effect (0.0 to 1.0)',
				typeOptions: {
					minValue: 0.1,
					maxValue: 1,
					numberPrecision: 2,
				},
			},
			{
				displayName: 'Return Preprocessed Image',
				name: 'returnPreprocessed',
				type: 'boolean',
				displayOptions: {
					show: {
						useControlNet: [true],
					},
				},
				default: false,
				description: 'Whether to return the preprocessed control image',
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
			const denoiseStrength = this.getNodeParameter('denoiseStrength', i, 0.7) as number;
			const guidanceScale = this.getNodeParameter('guidanceScale', i, 3) as number;
			const batchSize = this.getNodeParameter('batchSize', i, 1) as number;
			const useLora = this.getNodeParameter('useLora', i, false) as boolean;
			const loraType = useLora ? this.getNodeParameter('loraType', i, 'none') as string : 'none';
			const loraStrength = useLora ? this.getNodeParameter('loraStrength', i, 1) as number : 1;
			const useControlNet = this.getNodeParameter('useControlNet', i, false) as boolean;
			const controlNetType = useControlNet ? this.getNodeParameter('controlNetType', i, 'none') as string : 'none';
			const controlStrength = useControlNet ? this.getNodeParameter('controlStrength', i, 0.5) as number : 0.5;
			const returnPreprocessed = useControlNet ? this.getNodeParameter('returnPreprocessed', i, false) as boolean : false;
			const waitForCompletion = this.getNodeParameter('waitForCompletion', i, true) as boolean;
			const imageSource = this.getNodeParameter('imageSource', i) as string;
			
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
				
				// If we have binary data URL, use it
				if (binaryData.data) {
					const dataBuffer = Buffer.from(binaryData.data, 'base64');
					
					// Upload to temporary storage or convert to base64 URL
					// For this example, we'll assume the API supports base64 data URLs
					imageUrl = `data:${binaryData.mimeType};base64,${dataBuffer.toString('base64')}`;
				} else if (binaryData.url) {
					imageUrl = binaryData.url as string;
				} else {
					throw new Error('No usable image data found in the provided binary property');
				}
			}

			// Determine task type based on ControlNet/LoRA usage and model
			let taskType = 'img2img';
			if (model === 'Qubico/flux1-dev-advanced') {
				if (useControlNet && controlNetType !== 'none') {
					taskType = 'controlnet-lora';
				} else if (useLora && loraType !== 'none') {
					taskType = 'img2img-lora';
				}
			}
			
			const body: any = {
				model,
				task_type: taskType,
				input: {
					prompt,
					negative_prompt: negativePrompt,
					image: imageUrl,
					denoise: denoiseStrength,
					guidance_scale: guidanceScale,
					batch_size: batchSize,
				},
			};
			
			// Add LoRA settings if using LoRA
			if (useLora && loraType !== 'none') {
				body.input.lora_settings = [
					{
						lora_type: loraType,
						lora_strength: loraStrength,
					},
				];
			}
			
			// Add ControlNet settings if using ControlNet
			if (useControlNet && controlNetType !== 'none') {
				body.input.control_net_settings = [
					{
						control_type: controlNetType,
						control_image: imageUrl,
						control_strength: controlStrength,
						return_preprocessed_image: returnPreprocessed,
					},
				];
			}

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
