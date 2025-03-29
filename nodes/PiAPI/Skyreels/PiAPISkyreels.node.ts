import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
	NodeOperationError,
	IDataObject,
} from 'n8n-workflow';

import { piApiRequest, waitForTaskCompletion as waitForTask } from '../shared/GenericFunctions';
import { SkyreelsImageToVideoParams } from '../shared/Interfaces';

export class PiAPISkyreels implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PiAPI Skyreels',
		name: 'piAPISkyreels',
		icon: 'file:../piapi.svg',
		group: ['transform'],
		version: 1,
		description: 'Create videos from images using Skyreels (ONLY works with human subjects)',
		defaults: {
			name: 'PiAPI Skyreels',
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
				displayName: 'Important Image Requirements',
				name: 'imageRequirements',
				type: 'notice',
				default: '⚠️ This model ONLY works properly with human faces and subjects. Animals, objects, and landscapes will likely fail. For best results, provide clear images of people with good lighting and minimal background distractions.',
				displayOptions: {
					show: {
						operation: ['imageToVideo'],
					},
				},
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Image to Video',
						value: 'imageToVideo',
						description: 'Convert a static image to video',
						action: 'Convert a static image to video',
					},
				],
				default: 'imageToVideo',
			},
			{
				displayName: 'Image Source',
				name: 'imageSource',
				type: 'options',
				options: [
					{
						name: 'URL',
						value: 'url',
						description: 'Use an image URL',
					},
					{
						name: 'Binary Data',
						value: 'binaryData',
						description: 'Use binary data from previous node',
					},
				],
				default: 'url',
				description: 'The source of the image',
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
				description: 'URL of the image to use',
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
				default: 'FPS-24, a person with natural movements and facial expressions',
				required: true,
				description: 'Description to guide the video generation process',
			},
			{
				displayName: 'Negative Prompt',
				name: 'negativePrompt',
				type: 'string',
				default: 'chaotic, distortion, morphing',
				description: 'What to exclude from the video generation',
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
					},
					{
						name: 'Square (1:1)',
						value: '1:1',
					},
				],
				default: '16:9',
				description: 'The aspect ratio of the generated video',
			},
			{
				displayName: 'Guidance Scale',
				name: 'guidanceScale',
				type: 'number',
				typeOptions: {
					minValue: 0.1,
					maxValue: 10,
				},
				default: 3.5,
				description: 'Controls how closely the video adheres to your prompt',
			},
			{
				displayName: 'Wait For Task Completion',
				name: 'waitForTaskCompletion',
				type: 'boolean',
				default: false,
				description: 'Whether to wait for the task to complete before returning',
			},
			{
				displayName: 'Maximum Retry Count',
				name: 'maxRetries',
				type: 'number',
				displayOptions: {
					show: {
						waitForTaskCompletion: [true],
					},
				},
				default: 20,
				description: 'Maximum number of times to check for task completion (with 3-second intervals)',
			},
			{
				displayName: 'Return Only Video URL',
				name: 'returnOnlyVideoUrl',
				type: 'boolean',
				default: false,
				description: 'Whether to return only the video URL instead of the full task data',
			},
			{
				displayName: 'Return Binary Data',
				name: 'returnBinaryData',
				type: 'boolean',
				default: false,
				description: 'Whether to return the video as binary data',
			},
			{
				displayName: 'Binary Property (For Output)',
				name: 'binaryPropertyOutput',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						returnBinaryData: [true],
					},
				},
				description: 'Name of the binary property to which to write the video data',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;

				if (operation === 'imageToVideo') {
					const imageSource = this.getNodeParameter('imageSource', i) as string;
					let imageUrl = '';

					if (imageSource === 'url') {
						imageUrl = this.getNodeParameter('imageUrl', i) as string;
					} else {
						// Handle binary data
						const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
						const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
						
						if (binaryData.mimeType && !binaryData.mimeType.includes('image/')) {
							throw new NodeOperationError(
								this.getNode(),
								'The provided binary data is not an image',
								{ itemIndex: i },
							);
						}

						// Convert to data URL
						const dataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
						const base64Image = dataBuffer.toString('base64');
						const mimeType = binaryData.mimeType || 'image/jpeg';
						imageUrl = `data:${mimeType};base64,${base64Image}`;
					}

					const prompt = this.getNodeParameter('prompt', i) as string;
					const negativePrompt = this.getNodeParameter('negativePrompt', i, '') as string;
					const aspectRatio = this.getNodeParameter('aspectRatio', i) as string;
					const guidanceScale = this.getNodeParameter('guidanceScale', i) as number;
					const waitForTaskCompletion = this.getNodeParameter('waitForTaskCompletion', i, true) as boolean;
					const maxRetries = waitForTaskCompletion ? (this.getNodeParameter('maxRetries', i, 20) as number) : 0;
					const returnOnlyVideoUrl = this.getNodeParameter('returnOnlyVideoUrl', i, false) as boolean;
					const returnBinaryData = this.getNodeParameter('returnBinaryData', i, false) as boolean;
					const binaryPropertyOutput = returnBinaryData
						? (this.getNodeParameter('binaryPropertyOutput', i) as string)
						: '';

					const requestBody: SkyreelsImageToVideoParams = {
						model: 'Qubico/skyreels',
						task_type: 'img2video',
						input: {
							prompt,
							image: imageUrl,
							aspect_ratio: aspectRatio,
							guidance_scale: guidanceScale,
						},
					};

					if (negativePrompt) {
						requestBody.input.negative_prompt = negativePrompt;
					}

					// Make the request
					const response = await piApiRequest.call(this, 'POST', '/api/v1/task', requestBody as unknown as IDataObject);

					let taskResponse = response;

					// If waiting for completion
					if (waitForTaskCompletion) {
						const taskId = response.data?.task_id;
						if (!taskId) {
							throw new NodeOperationError(this.getNode(), 'No task ID returned from API');
						}

						taskResponse = await waitForTask.call(this, taskId, maxRetries);
					}

					// Process response according to return options
					if (returnOnlyVideoUrl) {
						const videoUrl = taskResponse.data?.output?.video_url;
						if (videoUrl) {
							returnData.push({
								json: {
									videoUrl,
									taskId: taskResponse.data?.task_id,
									status: taskResponse.data?.status,
								},
							});
						} else {
							returnData.push({
								json: {
									error: 'Video URL not available',
									taskId: taskResponse.data?.task_id,
									status: taskResponse.data?.status,
								},
							});
						}
					} else if (returnBinaryData && waitForTaskCompletion) {
						const videoUrl = taskResponse.data?.output?.video_url;
						if (videoUrl) {
							// Download the video and return as binary data
							const videoData = await this.helpers.request({
								method: 'GET',
								url: videoUrl,
								encoding: null,
								resolveWithFullResponse: true,
							});

							const newItem: INodeExecutionData = {
								json: taskResponse.data,
								binary: {},
							};

							if (newItem.binary) {
								newItem.binary[binaryPropertyOutput] = await this.helpers.prepareBinaryData(
									Buffer.from(videoData.body as Buffer),
									videoUrl.split('/').pop() || 'video.mp4',
									videoData.headers['content-type'],
								);
							}

							returnData.push(newItem);
						} else {
							// No video URL available
							returnData.push({
								json: {
									error: 'Video URL not available',
									...taskResponse.data,
								},
							});
						}
					} else {
						// Return full task data
						returnData.push({
							json: taskResponse.data,
						});
					}
				}
			} catch (error) {
				if (error.message && (error.message.includes('failed to get valid image') || error.message.includes('invalid request'))) {
					const errorMessage = 'The API could not process the provided image. Skyreels ONLY works with human faces and subjects. Animals, objects, and landscapes will likely fail. Please provide a clear image of a person with good lighting and minimal background distractions.';
					if (this.continueOnFail()) {
						returnData.push({
							json: {
								error: errorMessage,
								details: error.message,
							},
						});
						continue;
					}
					throw new NodeOperationError(this.getNode(), errorMessage);
				}
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
