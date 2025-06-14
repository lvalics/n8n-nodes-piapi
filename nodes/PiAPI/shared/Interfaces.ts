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
    model: string;
    task_type: string;
    input: {
        prompt: string;
        negative_prompt?: string;
        image: string; // Base64 encoded image or URL
        aspect_ratio?: string; // "16:9", "9:16", "1:1"
        guidance_scale?: number; // 0.1 to 10
    }
}

export interface Trellis3DModelParams {
    image: string; // Base64 or URL of the input image
    seed?: number;
    ss_sampling_steps?: number; // 10-50
    slat_sampling_steps?: number; // 10-50
    ss_guidance_strength?: number; // 0-10
    slat_guidance_strength?: number; // 0-10
}

// Enhanced interface for faceswap image inputs with better documentation
export interface FaceswapImageInput {
    target_image: string; // Base64 encoded image or URL of image where faces will be replaced
    swap_image: string;   // Base64 encoded image or URL of image containing the faces to use
    swap_faces_index?: string;  // Comma-separated indices of faces to use from swap image, e.g. "0" or "0,1" or "1,0"
    target_faces_index?: string; // Comma-separated indices of faces to replace in target, e.g. "0" or "0,1" or "1,0"
}

export interface FaceswapImageParams {
    model: string;        // Should be "Qubico/image-toolkit"
    task_type: string;    // Should be "face-swap" for single face or "multi-face-swap" for multiple faces
    input: FaceswapImageInput;
    config?: {
        webhook_config?: {
            endpoint?: string;
            secret?: string;
        };
        service_mode?: string; // "public" or "private"
    };
}

// Enhanced interface for faceswap video inputs with better documentation
export interface FaceswapVideoInput {
    swap_image: string;   // Base64 encoded image or URL of image containing the faces to use
    target_video: string; // Base64 encoded video or URL of video where faces will be replaced (MP4 only, max 10MB, 720p)
    swap_faces_index?: string;  // Comma-separated indices of faces to use from swap image, e.g. "0" or "0,1" or "1,0"
    target_faces_index?: string; // Comma-separated indices of faces to replace in target, e.g. "0" or "0,1" or "1,0"
}

export interface FaceswapVideoParams {
    model: string;        // Should be "Qubico/video-toolkit"
    task_type: string;    // Should be "face-swap"
    input: FaceswapVideoInput;
    config?: {
        webhook_config?: {
            endpoint?: string;
            secret?: string;
        };
        service_mode?: string; // "public" or "private"
    };
}

export interface MMAudioVideoToAudioParams {
    model: string;
    task_type: string;
    input: {
        prompt: string;
        negative_prompt?: string;
        video: string; // Base64 encoded video or URL
        steps?: number; // 20-50
        seed?: number;
    };
    config: {
        webhook_config?: {
            endpoint?: string;
            secret?: string;
        };
    };
}

export interface DiffRhythmAudioParams {
    model: string;
    task_type: string;
    input: {
        lyrics?: string;
        style_prompt?: string;
        style_audio?: string; // Base64 encoded audio or URL
    };
    config: {
        webhook_config?: {
            endpoint?: string;
            secret?: string;
        };
    };
}

export interface TTSParams {
    model: string;
    task_type: string;
    input: {
        gen_text: string;
        ref_audio: string; // Base64 encoded audio or URL
        ref_text?: string; // Optional text corresponding to the reference audio
    };
    config: {
        service_mode: string;
        webhook_config?: {
            endpoint?: string;
            secret?: string;
        };
    };
}

export interface MidjourneyImagineParams {
    model: string;
    task_type: string;
    input: {
        prompt: string;
        aspect_ratio?: string;
        process_mode?: string; // relax, fast, turbo
        skip_prompt_check?: boolean;
    };
    config?: {
        webhook_config?: {
            endpoint?: string;
            secret?: string;
        };
        service_mode?: string; // public, private
    };
}

export interface MidjourneyUpscaleParams {
    model: string;
    task_type: string;
    input: {
        origin_task_id: string;
        index: string; // 1, 2, 3, 4, light, beta, 2x, 4x, subtle, creative
    };
    config?: {
        webhook_config?: {
            endpoint?: string;
            secret?: string;
        };
        service_mode?: string; // public, private
    };
}

export interface MidjourneyDescribeParams {
    model: string;
    task_type: string;
    input: {
        image_url: string;
        process_mode?: string; // relax, fast, turbo
        bot_id?: number;
    };
    config?: {
        webhook_config?: {
            endpoint?: string;
            secret?: string;
        };
        service_mode?: string; // public, private
    };
}

export interface VideoUpscaleParams {
    model: string;
    task_type: string;
    input: {
        video: string; // Base64 encoded video or URL
    };
    config?: {
        webhook_config?: {
            endpoint?: string;
            secret?: string;
        };
    };
}

export interface ImageUpscaleParams {
    model: string;
    task_type: string;
    input: {
        image: string; // Base64 encoded image or URL
        scale?: number; // Upscale factor, if supported
    };
    config?: {
        webhook_config?: {
            endpoint?: string;
            secret?: string;
        };
    };
}

export interface RemoveBackgroundParams {
    model: string;
    task_type: string;
    input: {
        image: string; // Base64 encoded image or URL
    };
    config?: {
        webhook_config?: {
            endpoint?: string;
            secret?: string;
        };
    };
}

export interface QubicoSegmentParams {
    model: string;
    task_type: string;
    input: {
        image: string; // URL of the target image
        prompt: string; // Semantic prompt of what to segment
        negative_prompt: string; // Semantic prompt of what not to segment
        segment_factor: number; // Pixels to expand/shrink on the edge
    };
}

export interface FileUploadParams {
    file_name: string;
    file_data: string; // Base64 encoded file data
}

export interface UdioGenerateMusicParams {
    model: string;
    task_type: string;
    input: {
        gpt_description_prompt?: string;
        lyrics?: string;
        negative_tags?: string;
        lyrics_type: 'generate' | 'user' | 'instrumental';
        seed?: number;
        continue_song_id?: string;
        continue_at?: number;
    };
    config: {
        service_mode?: string;
        webhook_config?: {
            endpoint?: string;
            secret?: string;
        };
    };
}

export interface UdioGenerateLyricsParams {
    model: string;
    task_type: string;
    input: {
        prompt: string;
    };
    config: {
        service_mode?: string;
        webhook_config?: {
            endpoint?: string;
            secret?: string;
        };
    };
}

export interface UdioTaskResponse {
    code: number;
    data: {
        task_id: string;
        model: string;
        task_type: string;
        status: string;
        input: IDataObject;
        output: {
            clips?: {
                [key: string]: {
                    id?: string;
                    video_url?: string;
                    audio_url?: string;
                    image_url?: string;
                    image_large_url?: string;
                    is_video_pending?: boolean;
                    major_model_version?: string;
                    model_name?: string;
                    metadata?: {
                        tags?: string;
                        prompt?: string;
                        gpt_description_prompt?: string;
                        audio_prompt_id?: string;
                        history?: any;
                        concat_history?: any;
                        type?: string;
                        duration?: number;
                        refund_credits?: boolean;
                        stream?: boolean;
                        error_type?: string;
                        error_message?: string;
                    };
                    is_liked?: boolean;
                    user_id?: string;
                    display_name?: string;
                    handle?: string;
                    is_handle_updated?: boolean;
                    is_trashed?: boolean;
                    reaction?: any;
                    created_at?: string;
                    status?: string;
                    title?: string;
                    play_count?: number;
                    upvote_count?: number;
                    is_public?: boolean;
                };
            };
            lyrics_pairs?: Array<{
                title: string;
                text: string;
            }>;
        };
        meta: {
            created_at?: string;
            started_at?: string;
            ended_at?: string;
            usage?: {
                type: string;
                frozen: number;
                consume: number;
            };
            is_using_private_pool?: boolean;
        };
        detail: any;
        logs: any[];
        error: {
            code: number;
            raw_message?: string;
            message: string;
            detail?: any;
        };
    };
    message: string;
}
