import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    ILoadOptionsFunctions,
    INodePropertyOptions,
    NodeConnectionType,
} from 'n8n-workflow';

import { piApiRequest, waitForTaskCompletion } from '../shared/GenericFunctions';

// Voice data structure
interface VoiceData {
    name: string;
    emotions: string[];
}

// Map of voice names to their available emotions
const VOICE_EMOTIONS_MAP: { [key: string]: VoiceData } = {
    "Rock": {
        name: "Rock",
        emotions: ["Happy", "Sad", "Angry", "Neutral"]
    },
    "Funny": {
        name: "Funny",
        emotions: ["Happy", "Excited", "Neutral"]
    },
    "Gentle": {
        name: "Gentle",
        emotions: ["Calm", "Sad", "Neutral"]
    },
    // Additional voices would be added here based on the Kling documentation
};

// Function to load available TTS voices from Kling API
export async function loadTtsVoices(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
    try {
        // We're using direct fetch here instead of piApiRequest since this is a public API endpoint
        const response = await this.helpers.request({
            method: 'GET',
            url: 'https://klingai.com/api/lip/sync/ttsList?type=',
            json: true,
        });

        if (!response || !Array.isArray(response)) {
            return Object.keys(VOICE_EMOTIONS_MAP).map(voice => ({
                name: voice,
                value: voice,
            }));
        }
        
        // Transform the response into options
        return response.map((voice: string) => ({
            name: voice,
            value: voice,
        }));
    } catch (error) {
        // Return options from our map if the request fails
        return Object.keys(VOICE_EMOTIONS_MAP).map(voice => ({
            name: voice,
            value: voice,
        }));
    }
}

// Function to load emotions for the selected voice
export async function loadTtsEmotions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
    const currentVoice = this.getCurrentNodeParameter('ttsVoice') as string;
    
    if (!currentVoice || !VOICE_EMOTIONS_MAP[currentVoice]) {
        return [{ name: 'Neutral', value: 'Neutral' }];
    }
    
    const emotions = VOICE_EMOTIONS_MAP[currentVoice].emotions;
    return emotions.map(emotion => ({
        name: emotion,
        value: emotion
    }));
}

export class KlingLipSync implements INodeType {
    // Add method to load options
    methods = {
        loadOptions: {
            loadTtsVoices,
            loadTtsEmotions,
        },
    };
    description: INodeTypeDescription = {
        displayName: 'PiAPI Kling Lip Sync',
        name: 'klingLipSync',
        icon: 'file:../piapi.svg',
        group: ['transform'],
        version: 1,
        description: 'Apply lip sync to a Kling video with text-to-speech or audio',
        defaults: {
            name: 'Kling Lip Sync',
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
                displayName: 'Original Task ID',
                name: 'originTaskId',
                type: 'string',
                default: '',
                required: true,
                description: 'The task ID of the original Kling video',
            },
            {
                displayName: 'Audio Source',
                name: 'audioSource',
                type: 'options',
                options: [
                    {
                        name: 'Text-to-Speech',
                        value: 'tts',
                        description: 'Generate audio from text using TTS',
                    },
                    {
                        name: 'Audio URL',
                        value: 'audioUrl',
                        description: 'Use existing audio file from URL',
                    },
                ],
                default: 'tts',
                description: 'Source of audio for lip syncing',
            },
            {
                displayName: 'TTS Text',
                name: 'ttsText',
                type: 'string',
                typeOptions: {
                    rows: 4,
                },
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        audioSource: ['tts'],
                    },
                },
                description: 'Text to convert to speech',
            },
            {
                displayName: 'Voice',
                name: 'ttsVoice',
                type: 'options',
                typeOptions: {
                    loadOptionsMethod: 'loadTtsVoices',
                },
                default: 'Rock',
                required: true,
                displayOptions: {
                    show: {
                        audioSource: ['tts'],
                    },
                },
                description: 'Voice to use for text-to-speech',
            },
            {
                displayName: 'Emotion',
                name: 'ttsEmotion',
                type: 'options',
                typeOptions: {
                    loadOptionsMethod: 'loadTtsEmotions',
                },
                default: 'Neutral',
                required: false,
                displayOptions: {
                    show: {
                        audioSource: ['tts'],
                    },
                },
                description: 'Emotional style for the selected voice',
            },
            {
                displayName: 'Speech Speed',
                name: 'ttsSpeed',
                type: 'number',
                typeOptions: {
                    minValue: 0.8,
                    maxValue: 2,
                    numberPrecision: 1,
                },
                default: 1,
                displayOptions: {
                    show: {
                        audioSource: ['tts'],
                    },
                },
                description: 'Speed of the speech (0.8-2)',
            },
            {
                displayName: 'Audio URL',
                name: 'audioUrl',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        audioSource: ['audioUrl'],
                    },
                },
                description: 'URL to your audio file (mp3, wav, flac, ogg)',
            },
            {
                displayName: 'Wait for Completion',
                name: 'waitForCompletion',
                type: 'boolean',
                default: false,
                description: 'Whether to wait for the task to complete before returning',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];

        for (let i = 0; i < items.length; i++) {
            try {
                const originTaskId = this.getNodeParameter('originTaskId', i) as string;
                const audioSource = this.getNodeParameter('audioSource', i) as string;
                const waitForCompletion = this.getNodeParameter('waitForCompletion', i, false) as boolean;

                // Construct request body
                const body: any = {
                    model: 'kling',
                    task_type: 'lip_sync',
                    input: {
                        origin_task_id: originTaskId,
                    },
                    config: {
                        webhook_config: {
                            endpoint: '',
                            secret: '',
                        },
                    },
                };

                if (audioSource === 'tts') {
                    const ttsText = this.getNodeParameter('ttsText', i) as string;
                    const ttsVoice = this.getNodeParameter('ttsVoice', i) as string;
                    const ttsEmotion = this.getNodeParameter('ttsEmotion', i, 'Neutral') as string;
                    const ttsSpeed = this.getNodeParameter('ttsSpeed', i) as number;
                    
                    // Combine voice and emotion if emotion is selected
                    let voiceWithEmotion = ttsVoice;
                    if (ttsEmotion && ttsEmotion !== 'Neutral') {
                        voiceWithEmotion = `${ttsVoice}-${ttsEmotion}`;
                    }

                    body.input.tts_text = ttsText;
                    body.input.tts_timbre = voiceWithEmotion;
                    body.input.tts_speed = ttsSpeed;
                    body.input.local_dubbing_url = '';
                } else {
                    const audioUrl = this.getNodeParameter('audioUrl', i) as string;
                    
                    // Validate URL
                    try {
                        new URL(audioUrl);
                    } catch (error) {
                        throw new Error(`Invalid audio URL: ${error.message}`);
                    }

                    body.input.tts_text = '';
                    body.input.tts_timbre = '';
                    body.input.tts_speed = 1;
                    body.input.local_dubbing_url = audioUrl;
                }

                // Initialize task
                const response = await piApiRequest.call(this, 'POST', '/api/v1/task', body);

                if (response.code !== 200) {
                    throw new Error(`API Error: ${response.message}`);
                }

                const taskId = response.data.task_id;
                let taskData = response.data;

                // If waitForCompletion is true, poll until the task is complete
                if (waitForCompletion) {
                    taskData = await waitForTaskCompletion.call(this, taskId);
                }

                returnData.push({
                    json: taskData,
                });
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
