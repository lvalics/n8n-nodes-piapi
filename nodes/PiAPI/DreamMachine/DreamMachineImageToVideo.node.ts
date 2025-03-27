import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';

import { piApiRequest, waitForTaskCompletion } from '../shared/GenericFunctions';

export class DreamMachineImageToVideo implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PiAPI Dream Machine Image to Video',
		name: 'dreamMachineImageToVideo',
		icon: 'file:../piapi.svg',
		group: ['transform'],
		version: 1,
		description: 'Generate videos from images using PiAPI Dream Machine',
		defaults: {
			name: 'Dream Machine Image to Video',
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
				description: 'URL of the image to transform into video',
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
				displayName: 'Frame Position',
				name: 'framePosition',
				type: 'options',
				options: [
					{
						name: 'First Frame (frame0)',
						value: 'frame0',
					},
					{
						name: 'Last Frame (frame1)',
						value: 'frame1',
					},
				],
				default: 'frame0',
				description: 'Position of the image in the video sequence',
			},
			{
				displayName: 'Model Name',
				name: 'modelName',
				type: 'options',
				options: [
					{
						name: 'Ray v1',
						value: 'ray-v1',
					},
					{
						name: 'Ray v2',
						value: 'ray-v2',
					},
				],
				default: 'ray-v1',
				description: 'The model to use for video generation',
			},
			{
				displayName: 'Duration',
				name: 'duration',
				type: 'options',
				options: [
					{
						name: '5 seconds',
						value: 5,
					},
				],
				default: 5,
				description: 'Duration of the generated video in seconds',
			},
			{
				displayName: 'Aspect Ratio',
				name: 'aspectRatio',
				type: 'options',
				options: [
					{
						name: 'Portrait (9:16)',
						value: '9:16',
					},
					{
						name: 'Portrait (3:4)',
						value: '3:4',
					},
					{
						name: 'Square (1:1)',
						value: '1:1',
					},
					{
						name: 'Landscape (4:3)',
						value: '4:3',
					},
					{
						name: 'Landscape (16:9)',
						value: '16:9',
					},
					{
						name: 'Cinematic (21:9)',
						value: '21:9',
					},
				],
				default: '16:9',
				description: 'Aspect ratio of the generated video',
			},
			{
				displayName: 'Service Mode',
				name: 'serviceMode',
				type: 'options',
				options: [
					{
						name: 'Default (User Workspace Setting)',
						value: '',
					},
					{
						name: 'Pay-as-you-go (PAYG)',
						value: 'public',
					},
					{
						name: 'Host-your-account (HYA)',
						value: 'private',
					},
				],
				default: '',
				description: 'The service mode for processing the task',
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
			const prompt = this.getNodeParameter('prompt', i) as string;
			const modelName = this.getNodeParameter('modelName', i) as string;
			const duration = this.getNodeParameter('duration', i) as number;
			const aspectRatio = this.getNodeParameter('aspectRatio', i) as string;
			const serviceMode = this.getNodeParameter('serviceMode', i) as string;
			const waitForCompletion = this.getNodeParameter('waitForCompletion', i, true) as boolean;
			const imageSource = this.getNodeParameter('imageSource', i) as string;
			const framePosition = this.getNodeParameter('framePosition', i) as string;

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
					imageUrl = `data:${binaryData.mimeType};base64,${dataBuffer.toString('base64')}`;
				} else if (binaryData.url) {
					imageUrl = binaryData.url as string;
				} else {
					throw new Error('No usable image data found in the provided binary property');
				}
			}

			const keyFrames: any = {};
			keyFrames[framePosition] = {
				type: 'image',
				url: imageUrl,
			};

			const body = {
				model: 'luma',
				task_type: 'video_generation',
				input: {
					prompt,
					key_frames: keyFrames,
					model_name: modelName,
					duration,
					aspect_ratio: aspectRatio,
				},
				config: {
					service_mode: serviceMode,
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
