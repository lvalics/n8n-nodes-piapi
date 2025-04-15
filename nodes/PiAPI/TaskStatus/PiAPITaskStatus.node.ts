import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';

import { piApiRequest } from '../shared/GenericFunctions';

export class PiAPITaskStatus implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PiAPI Task Status',
		name: 'piAPITaskStatus',
		icon: 'file:../piapi.svg',
		group: ['transform'],
		version: 1,
		description: 'Check the status of a PiAPI task',
		defaults: {
			name: 'PiAPI Task Status',
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
				displayName: 'Task ID',
				name: 'taskId',
				type: 'string',
				default: '',
				required: true,
				description: 'The ID of the task to check (use: {{ $json.data?.task_id || $json.task_id }} to infer from input data)',
				placeholder: '{{ $json.data?.task_id || $json.task_id }}',
			},
			{
				displayName: 'Return Only Media URL',
				name: 'returnOnlyImageUrl',
				type: 'boolean',
				default: false,
				description: 'Whether to return only the image/video URL instead of the full task data',
			},
			{
				displayName: 'Return Binary Data',
				name: 'returnBinaryData',
				type: 'boolean',
				default: false,
				description: 'Whether to return the Image/Video as binary data',
			},
			{
				displayName: 'Binary Property',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						returnBinaryData: [true],
					},
				},
				description: 'Name of the binary property to which to write the data of the image',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			// Try to get the task ID from parameter or infer from input data
			let taskId = this.getNodeParameter('taskId', i, '') as string;

			// If no Task ID was provided, try to infer it from the input data
			if (!taskId || taskId.trim() === '') {
				const inputData = items[i].json;
				// Try to extract from common locations with proper type assertions
				taskId = (inputData as any)?.data?.task_id || (inputData as any)?.task_id || '';

				// If we still don't have a taskId, throw an error
				if (!taskId || taskId.trim() === '') {
					throw new Error('Task ID is required and cannot be found in input data');
				}
			}

			const returnOnlyImageUrl = this.getNodeParameter('returnOnlyImageUrl', i, false) as boolean;
			const returnBinaryData = this.getNodeParameter('returnBinaryData', i, false) as boolean;
			const binaryPropertyName = returnBinaryData
				? (this.getNodeParameter('binaryPropertyName', i) as string)
				: '';

			try {
				// Get task status
				const encodedTaskId = encodeURIComponent(taskId.trim());
				const response = await piApiRequest.call(this, 'GET', `/api/v1/task/${encodedTaskId}`);

				// Check for API errors
				if (!response.data || response.code !== 200) {
					throw new Error(`Failed to retrieve task: ${response.message || 'Unknown error'}`);
				}

				// Handle both image_url and video_url in the output
				const mediaUrl = response.data?.output?.image_url || response.data?.output?.video_url;

				if (returnOnlyImageUrl && mediaUrl) {
					// Return only the image URL but maintain the structure
					returnData.push({
						json: {
							code: 200,
							data: {
								...response.data,
								mediaUrl,
								type: response.data?.output?.image_url ? 'image' : 'video',
							},
							message: "success"
						}
					});
				} else if (returnBinaryData && mediaUrl) {
					// Download the image/video and return as binary data
					const imageUrl = mediaUrl;
					const imageData = await this.helpers.request({
						method: 'GET',
						url: imageUrl,
						encoding: null,
						resolveWithFullResponse: true,
					});

					const newItem: INodeExecutionData = {
						json: {
							code: 200,
							data: response.data,
							message: "success"
						},
						binary: {},
					};

					if (newItem.binary) {
						newItem.binary[binaryPropertyName] = await this.helpers.prepareBinaryData(
							Buffer.from(imageData.body as Buffer),
							imageUrl.split('/').pop() || 'image.png',
							imageData.headers['content-type'],
						);
					}

					returnData.push(newItem);
				} else {
					// Regular response - maintain the original API structure
					returnData.push({
						json: {
							code: 200,
							data: response.data,
							message: "success"
						}
					});
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							code: 400,
							data: null,
							message: error.message,
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
