import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';

import { piApiRequest, waitForTaskCompletion } from '../shared/GenericFunctions';
import { WANX_MODELS, GHIBLI_STYLE_OPTIONS } from '../shared/Constants';

export class WanXTextToVideo implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PiAPI WanX Text to Video',
		name: 'wanXTextToVideo',
		icon: 'file:../piapi.svg',
		group: ['transform'],
		version: 1,
		description: 'Generate videos from text using PiAPI WanX',
		defaults: {
			name: 'WanX Text to Video',
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
				options: WANX_MODELS.filter(model => model.value.includes('txt2video')),
				default: 'txt2video-1.3b',
				description: 'The WanX model to use for video generation',
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
				displayName: 'Ghibli Style',
				name: 'ghibliStyle',
				type: 'options',
				options: GHIBLI_STYLE_OPTIONS,
				default: 'ghibli',
				description: 'Studio Ghibli animation style to use',
				displayOptions: {
					show: {
						model: ['txt2video-14b-lora'],
					},
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
			const prompt = this.getNodeParameter('prompt', i) as string;
			const negativePrompt = this.getNodeParameter('negativePrompt', i, '') as string;
			const model = this.getNodeParameter('model', i) as string;
			const aspectRatio = this.getNodeParameter('aspectRatio', i) as string;
			const waitForCompletion = this.getNodeParameter('waitForCompletion', i, true) as boolean;

			const body: any = {
				model: 'Qubico/wanx',
				task_type: model,
				input: {
					prompt,
					negative_prompt: negativePrompt,
					aspect_ratio: aspectRatio,
					video_resolution: '480P',
				},
			};

			// Add lora_type for Ghibli style videos
			if (model === 'txt2video-14b-lora') {
				const ghibliStyle = this.getNodeParameter('ghibliStyle', i) as string;
				body.input.lora_type = ghibliStyle;
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
