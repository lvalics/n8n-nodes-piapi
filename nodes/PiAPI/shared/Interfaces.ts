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
	tts_emotion?: string;
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

export interface HailuoBaseParams {
    prompt?: string;
    expand_prompt?: boolean;
    model: string; // t2v-01, i2v-01, s2v-01, t2v-01-director, i2v-01-director, i2v-01-live
}

export interface HailuoTextToVideoParams extends HailuoBaseParams {
    prompt: string; // Required for text-to-video
    image_url?: never; // Should not be provided for text-to-video
}

export interface HailuoImageToVideoParams extends HailuoBaseParams {
    image_url: string; // Required for image-to-video
    prompt?: string; // Optional for image-to-video
}

export interface HailuoSubjectVideoParams extends HailuoBaseParams {
    prompt: string; // Required for subject reference video
    image_url: string; // Required for subject reference video, must contain detectable human face
}

export interface SkyreelsImageToVideoParams {
    prompt: string;
    negative_prompt?: string;
    image: string; // Base64 encoded image or URL
    aspect_ratio?: string; // "16:9", "9:16", "1:1"
    guidance_scale?: number; // 0.1 to 10
}
