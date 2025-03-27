import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class PiAPI implements ICredentialType {
	name = 'PiAPI';
	displayName = 'Pi API';
	documentationUrl = 'https://piapi.ai/workspace?via=valics';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',  // Changed from apiToken
			type: 'string',
			default: '',
			required: true,
			description: 'Your PiAPI API key generated from the workspace',
	},
	];

	// Update the authentication method
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
				headers: {
						'Content-Type': 'application/json',
						'Accept': 'application/json',
						'x-api-key': '={{$credentials.apiKey}}',  // Changed from Authorization Bearer
				},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.piapi.ai',  // Updated URL
			url: '/api/v1/task',  // Using a valid endpoint from the docs
			method: 'GET',
			qs: {
				start_time: Date.now() - 24 * 60 * 60 * 1000,
				end_time: Date.now(),
			},
		},
	};
}
