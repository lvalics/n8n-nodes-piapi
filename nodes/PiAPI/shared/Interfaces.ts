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

export interface KlingTextToVideoParams {
	prompt: string;
	negative_prompt?: string;
	duration: number;
	aspect_ratio: string;
	mode: string;
	version: string;
	cfg_scale: number;
}

export interface KlingImageToVideoParams extends KlingTextToVideoParams {
	image_url?: string;
	image_tail_url?: string;
	elements?: Array<{ image_url: string }>;
}

export interface KlingLipSyncParams {
	origin_task_id: string;
	tts_text?: string;
	tts_timbre?: string;
	tts_speed?: number;
	local_dubbing_url?: string;
}

export interface KlingEffectsParams {
	image_url: string;
	effect: string;
}

export interface KlingTryOnParams {
	model_input: string;
	dress_input?: string;
	upper_input?: string;
	lower_input?: string;
	batch_size?: number;
}
