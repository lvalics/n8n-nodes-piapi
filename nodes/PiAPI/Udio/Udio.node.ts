import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';

import { piApiRequest, waitForTaskCompletion } from '../shared/GenericFunctions';

export class Udio implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PiAPI Udio',
		name: 'udio',
		icon: 'file:../piapi.svg',
		group: ['transform'],
		version: 1,
		description: 'Generate music using PiAPI Udio',
		defaults: {
			name: 'Udio',
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
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Generate Music',
						value: 'generateMusic',
						description: 'Generate music from text prompt',
					},
					{
						name: 'Generate Lyrics',
						value: 'generateLyrics',
						description: 'Generate lyrics from text prompt',
					},
					{
						name: 'Extend Song',
						value: 'extendSong',
						description: 'Extend an existing song',
					},
				],
				default: 'generateMusic',
			},
			{
				displayName: 'Lyrics Type',
				name: 'lyricsType',
				type: 'options',
				options: [
					{
						name: 'Generate',
						value: 'generate',
						description: 'Generate lyrics based on description',
					},
					{
						name: 'Instrumental',
						value: 'instrumental',
						description: 'Create instrumental music',
					},
					{
						name: 'User Provided',
						value: 'user',
						description: 'Use custom lyrics',
					},
				],
				default: 'generate',
				description: 'How lyrics should be handled',
				displayOptions: {
					show: {
						operation: ['generateMusic', 'extendSong'],
					},
				},
			},
			{
				displayName: 'Description Prompt',
				name: 'gptDescriptionPrompt',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				required: true,
				description: 'Descriptive prompt for music generation (e.g., "night breeze, piano")',
				displayOptions: {
					show: {
						operation: ['generateMusic', 'extendSong'],
						lyricsType: ['generate', 'instrumental'],
					},
				},
			},
			{
				displayName: 'Style Tags',
				name: 'gptDescriptionPromptStyle',
				type: 'string',
				default: '',
				description: 'Style tags for the music (e.g., "jazz, pop")',
				displayOptions: {
					show: {
						operation: ['generateMusic', 'extendSong'],
						lyricsType: ['user'],
					},
				},
			},
			{
				displayName: 'Lyrics',
				name: 'lyrics',
				type: 'string',
				typeOptions: {
					rows: 10,
				},
				default: '',
				required: true,
				description: 'Full lyrics for the song (use [Verse], [Chorus], etc. for structure)',
				displayOptions: {
					show: {
						operation: ['generateMusic', 'extendSong'],
						lyricsType: ['user'],
					},
				},
			},
			{
				displayName: 'Lyrics Prompt',
				name: 'lyricsPrompt',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				required: true,
				description: 'Prompt to guide lyrics generation',
				displayOptions: {
					show: {
						operation: ['generateLyrics'],
					},
				},
			},
			{
				displayName: 'Continue Song ID',
				name: 'continueSongId',
				type: 'string',
				default: '',
				required: true,
				description: 'The song ID to extend',
				displayOptions: {
					show: {
						operation: ['extendSong'],
					},
				},
			},
			{
				displayName: 'Continue At',
				name: 'continueAt',
				type: 'number',
				default: 0,
				description: 'Time position in seconds to continue from',
				displayOptions: {
					show: {
						operation: ['extendSong'],
					},
				},
			},
			{
				displayName: 'Additional Options',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						operation: ['generateMusic', 'extendSong'],
					},
				},
				options: [
					{
						displayName: 'Negative Tags',
						name: 'negativeTags',
						type: 'string',
						default: '',
						description: 'Tags to avoid in the generation (comma-separated)',
					},
					{
						displayName: 'Seed',
						name: 'seed',
						type: 'number',
						default: -1,
						description: 'Seed for reproducible generation (-1 for random)',
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
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const operation = this.getNodeParameter('operation', i) as string;

			try {
				if (operation === 'generateLyrics') {
					const lyricsPrompt = this.getNodeParameter('lyricsPrompt', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i, {});

					const body = {
						model: 'music-u',
						task_type: 'generate_lyrics',
						input: {
							prompt: lyricsPrompt,
						},
						config: {
							service_mode: additionalFields.serviceMode || 'public',
							webhook_config: {
								endpoint: '',
								secret: '',
							},
						},
					};

					const response = await piApiRequest.call(this, 'POST', '/api/v1/task', body);

					let taskResult = response;
					if (additionalFields.waitForCompletion && response.data?.task_id) {
						taskResult = await waitForTaskCompletion.call(this, response.data.task_id);
					}

					returnData.push({
						json: taskResult,
					});
				} else {
					// Generate Music or Extend Song
					const lyricsType = this.getNodeParameter('lyricsType', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i, {});

					const input: any = {
						lyrics_type: lyricsType,
						negative_tags: additionalFields.negativeTags || '',
						seed: additionalFields.seed !== undefined ? additionalFields.seed : -1,
					};

					if (lyricsType === 'generate' || lyricsType === 'instrumental') {
						input.gpt_description_prompt = this.getNodeParameter('gptDescriptionPrompt', i) as string;
					}

					if (lyricsType === 'user') {
						input.lyrics = this.getNodeParameter('lyrics', i) as string;
						input.gpt_description_prompt = this.getNodeParameter('gptDescriptionPromptStyle', i) as string;
					}

					if (operation === 'extendSong') {
						input.continue_song_id = this.getNodeParameter('continueSongId', i) as string;
						input.continue_at = this.getNodeParameter('continueAt', i) as number;
					}

					const body = {
						model: 'music-u',
						task_type: operation === 'extendSong' ? 'generate_music' : 'generate_music',
						input,
						config: {
							service_mode: additionalFields.serviceMode || 'public',
							webhook_config: {
								endpoint: '',
								secret: '',
							},
						},
					};

					const response = await piApiRequest.call(this, 'POST', '/api/v1/task', body);

					let taskResult = response;
					if (additionalFields.waitForCompletion && response.data?.task_id) {
						taskResult = await waitForTaskCompletion.call(this, response.data.task_id);
					}

					returnData.push({
						json: taskResult,
					});
				}
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