import { IDataObject } from 'n8n-workflow';

export interface PiApiCredentials {
	apiKey: string;
}

export interface FluxTaskResponse {
	code: number;
	message: string;
	data: {
		task_id: string;
		model: string;
		task_type: string;
		status: string;
		input: IDataObject;
		output: IDataObject | null;
		meta: {
			created_at: string;
			started_at: string;
			ended_at: string;
			usage?: {
				type: string;
				frozen: number;
				consume: number;
			};
			is_using_private_pool?: boolean;
		};
		detail: null;
		logs: IDataObject[];
		error: {
			code: number;
			raw_message: string;
			message: string;
			detail: null;
		};
	};
}
