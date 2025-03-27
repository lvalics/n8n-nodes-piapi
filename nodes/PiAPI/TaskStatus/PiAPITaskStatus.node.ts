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
				description: 'The ID of the task to check',
			},
			{
				displayName: 'Return Only Image URL',
				name: 'returnOnlyImageUrl',
				type: 'boolean',
				default: false,
				description: 'Whether to return only the image URL instead of the full task data',
			},
			{
				displayName: 'Return Binary Data',
				name: 'returnBinaryData',
				type: 'boolean',
				default: false,
				description: 'Whether to return the image as binary data',
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
			const taskId = this.getNodeParameter('taskId', i) as string;
			const returnOnlyImageUrl = this.getNodeParameter('returnOnlyImageUrl', i, false) as boolean;
			const returnBinaryData = this.getNodeParameter('returnBinaryData', i, false) as boolean;
			const binaryPropertyName = returnBinaryData
				? (this.getNodeParameter('binaryPropertyName', i) as string)
				: '';

			try {
				// Get task status
				const response = await piApiRequest.call(this, 'GET', `/api/v1/task/${taskId}`);

				if (returnOnlyImageUrl && response.data?.output?.image_url) {
					returnData.push({
						json: {
							imageUrl: response.data.output.image_url,
						},
					});
				} else if (returnBinaryData && response.data?.output?.image_url) {
					// Download the image and return as binary data
					const imageUrl = response.data.output.image_url;
					const imageData = await this.helpers.request({
						method: 'GET',
						url: imageUrl,
						encoding: null,
						resolveWithFullResponse: true,
					});

					const newItem: INodeExecutionData = {
						json: response.data,
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
					returnData.push({
						json: response.data,
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
