import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';

import { piApiRequest, waitForTaskCompletion } from '../shared/GenericFunctions';

export class DreamMachineTextToVideo implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PiAPI Dream Machine Text to Video',
		name: 'dreamMachineTextToVideo',
		icon: 'file:../piapi.svg',
		group: ['transform'],
		version: 1,
		description: 'Generate videos using PiAPI Dream Machine Text-to-Video',
		defaults: {
			name: 'Dream Machine Text to Video',
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
					{
						name: '10 seconds',
						value: 10,
						description: 'Only available for text-to-video',
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
			const duration = this.getNodeParameter('duration', i) as number;
			const aspectRatio = this.getNodeParameter('aspectRatio', i) as string;
			const serviceMode = this.getNodeParameter('serviceMode', i) as string;
			const waitForCompletion = this.getNodeParameter('waitForCompletion', i, true) as boolean;

			const body = {
				model: 'luma',
				task_type: 'video_generation',
				input: {
					prompt,
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
