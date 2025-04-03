import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	NodeApiError,
	JsonObject,
} from 'n8n-workflow';

export async function piApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
	method: string,
	resource: string,
	body: IDataObject = {},
	qs: IDataObject = {},
) {
	const credentials = await this.getCredentials('piAPIApi');
	
	const options: IDataObject = {
		method,
		body,
		qs,
		url: `https://api.piapi.ai${resource}`,
		headers: {
			'Content-Type': 'application/json',
			'X-API-Key': credentials.apiKey as string,
		},
		json: true,
	};

	try {
		return await this.helpers.request!(options as JsonObject);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

// Special request function for LLM API endpoints which require Bearer token auth
export async function llmApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
	body: IDataObject = {},
) {
	const credentials = await this.getCredentials('piAPIApi');
	
	const options: IDataObject = {
		method: 'POST',
		body,
		url: 'https://api.piapi.ai/v1/chat/completions',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${credentials.apiKey as string}`,
		},
		json: true,
	};

	try {
		return await this.helpers.request!(options as JsonObject);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function waitForTaskCompletion(
	this: IExecuteFunctions,
	taskId: string,
	maxRetries = 20,
	retryInterval = 3000,
): Promise<IDataObject> {
	let retries = 0;
	
	while (retries < maxRetries) {
		const response = await piApiRequest.call(
			this,
			'GET',
			`/api/v1/task/${taskId}`,
		);
		
		const status = response.data?.status;
		
		if (status === 'success' || status === 'completed') {
			return response.data;
		}
		
		if (status === 'failed') {
			throw new Error(`Task failed: ${JSON.stringify(response.data?.error || 'Unknown error')}`);
		}
		
		// Wait before trying again
		await new Promise(resolve => setTimeout(resolve, retryInterval));
		retries++;
	}
	
	throw new Error(`Task timed out after ${maxRetries} retries`);
}
