import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';

import { piApiRequest, waitForTaskCompletion } from '../shared/GenericFunctions';
import { WANX_MODELS, GHIBLI_STYLE_OPTIONS } from '../shared/Constants';

export class WanXImageToVideo implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PiAPI WanX Image to Video',
		name: 'wanXImageToVideo',
		icon: 'file:../piapi.svg',
		group: ['transform'],
		version: 1,
		description: 'Generate videos from images using PiAPI WanX',
		defaults: {
			name: 'WanX Image to Video',
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
				displayName: 'Prompt',
				name: 'prompt',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				required: true,
				description: 'Descriptive prompt for video generation',
			},
			{
				displayName: 'Negative Prompt',
				name: 'negativePrompt',
				type: 'string',
				typeOptions: {
					rows: 2,
				},
				default: '',
				description: 'Things to exclude from the video generation',
			},
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				options: WANX_MODELS.filter(model => 
					model.value === 'img2video-14b' || 
					model.value === 'img2video-14b-keyframe' ||
					model.value === 'img2video-14b-lora'
				),
				default: 'img2video-14b',
				description: 'The WanX model to use for image-to-video generation',
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
						model: ['img2video-14b', 'img2video-14b-lora'],
					},
				},
				description: 'Direct URL to the image (must be a publicly accessible image file)',
			},
			{
				displayName: 'First Frame Source',
				name: 'firstFrameSource',
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
				description: 'The source of the first frame image',
				displayOptions: {
					show: {
						model: ['img2video-14b-keyframe'],
					},
				},
			},
			{
				displayName: 'Last Frame Source',
				name: 'lastFrameSource',
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
				description: 'The source of the last frame image',
				displayOptions: {
					show: {
						model: ['img2video-14b-keyframe'],
					},
				},
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
						model: ['img2video-14b', 'img2video-14b-lora'],
					},
				},
				description: 'Name of the binary property containing the image data',
			},
			{
				displayName: 'First Frame URL',
				name: 'firstFrameUrl',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						firstFrameSource: ['url'],
						model: ['img2video-14b-keyframe'],
					},
				},
				description: 'Direct URL to the first frame image (must be a publicly accessible image file)',
			},
			{
				displayName: 'Last Frame URL',
				name: 'lastFrameUrl',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						lastFrameSource: ['url'],
						model: ['img2video-14b-keyframe'],
					},
				},
				description: 'Direct URL to the last frame image (must be a publicly accessible image file)',
			},
			{
				displayName: 'First Frame Binary Property',
				name: 'firstFrameBinaryPropertyName',
				type: 'string',
				default: 'firstFrame',
				required: true,
				displayOptions: {
					show: {
						firstFrameSource: ['binaryData'],
						model: ['img2video-14b-keyframe'],
					},
				},
				description: 'Name of the binary property containing the first frame image data',
			},
			{
				displayName: 'Last Frame Binary Property',
				name: 'lastFrameBinaryPropertyName',
				type: 'string',
				default: 'lastFrame',
				required: true,
				displayOptions: {
					show: {
						lastFrameSource: ['binaryData'],
						model: ['img2video-14b-keyframe'],
					},
				},
				description: 'Name of the binary property containing the last frame image data',
			},
			{
				displayName: 'Aspect Ratio',
				name: 'aspectRatio',
				type: 'options',
				options: [
					{
						name: 'Landscape (16:9)',
						value: '16:9',
					},
					{
						name: 'Portrait (9:16)',
						value: '9:16',
					}
				],
				default: '16:9',
				description: 'Aspect ratio of the generated video',
			},
			{
				displayName: 'Use LoRA',
				name: 'useLoRA',
				type: 'boolean',
				default: true,
				description: 'Whether to use LoRA for style control',
				displayOptions: {
					show: {
						model: ['img2video-14b-lora'],
					},
				},
			},
			{
				displayName: 'LoRA Type',
				name: 'loraType',
				type: 'options',
				options: GHIBLI_STYLE_OPTIONS,
				default: 'ghibli',
				description: 'Style type to apply using LoRA',
				displayOptions: {
					show: {
						model: ['img2video-14b-lora'],
						useLoRA: [true],
					},
				},
			},
			{
				displayName: 'LoRA Strength',
				name: 'loraStrength',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 1,
					stepSize: 0.1,
				},
				default: 1,
				description: 'Controls the intensity of LoRA influence (0.0-1.0)',
				displayOptions: {
					show: {
						model: ['img2video-14b-lora'],
						useLoRA: [true],
					},
				},
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
				displayOptions: {
					show: {
						model: ['img2video-14b', 'img2video-14b-lora'],
					},
				},
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
			const prompt = this.getNodeParameter('prompt', i) as string;
			const negativePrompt = this.getNodeParameter('negativePrompt', i, '') as string;
			const model = this.getNodeParameter('model', i, 'img2video-14b') as string;
			const aspectRatio = this.getNodeParameter('aspectRatio', i) as string;
			const waitForCompletion = this.getNodeParameter('waitForCompletion', i, false) as boolean;
			let body: {
				model: string,
				task_type: string,
				input: {
					prompt: string,
					negative_prompt: string,
					aspect_ratio: string,
					video_resolution: string,
					image?: string,
					first_frame?: string,
					last_frame?: string,
					lora_settings?: Array<{
						lora_type: string,
						lora_strength: number
					}>,
				},
			};

			// Set up body with common properties
			body = {
				model: 'Qubico/wanx',
				task_type: model,
				input: {
					prompt,
					negative_prompt: negativePrompt,
					aspect_ratio: aspectRatio,
					video_resolution: '480P',
				},
			};

			if (model === 'img2video-14b' || model === 'img2video-14b-lora') {
				// Standard image to video flow
				const imageSource = this.getNodeParameter('imageSource', i) as string;
				let imageBase64 = '';

				// Get image from source
				if (imageSource === 'url') {
					const imageUrl = this.getNodeParameter('imageUrl', i) as string;

					// Validate URL and download image
					try {
						new URL(imageUrl);

						const imageResponse = await this.helpers.request({
							method: 'GET',
							url: imageUrl,
							encoding: null,
							resolveWithFullResponse: true,
						});
						// Convert to base64
						const buffer = Buffer.from(imageResponse.body as Buffer);
						const contentType = imageResponse.headers['content-type'] || 'image/png';
						imageBase64 = `data:${contentType};base64,${buffer.toString('base64')}`;
					} catch (error) {
						throw new Error(`Failed to download image from URL: ${error.message}`);
					}
				} else {
					// Binary data handling
					const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
					const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);

					// Check MIME type
					if (binaryData.mimeType && !binaryData.mimeType.includes('image/')) {
						throw new Error('The provided binary data is not an image. Please provide valid image data.');
					}

					if (binaryData.data) {
						// Directly use the binary data
						imageBase64 = `data:${binaryData.mimeType};base64,${binaryData.data}`;
					} else if (binaryData.url) {
						// If we have a URL in binary data, download it
						try {
							const imageResponse = await this.helpers.request({
								method: 'GET',
								url: binaryData.url as string,
								encoding: null,
								resolveWithFullResponse: true,
							});

							const buffer = Buffer.from(imageResponse.body as Buffer);
							const contentType = imageResponse.headers['content-type'] || 'image/png';
							imageBase64 = `data:${contentType};base64,${buffer.toString('base64')}`;
						} catch (error) {
							throw new Error(`Failed to download image from binary URL: ${error.message}`);
						}
					} else {
						throw new Error('Could not extract image from binary data. Missing URL or data.');
					}
				}

				// Add the single image to the input parameters
				body.input.image = imageBase64;
			}
			
			// Add lora_settings for styled videos
			if (model === 'img2video-14b-lora') {
				const useLoRA = this.getNodeParameter('useLoRA', i, true) as boolean;
				if (useLoRA) {
					const loraType = this.getNodeParameter('loraType', i) as string;
					const loraStrength = this.getNodeParameter('loraStrength', i, 1) as number;
					
					body.input.lora_settings = [
						{
							lora_type: loraType,
							lora_strength: loraStrength,
						},
					];
				}
			} else if (model === 'img2video-14b-keyframe') {
				// Keyframe mode - need first and last frame
				const firstFrameSource = this.getNodeParameter('firstFrameSource', i) as string;
				const lastFrameSource = this.getNodeParameter('lastFrameSource', i) as string;
				
				// Process first frame
				let firstFrameBase64 = '';
				if (firstFrameSource === 'url') {
					const firstFrameUrl = this.getNodeParameter('firstFrameUrl', i) as string;
					try {
						new URL(firstFrameUrl);
						const imageResponse = await this.helpers.request({
							method: 'GET',
							url: firstFrameUrl,
							encoding: null,
							resolveWithFullResponse: true,
						});
						const buffer = Buffer.from(imageResponse.body as Buffer);
						const contentType = imageResponse.headers['content-type'] || 'image/png';
						firstFrameBase64 = `data:${contentType};base64,${buffer.toString('base64')}`;
					} catch (error) {
						throw new Error(`Failed to download first frame image: ${error.message}`);
					}
				} else {
					// Binary data for first frame
					const binaryPropertyName = this.getNodeParameter('firstFrameBinaryPropertyName', i) as string;
					const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
					
					if (binaryData.mimeType && !binaryData.mimeType.includes('image/')) {
						throw new Error('The provided first frame binary data is not an image.');
					}

					if (binaryData.data) {
						firstFrameBase64 = `data:${binaryData.mimeType};base64,${binaryData.data}`;
					} else if (binaryData.url) {
						try {
							const imageResponse = await this.helpers.request({
								method: 'GET',
								url: binaryData.url as string,
								encoding: null,
								resolveWithFullResponse: true,
							});
							const buffer = Buffer.from(imageResponse.body as Buffer);
							const contentType = imageResponse.headers['content-type'] || 'image/png';
							firstFrameBase64 = `data:${contentType};base64,${buffer.toString('base64')}`;
						} catch (error) {
							throw new Error(`Failed to download first frame from binary URL: ${error.message}`);
						}
					} else {
						throw new Error('Could not extract first frame from binary data.');
					}
				}
				
				// Process last frame
				let lastFrameBase64 = '';
				if (lastFrameSource === 'url') {
					const lastFrameUrl = this.getNodeParameter('lastFrameUrl', i) as string;
					try {
						new URL(lastFrameUrl);
						const imageResponse = await this.helpers.request({
							method: 'GET',
							url: lastFrameUrl,
							encoding: null,
							resolveWithFullResponse: true,
						});
						const buffer = Buffer.from(imageResponse.body as Buffer);
						const contentType = imageResponse.headers['content-type'] || 'image/png';
						lastFrameBase64 = `data:${contentType};base64,${buffer.toString('base64')}`;
					} catch (error) {
						throw new Error(`Failed to download last frame image: ${error.message}`);
					}
				} else {
					// Binary data for last frame
					const binaryPropertyName = this.getNodeParameter('lastFrameBinaryPropertyName', i) as string;
					const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
					
					if (binaryData.mimeType && !binaryData.mimeType.includes('image/')) {
						throw new Error('The provided last frame binary data is not an image.');
					}

					if (binaryData.data) {
						lastFrameBase64 = `data:${binaryData.mimeType};base64,${binaryData.data}`;
					} else if (binaryData.url) {
						try {
							const imageResponse = await this.helpers.request({
								method: 'GET',
								url: binaryData.url as string,
								encoding: null,
								resolveWithFullResponse: true,
							});
							const buffer = Buffer.from(imageResponse.body as Buffer);
							const contentType = imageResponse.headers['content-type'] || 'image/png';
							lastFrameBase64 = `data:${contentType};base64,${buffer.toString('base64')}`;
						} catch (error) {
							throw new Error(`Failed to download last frame from binary URL: ${error.message}`);
						}
					} else {
						throw new Error('Could not extract last frame from binary data.');
					}
				}
				
				// Add the first and last frames to the input parameters
				body.input.first_frame = firstFrameBase64;
				body.input.last_frame = lastFrameBase64;
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
