import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';

import { piApiRequest, waitForTaskCompletion } from '../shared/GenericFunctions';

export class DreamMachineExtendVideo implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PiAPI Dream Machine Extend Video',
		name: 'dreamMachineExtendVideo',
		icon: 'file:../piapi.svg',
		group: ['transform'],
		version: 1,
		description: 'Extend existing videos using PiAPI Dream Machine',
		defaults: {
			name: 'Dream Machine Extend Video',
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
				description: 'Descriptive prompt for video extension',
			},
			{
				displayName: 'Video Source',
				name: 'videoSource',
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
				description: 'The source of the input video',
			},
			{
				displayName: 'Video URL',
				name: 'videoUrl',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						videoSource: ['url'],
					},
				},
				description: 'URL of the video to extend',
			},
			{
				displayName: 'Binary Property',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						videoSource: ['binaryData'],
					},
				},
				description: 'Name of the binary property containing the video data',
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
				description: 'The model to use for video extension',
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
			const modelName = this.getNodeParameter('modelName', i) as string;
			const aspectRatio = this.getNodeParameter('aspectRatio', i) as string;
			const serviceMode = this.getNodeParameter('serviceMode', i) as string;
			const waitForCompletion = this.getNodeParameter('waitForCompletion', i, true) as boolean;
			const videoSource = this.getNodeParameter('videoSource', i) as string;

			let videoUrl = '';

			if (videoSource === 'url') {
				videoUrl = this.getNodeParameter('videoUrl', i) as string;
			} else {
				// Binary data
				const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
				const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);

				if (binaryData.mimeType && !binaryData.mimeType.includes('video/')) {
					throw new Error('The provided binary data is not a video');
				}

				// If we have binary data URL, use it
				if (binaryData.data) {
					const dataBuffer = Buffer.from(binaryData.data, 'base64');

					// Upload to temporary storage or convert to base64 URL
					videoUrl = `data:${binaryData.mimeType};base64,${dataBuffer.toString('base64')}`;
				} else if (binaryData.url) {
					videoUrl = binaryData.url as string;
				} else {
					throw new Error('No usable video data found in the provided binary property');
				}
			}

			const body = {
				model: 'luma',
				task_type: 'extend_video',
				input: {
					prompt,
					key_frames: {
						frame0: {
							type: 'video',
							url: videoUrl,
						},
					},
					model_name: modelName,
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
