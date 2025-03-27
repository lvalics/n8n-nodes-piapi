import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class PiAPI implements ICredentialType {
	name = 'PiAPI';
	displayName = 'Pi API';
	documentationUrl = 'https://piapi.ai/workspace';
	properties: INodeProperties[] = [
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			default: '',
			required: true,
			description: 'JWT token for PiAPI AI API. Must be generated according to PiAPI AI specifications with proper header {"alg":"HS256","typ":"JWT"} and payload {"iss":"YOUR_ACCESS_KEY","exp":EXPIRATION_TIME,"nbf":NOT_BEFORE_TIME}.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'Content-Type': 'application/json',
				'Accept': 'application/json',
				'Authorization': '=Bearer {{$credentials.apiToken.trim().replace(/^Bearer\\s+/i, "")}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.PiAPI.com',
			url: '/account/costs',
			method: 'GET',
			qs: {
				start_time: Date.now() - 24 * 60 * 60 * 1000,
				end_time: Date.now(),
			},
		},
	};
}
