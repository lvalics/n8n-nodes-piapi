import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';

import { piApiRequest, waitForTaskCompletion } from '../shared/GenericFunctions';
import { WANX_MODELS } from '../shared/Constants';

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
				options: WANX_MODELS.filter(model => model.value === 'img2video-14b'),
				default: 'img2video-14b',
				description: 'The WanX model to use for image-to-video generation',
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
				description: 'Direct URL to the image (must be a publicly accessible image file)',
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
			const imageSource = this.getNodeParameter('imageSource', i) as string;

			let imageBase64 = '';

			// Get image from source
			if (imageSource === 'url') {
				const imageUrl = this.getNodeParameter('imageUrl', i) as string;

				// Validate URL
				try {
					new URL(imageUrl);

					// Download the image instead of passing the URL directly
					try {
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
				} catch (error) {
					throw new Error(`Invalid image URL: ${error.message}`);
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

			const body = {
				model: 'Qubico/wanx',
				task_type: model,
				input: {
					prompt,
					negative_prompt: negativePrompt,
					image: imageBase64,
					aspect_ratio: aspectRatio,
					video_resolution: '480P',
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
