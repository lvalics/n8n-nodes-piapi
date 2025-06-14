import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class PiAPI implements ICredentialType {
	name = 'piAPIApi';
	displayName = 'PiAPI';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'Your PiAPI API key from the PiAPI workspace',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'x-api-key': '={{ $credentials.apiKey }}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.piapi.ai',
			url: '/api/v1/task',
			method: 'POST',
			body: {
				model: 'Qubico/flux1-schnell',
				task_type: 'txt2img',
				input: {
					prompt: 'test credential validation',
				}
			},
		},
	};
}
