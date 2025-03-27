import {
	IExecuteFunctions,
	INodeType,
	INodeTypeDescription,
	IDataObject,
	INodeExecutionData,
	NodeOperationError,
	NodeConnectionType,
	IHttpRequestMethods,
	JsonObject,
} from 'n8n-workflow';

export class PiAPI implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PiAPI AI',
		name: 'PiAPI',
		icon: 'file:PiAPI.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume PiAPI AI API',
		defaults: {
			name: 'PiAPI AI',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [],
		properties: [
			{
				displayName: 'API Token',
				name: 'apiToken',
				type: 'string',
				typeOptions: {
					password: true,
				},
				default: '',
				required: true,
				description: 'JWT token for PiAPI AI API. Generate with header {"alg":"HS256","typ":"JWT"} and payload {"iss":"YOUR_ACCESS_KEY","exp":EXPIRATION_TIME,"nbf":NOT_BEFORE_TIME}. Don\'t include "Bearer" prefix.',
				placeholder: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Image',
						value: 'image',
					},
					{
						name: 'Video',
						value: 'video',
					},
					{
						name: 'Virtual Try-on',
						value: 'tryOn',
					},
					{
						name: 'Account',
						value: 'account',
					},
				],
				default: 'image',
			},

			// Image resource operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: [
							'image',
						],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create an image',
						action: 'Create an image',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get image generation details',
						action: 'Get image generation details',
					},
					{
						name: 'List',
						value: 'list',
						description: 'List image generations',
						action: 'List image generations',
					},
				],
				default: 'create',
			},

			// Video resource operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: [
							'video',
						],
					},
				},
				options: [
					{
						name: 'Text to Video',
						value: 'text2video',
						description: 'Generate video from text',
						action: 'Generate video from text',
					},
					{
						name: 'Image to Video',
						value: 'image2video',
						description: 'Generate video from image',
						action: 'Generate video from image',
					},
					{
						name: 'Lip Sync',
						value: 'lipSync',
						description: 'Generate lip sync video',
						action: 'Generate lip sync video',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get video generation details',
						action: 'Get video generation details',
					},
					{
						name: 'List',
						value: 'list',
						description: 'List video generations',
						action: 'List video generations',
					},
				],
				default: 'text2video',
			},

			// Virtual Try-on resource operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: [
							'tryOn',
						],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create virtual try-on',
						action: 'Create virtual try on',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get virtual try-on details',
						action: 'Get virtual try on details',
					},
					{
						name: 'List',
						value: 'list',
						description: 'List virtual try-ons',
						action: 'List virtual try ons',
					},
				],
				default: 'create',
			},

			// Account resource operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: [
							'account',
						],
					},
				},
				options: [
					{
						name: 'Get Resource Packages',
						value: 'getResourcePackages',
						description: 'Get account resource packages',
						action: 'Get account resource packages',
					},
				],
				default: 'getResourcePackages',
			},

			// Create Image parameters
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'image',
						],
						operation: [
							'create',
						],
					},
				},
				options: [
					{
						name: 'Kling V1',
						value: 'kling-v1',
					},
					{
						name: 'Kling V1.5',
						value: 'kling-v1-5',
					},
				],
				default: 'kling-v1',
				description: 'The model to use for image generation',
			},
			{
				displayName: 'Prompt',
				name: 'prompt',
				type: 'string',
				required: true,
				typeOptions: {
					rows: 4,
				},
				displayOptions: {
					show: {
						resource: [
							'image',
						],
						operation: [
							'create',
						],
					},
				},
				default: '',
				description: 'The prompt to generate images from',
			},
			{
				displayName: 'Negative Prompt',
				name: 'negativePrompt',
				type: 'string',
				required: false,
				typeOptions: {
					rows: 4,
				},
				displayOptions: {
					show: {
						resource: [
							'image',
						],
						operation: [
							'create',
						],
					},
				},
				default: '',
				description: 'The negative prompt to avoid in generation',
			},
			{
				displayName: 'Number of Images',
				name: 'n',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 9,
				},
				displayOptions: {
					show: {
						resource: [
							'image',
						],
						operation: [
							'create',
						],
					},
				},
				default: 1,
				description: 'How many images to generate',
			},
			{
				displayName: 'Aspect Ratio',
				name: 'aspectRatio',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'image',
						],
						operation: [
							'create',
						],
					},
				},
				options: [
					{
						name: '16:9',
						value: '16:9',
					},
					{
						name: '9:16',
						value: '9:16',
					},
					{
						name: '1:1',
						value: '1:1',
					},
					{
						name: '4:3',
						value: '4:3',
					},
					{
						name: '3:4',
						value: '3:4',
					},
					{
						name: '3:2',
						value: '3:2',
					},
					{
						name: '2:3',
						value: '2:3',
					},
					{
						name: '21:9',
						value: '21:9',
					},
				],
				default: '16:9',
				description: 'The aspect ratio of the generated images',
			},
			{
				displayName: 'Additional Options',
				name: 'additionalOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: [
							'image',
						],
						operation: [
							'create',
						],
					},
				},
				options: [
					{
						displayName: 'Reference Image',
						name: 'image',
						type: 'string',
						default: '',
						description: 'URL or Base64-encoded image to use as reference. When using kling-v1-5 model, you must also specify Image Reference Type.',
					},
					{
						displayName: 'Image Reference Type',
						name: 'imageReference',
						type: 'options',
						options: [
							{
								name: 'Subject (Character Feature Reference)',
								value: 'subject',
							},
							{
								name: 'Face (Character Appearance Reference)',
								value: 'face',
							},
						],
						default: 'subject',
						description: 'Type of image reference. REQUIRED when using reference image, especially for kling-v1-5 model. For face reference, the uploaded image must contain only one face.',
					},
					{
						displayName: 'Image Fidelity',
						name: 'imageFidelity',
						type: 'number',
						typeOptions: {
							minValue: 0,
							maxValue: 1,
							numberPrecision: 2,
						},
						default: 0.5,
						description: 'Reference intensity for user-uploaded images',
					},
					{
						displayName: 'Callback URL',
						name: 'callbackUrl',
						type: 'string',
						default: '',
						description: 'URL to call when generation is complete',
					},
				],
			},

			// Get Image parameters
			{
				displayName: 'Task ID',
				name: 'taskId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'image',
						],
						operation: [
							'get',
						],
					},
				},
				default: '',
				description: 'The ID of the image generation task',
			},

			// List Images parameters
			{
				displayName: 'Additional Options',
				name: 'additionalOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: [
							'image',
						],
						operation: [
							'list',
						],
					},
				},
				options: [
					{
						displayName: 'Page Number',
						name: 'pageNum',
						type: 'number',
						typeOptions: {
							minValue: 1,
						},
						default: 1,
						description: 'Page number to retrieve',
					},
					{
						displayName: 'Page Size',
						name: 'pageSize',
						type: 'number',
						typeOptions: {
							minValue: 1,
							maxValue: 500,
						},
						default: 30,
						description: 'Number of results per page',
					},
				],
			},

			// Text to Video parameters
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'video',
						],
						operation: [
							'text2video',
						],
					},
				},
				options: [
					{
						name: 'Kling V1',
						value: 'kling-v1',
					},
					{
						name: 'Kling V1-6',
						value: 'kling-v1-6',
					},
				],
				default: 'kling-v1',
				description: 'The model to use for video generation',
			},
			{
				displayName: 'Prompt',
				name: 'prompt',
				type: 'string',
				required: true,
				typeOptions: {
					rows: 4,
				},
				displayOptions: {
					show: {
						resource: [
							'video',
						],
						operation: [
							'text2video',
						],
					},
				},
				default: '',
				description: 'The prompt to generate video from',
			},
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'video',
						],
						operation: [
							'text2video',
						],
					},
				},
				options: [
					{
						name: 'Standard',
						value: 'std',
					},
					{
						name: 'Professional',
						value: 'pro',
					},
				],
				default: 'std',
				description: 'Video generation mode',
			},
			{
				displayName: 'Duration',
				name: 'duration',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'video',
						],
						operation: [
							'text2video',
						],
					},
				},
				options: [
					{
						name: '5 Seconds',
						value: '5',
					},
					{
						name: '10 Seconds',
						value: '10',
					},
				],
				default: '5',
				description: 'Duration of the generated video',
			},
			{
				displayName: 'Additional Options',
				name: 'additionalOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: [
							'video',
						],
						operation: [
							'text2video',
						],
					},
				},
				options: [
					{
						displayName: 'Negative Prompt',
						name: 'negativePrompt',
						type: 'string',
						typeOptions: {
							rows: 4,
						},
						default: '',
						description: 'The negative prompt to avoid in generation',
					},
					{
						displayName: 'CFG Scale',
						name: 'cfgScale',
						type: 'number',
						typeOptions: {
							minValue: 0,
							maxValue: 1,
							numberPrecision: 2,
						},
						default: 0.5,
						description: 'Flexibility in video generation',
					},
					{
						displayName: 'Aspect Ratio',
						name: 'aspectRatio',
						type: 'options',
						options: [
							{
								name: '16:9',
								value: '16:9',
							},
							{
								name: '9:16',
								value: '9:16',
							},
							{
								name: '1:1',
								value: '1:1',
							},
						],
						default: '16:9',
						description: 'The aspect ratio of the generated video',
					},
					{
						displayName: 'Callback URL',
						name: 'callbackUrl',
						type: 'string',
						default: '',
						description: 'URL to call when generation is complete',
					},
					{
						displayName: 'External Task ID',
						name: 'externalTaskId',
						type: 'string',
						default: '',
						description: 'Custom task ID for tracking',
					},
				],
			},

			// Image to Video parameters
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'video',
						],
						operation: [
							'image2video',
						],
					},
				},
				options: [
					{
						name: 'Kling V1',
						value: 'kling-v1',
					},
					{
						name: 'Kling V1-5',
						value: 'kling-v1-5',
					},
					{
						name: 'Kling V1-6',
						value: 'kling-v1-6',
					},
				],
				default: 'kling-v1',
				description: 'The model to use for video generation',
			},
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'video',
						],
						operation: [
							'image2video',
						],
					},
				},
				options: [
					{
						name: 'Standard',
						value: 'std',
					},
					{
						name: 'Professional',
						value: 'pro',
					},
				],
				default: 'std',
				description: 'Video generation mode',
			},
			{
				displayName: 'Image',
				name: 'image',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'video',
						],
						operation: [
							'image2video',
						],
					},
				},
				default: '',
				description: 'URL or Base64-encoded image to animate',
			},
			{
				displayName: 'Prompt',
				name: 'prompt',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				displayOptions: {
					show: {
						resource: [
							'video',
						],
						operation: [
							'image2video',
						],
					},
				},
				default: '',
				description: 'Optional prompt to guide animation',
			},
			{
				displayName: 'Duration',
				name: 'duration',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'video',
						],
						operation: [
							'image2video',
						],
					},
				},
				options: [
					{
						name: '5 Seconds',
						value: '5',
					},
					{
						name: '10 Seconds',
						value: '10',
					},
				],
				default: '5',
				description: 'Duration of the generated video',
			},
			{
				displayName: 'Additional Options',
				name: 'additionalOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: [
							'video',
						],
						operation: [
							'image2video',
						],
					},
				},
				options: [
					{
						displayName: 'End Frame Image',
						name: 'imageTail',
						type: 'string',
						default: '',
						description: 'URL or Base64-encoded image for end frame',
					},
					{
						displayName: 'Negative Prompt',
						name: 'negativePrompt',
						type: 'string',
						typeOptions: {
							rows: 4,
						},
						default: '',
						description: 'The negative prompt to avoid in generation',
					},
					{
						displayName: 'CFG Scale',
						name: 'cfgScale',
						type: 'number',
						typeOptions: {
							minValue: 0,
							maxValue: 1,
							numberPrecision: 2,
						},
						default: 0.5,
						description: 'Flexibility in video generation',
					},
					{
						displayName: 'Callback URL',
						name: 'callbackUrl',
						type: 'string',
						default: '',
						description: 'URL to call when generation is complete',
					},
					{
						displayName: 'External Task ID',
						name: 'externalTaskId',
						type: 'string',
						default: '',
						description: 'Custom task ID for tracking',
					},
				],
			},

			// Lip Sync parameters
			{
				displayName: 'Input Type',
				name: 'inputType',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'video',
						],
						operation: [
							'lipSync',
						],
					},
				},
				options: [
					{
						name: 'Text to Video',
						value: 'text2video',
					},
					{
						name: 'Audio to Video',
						value: 'audio2video',
					},
				],
				default: 'text2video',
				description: 'Lip sync input type',
			},
			// Video source options
			{
				displayName: 'Video Source',
				name: 'videoSource',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'video',
						],
						operation: [
							'lipSync',
						],
					},
				},
				options: [
					{
						name: 'Video ID',
						value: 'videoId',
					},
					{
						name: 'Video URL',
						value: 'videoUrl',
					},
				],
				default: 'videoId',
				description: 'Source of the video',
			},
			// Video ID field
			{
				displayName: 'Video ID',
				name: 'videoId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'video',
						],
						operation: [
							'lipSync',
						],
						videoSource: [
							'videoId',
						],
					},
				},
				default: '',
				description: 'ID of video generated by Kling AI',
			},
			// Video URL field
			{
				displayName: 'Video URL',
				name: 'videoUrl',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'video',
						],
						operation: [
							'lipSync',
						],
						videoSource: [
							'videoUrl',
						],
					},
				},
				default: '',
				description: 'URL of uploaded video',
			},
			// Text to Video mode fields
			{
				displayName: 'Text Content',
				name: 'text',
				type: 'string',
				required: true,
				typeOptions: {
					rows: 4,
				},
				displayOptions: {
					show: {
						resource: [
							'video',
						],
						operation: [
							'lipSync',
						],
						inputType: [
							'text2video',
						],
					},
				},
				default: '',
				description: 'Text content for lip sync',
			},
			{
				displayName: 'Voice Language',
				name: 'voiceLanguage',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'video',
						],
						operation: [
							'lipSync',
						],
						inputType: [
							'text2video',
						],
					},
				},
				options: [
					{
						name: 'Chinese',
						value: 'zh',
					},
					{
						name: 'English',
						value: 'en',
					},
				],
				default: 'zh',
				description: 'Language of the voice',
			},
			{
				displayName: 'Voice ID',
				name: 'voiceId',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'video',
						],
						operation: [
							'lipSync',
						],
						inputType: [
							'text2video',
						],
						voiceLanguage: [
							'zh', // Only show Chinese voices when Chinese is selected
						],
					},
				},
				options: [
					// Chinese voices from the CSV
					{ name: '阳光少年 (Sunny Boy)', value: 'genshin_vindi2' },
					{ name: '懂事小弟 (Sage)', value: 'zhinen_xuesheng' },
					{ name: '运动少年 (Sporty Boy)', value: 'tiyuxi_xuedi' },
					{ name: '青春少女 (Youthful Girl)', value: 'ai_shatang' },
					{ name: '温柔小妹 (Gentle Sister)', value: 'genshin_klee2' },
					{ name: '元气少女 (Energetic Girl)', value: 'genshin_kirara' },
					{ name: '阳光男生 (Sunny Young Man)', value: 'ai_kaiya' },
					{ name: '幽默小哥 (Humorous Guy)', value: 'tiexin_nanyou' },
					{ name: '文艺小哥 (Artsy Guy)', value: 'ai_chenjiahao_712' },
					{ name: '甜美邻家 (Sweet Neighbor)', value: 'girlfriend_1_speech02' },
					{ name: '温柔姐姐 (Gentle Big Sister)', value: 'chat1_female_new-3' },
					{ name: '职场女青 (Professional Woman)', value: 'girlfriend_2_speech02' },
					{ name: '活泼男童 (Lively Boy)', value: 'cartoon-boy-07' },
					{ name: '俏皮女童 (Playful Girl)', value: 'cartoon-girl-01' },
					{ name: '稳重老爸 (Steady Father)', value: 'ai_huangyaoshi_712' },
					{ name: '温柔妈妈 (Gentle Mother)', value: 'you_pingjing' },
					{ name: '严肃上司 (Serious Boss)', value: 'ai_laoguowang_712' },
					{ name: '优雅贵妇 (Elegant Lady)', value: 'chengshu_jiejie' },
					{ name: '慈祥爷爷 (Kind Grandfather)', value: 'zhuxi_speech02' },
					{ name: '唠叨爷爷 (Chatty Grandfather)', value: 'uk_oldman3' },
					{ name: '唠叨奶奶 (Chatty Grandmother)', value: 'laopopo_speech02' },
					{ name: '和蔼奶奶 (Kind Grandmother)', value: 'heainainai_speech02' },
					{ name: '东北老铁 (Northeastern Friend)', value: 'dongbeilaotie_speech02' },
					{ name: '重庆小伙 (Chongqing Guy)', value: 'chongqingxiaohuo_speech02' },
					{ name: '四川妹子 (Sichuan Girl)', value: 'chuanmeizi_speech02' },
					{ name: '潮汕大叔 (Chaoshan Uncle)', value: 'chaoshandashu_speech02' },
					{ name: '台湾男生 (Taiwan Guy)', value: 'ai_taiwan_man2_speech02' },
					{ name: '西安掌柜 (Xi\'an Manager)', value: 'xianzhanggui_speech02' },
					{ name: '天津姐姐 (Tianjin Sister)', value: 'tianjinjiejie_speech02' },
					{ name: '新闻播报男 (News Anchor Male)', value: 'diyinnansang_DB_CN_M_04-v2' },
					{ name: '译制片男 (Film Dubbing Male)', value: 'yizhipiannan-v1' },
					{ name: '元气少女 (Energetic Girl 2)', value: 'guanxiaofang-v2' },
					{ name: '撒娇女友 (Coquettish Girlfriend)', value: 'tianmeixuemei-v1' },
					{ name: '刀片烟嗓 (Raspy Voice)', value: 'daopianyansang-v1' },
					{ name: '乖巧正太 (Well-behaved Boy)', value: 'mengwa-v1' },
				],
				default: 'genshin_vindi2',
				description: 'Select a Chinese voice for speech synthesis',
			},
			{
				displayName: 'Voice ID',
				name: 'voiceId',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'video',
						],
						operation: [
							'lipSync',
						],
						inputType: [
							'text2video',
						],
						voiceLanguage: [
							'en', // Only show English voices when English is selected
						],
					},
				},
				options: [
					// English voices from the CSV
					{ name: 'Sunny', value: 'genshin_vindi2' },
					{ name: 'Sage', value: 'zhinen_xuesheng' },
					{ name: 'Ace', value: 'AOT' },
					{ name: 'Blossom', value: 'ai_shatang' },
					{ name: 'Peppy', value: 'genshin_klee2' },
					{ name: 'Dove', value: 'genshin_kirara' },
					{ name: 'Shine', value: 'ai_kaiya' },
					{ name: 'Anchor', value: 'oversea_male1' },
					{ name: 'Lyric', value: 'ai_chenjiahao_712' },
					{ name: 'Melody', value: 'girlfriend_4_speech02' },
					{ name: 'Tender', value: 'chat1_female_new-3' },
					{ name: 'Siren', value: 'chat_0407_5-1' },
					{ name: 'Zippy', value: 'cartoon-boy-07' },
					{ name: 'Bud', value: 'uk_boy1' },
					{ name: 'Sprite', value: 'cartoon-girl-01' },
					{ name: 'Candy', value: 'PeppaPig_platform' },
					{ name: 'Beacon', value: 'ai_huangzhong_712' },
					{ name: 'Rock', value: 'ai_huangyaoshi_712' },
					{ name: 'Titan', value: 'ai_laoguowang_712' },
					{ name: 'Grace', value: 'chengshu_jiejie' },
					{ name: 'Helen', value: 'you_pingjing' },
					{ name: 'Lore', value: 'calm_story1' },
					{ name: 'Crag', value: 'uk_man2' },
					{ name: 'Prattle', value: 'laopopo_speech02' },
					{ name: 'Hearth', value: 'laopopo_speech02' },
					{ name: 'The Reader', value: 'reader_en_m-v1' },
					{ name: 'Commercial Lady', value: 'commercial_lady_en_f-v1' },
				],
				default: 'genshin_vindi2',
				description: 'Select an English voice for speech synthesis',
			},
			{
				displayName: 'Voice Speed',
				name: 'voiceSpeed',
				type: 'number',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'video',
						],
						operation: [
							'lipSync',
						],
						inputType: [
							'text2video',
						],
					},
				},
				typeOptions: {
					minValue: 0.8,
					maxValue: 2.0,
					numberPrecision: 1,
				},
				default: 1.0,
				description: 'Speed of speech',
			},
			// Audio to Video mode fields
			{
				displayName: 'Audio Source',
				name: 'audioType',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'video',
						],
						operation: [
							'lipSync',
						],
						inputType: [
							'audio2video',
						],
					},
				},
				options: [
					{
						name: 'File',
						value: 'file',
					},
					{
						name: 'URL',
						value: 'url',
					},
				],
				default: 'url',
				description: 'How to provide audio',
			},
			{
				displayName: 'Audio File',
				name: 'audioFile',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'video',
						],
						operation: [
							'lipSync',
						],
						inputType: [
							'audio2video',
						],
						audioType: [
							'file',
						],
					},
				},
				default: '',
				description: 'Base64-encoded audio file',
			},
			{
				displayName: 'Audio URL',
				name: 'audioUrl',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'video',
						],
						operation: [
							'lipSync',
						],
						inputType: [
							'audio2video',
						],
						audioType: [
							'url',
						],
					},
				},
				default: '',
				description: 'URL of audio file',
			},
			{
				displayName: 'Callback URL',
				name: 'callbackUrl',
				type: 'string',
				required: false,
				displayOptions: {
					show: {
						resource: [
							'video',
						],
						operation: [
							'lipSync',
						],
					},
				},
				default: '',
				description: 'URL to call when lip sync is complete',
			},

			// Video Get parameters
			{
				displayName: 'Video Type',
				name: 'videoType',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'video',
						],
						operation: [
							'get',
						],
					},
				},
				options: [
					{
						name: 'Text to Video',
						value: 'text2video',
					},
					{
						name: 'Image to Video',
						value: 'image2video',
					},
					{
						name: 'Lip Sync',
						value: 'lipSync',
					},
					{
						name: 'Video Extension',
						value: 'videoExtend',
					},
					{
						name: 'Video Effects',
						value: 'effects',
					},
				],
				default: 'text2video',
				description: 'Type of video generation',
			},
			{
				displayName: 'Task ID',
				name: 'taskId',
				type: 'string',
				displayOptions: {
					show: {
						resource: [
							'video',
						],
						operation: [
							'get',
						],
					},
				},
				default: '',
				description: 'ID of the video generation task',
			},
			{
				displayName: 'External Task ID',
				name: 'externalTaskId',
				type: 'string',
				displayOptions: {
					show: {
						resource: [
							'video',
						],
						operation: [
							'get',
						],
					},
				},
				default: '',
				description: 'Custom ID for the task (if provided during creation)',
			},

			// Video List parameters
			{
				displayName: 'Video Type',
				name: 'videoType',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'video',
						],
						operation: [
							'list',
						],
					},
				},
				options: [
					{
						name: 'Text to Video',
						value: 'text2video',
					},
					{
						name: 'Image to Video',
						value: 'image2video',
					},
					{
						name: 'Lip Sync',
						value: 'lipSync',
					},
					{
						name: 'Video Extension',
						value: 'videoExtend',
					},
					{
						name: 'Video Effects',
						value: 'effects',
					},
				],
				default: 'text2video',
				description: 'Type of video generation',
			},
			{
				displayName: 'Additional Options',
				name: 'additionalOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: [
							'video',
						],
						operation: [
							'list',
						],
					},
				},
				options: [
					{
						displayName: 'Page Number',
						name: 'pageNum',
						type: 'number',
						typeOptions: {
							minValue: 1,
						},
						default: 1,
						description: 'Page number to retrieve',
					},
					{
						displayName: 'Page Size',
						name: 'pageSize',
						type: 'number',
						typeOptions: {
							minValue: 1,
							maxValue: 500,
						},
						default: 30,
						description: 'Number of results per page',
					},
				],
			},

			// Virtual Try-on parameters
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'tryOn',
						],
						operation: [
							'create',
						],
					},
				},
				options: [
					{
						name: 'Kolors Virtual Try-on V1',
						value: 'kolors-virtual-try-on-v1',
					},
					{
						name: 'Kolors Virtual Try-on V1.5',
						value: 'kolors-virtual-try-on-v1-5',
					},
				],
				default: 'kolors-virtual-try-on-v1',
				description: 'The model to use for virtual try-on',
			},
			{
				displayName: 'Human Image',
				name: 'humanImage',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'tryOn',
						],
						operation: [
							'create',
						],
					},
				},
				default: '',
				description: 'URL or Base64-encoded image of person',
			},
			{
				displayName: 'Cloth Image',
				name: 'clothImage',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'tryOn',
						],
						operation: [
							'create',
						],
					},
				},
				default: '',
				description: 'URL or Base64-encoded image of clothing',
			},
			{
				displayName: 'Callback URL',
				name: 'callbackUrl',
				type: 'string',
				required: false,
				displayOptions: {
					show: {
						resource: [
							'tryOn',
						],
						operation: [
							'create',
						],
					},
				},
				default: '',
				description: 'URL to call when try-on is complete',
			},

			// Virtual Try-on Get parameters
			{
				displayName: 'Task ID',
				name: 'taskId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'tryOn',
						],
						operation: [
							'get',
						],
					},
				},
				default: '',
				description: 'ID of the virtual try-on task',
			},

			// Virtual Try-on List parameters
			{
				displayName: 'Additional Options',
				name: 'additionalOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: [
							'tryOn',
						],
						operation: [
							'list',
						],
					},
				},
				options: [
					{
						displayName: 'Page Number',
						name: 'pageNum',
						type: 'number',
						typeOptions: {
							minValue: 1,
						},
						default: 1,
						description: 'Page number to retrieve',
					},
					{
						displayName: 'Page Size',
						name: 'pageSize',
						type: 'number',
						typeOptions: {
							minValue: 1,
							maxValue: 500,
						},
						default: 30,
						description: 'Number of results per page',
					},
				],
			},

			// Account Resource Package parameters
			{
				displayName: 'Start Time',
				name: 'startTime',
				type: 'number',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'account',
						],
						operation: [
							'getResourcePackages',
						],
					},
				},
				default: '={{Date.now() - 30 * 24 * 60 * 60 * 1000}}',
				description: 'Start time for the query (Unix timestamp in ms)',
			},
			{
				displayName: 'End Time',
				name: 'endTime',
				type: 'number',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'account',
						],
						operation: [
							'getResourcePackages',
						],
					},
				},
				default: '={{Date.now()}}',
				description: 'End time for the query (Unix timestamp in ms)',
			},
			{
				displayName: 'Resource Pack Name',
				name: 'resourcePackName',
				type: 'string',
				required: false,
				displayOptions: {
					show: {
						resource: [
							'account',
						],
						operation: [
							'getResourcePackages',
						],
					},
				},
				default: '',
				description: 'Resource package name for precise querying',
			},
		],
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		// Set base API URL
		const baseUrl = 'https://api.PiAPI.com';

		// Process each item
		for (let i = 0; i < items.length; i++) {
			try {
				// Get API token from parameter
				const apiToken = this.getNodeParameter('apiToken', i) as string;

				// Clean and format the token - remove any "Bearer " prefix if the user included it
				const cleanToken = apiToken.trim().replace(/^Bearer\s+/i, '');

				// Set up headers with properly typed object
				const headers: Record<string, string> = {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${cleanToken}`,
				};

				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;

				let endpoint = '';
				let method = 'GET';
				let body: IDataObject = {};
				let qs: IDataObject = {};

				// Build the request based on resource and operation
				if (resource === 'image') {
					if (operation === 'create') {
						// Create image generation
						endpoint = '/v1/images/generations';
						method = 'POST';

						const model = this.getNodeParameter('model', i) as string;
						const prompt = this.getNodeParameter('prompt', i) as string;
						const negativePrompt = this.getNodeParameter('negativePrompt', i, '') as string;
						const n = this.getNodeParameter('n', i, 1) as number;
						const aspectRatio = this.getNodeParameter('aspectRatio', i, '16:9') as string;
						const additionalOptions = this.getNodeParameter('additionalOptions', i, {}) as IDataObject;

						body = {
							model_name: model,
							prompt,
							n,
							aspect_ratio: aspectRatio,
						};

						if (negativePrompt) {
							body.negative_prompt = negativePrompt;
						}

						if (additionalOptions.image) {
							body.image = additionalOptions.image;

							// If the image is provided, ensure image_reference is also set
							if (!additionalOptions.imageReference) {
								// Default to 'subject' if not specified (especially important for v1-5 model)
								body.image_reference = 'subject';
							} else {
								body.image_reference = additionalOptions.imageReference;
							}
						}
						else if (additionalOptions.imageReference) {
							// If imageReference is set but no image is provided, add a warning
							this.logger.warn('Image Reference Type is set but no Reference Image is provided. This may cause an error.');
						}

						if (additionalOptions.imageFidelity !== undefined) {
							body.image_fidelity = additionalOptions.imageFidelity;
						}

						if (additionalOptions.callbackUrl) {
							body.callback_url = additionalOptions.callbackUrl;
						}
					} else if (operation === 'get') {
						// Get image generation
						const taskId = this.getNodeParameter('taskId', i) as string;
						endpoint = `/v1/images/generations/${taskId}`;
					} else if (operation === 'list') {
						// List image generations
						endpoint = '/v1/images/generations';

						const additionalOptions = this.getNodeParameter('additionalOptions', i, {}) as IDataObject;

						if (additionalOptions.pageNum) {
							qs.pageNum = additionalOptions.pageNum;
						}

						if (additionalOptions.pageSize) {
							qs.pageSize = additionalOptions.pageSize;
						}
					}
				} else if (resource === 'video') {
					if (operation === 'text2video') {
						// Text to video
						endpoint = '/v1/videos/text2video';
						method = 'POST';

						const model = this.getNodeParameter('model', i) as string;
						const prompt = this.getNodeParameter('prompt', i) as string;
						const mode = this.getNodeParameter('mode', i) as string;
						const duration = this.getNodeParameter('duration', i) as string;
						const additionalOptions = this.getNodeParameter('additionalOptions', i, {}) as IDataObject;

						body = {
							model_name: model,
							prompt,
							mode,
							duration,
						};

						if (additionalOptions.negativePrompt) {
							body.negative_prompt = additionalOptions.negativePrompt;
						}

						if (additionalOptions.cfgScale !== undefined) {
							body.cfg_scale = additionalOptions.cfgScale;
						}

						if (additionalOptions.aspectRatio) {
							body.aspect_ratio = additionalOptions.aspectRatio;
						}

						if (additionalOptions.callbackUrl) {
							body.callback_url = additionalOptions.callbackUrl;
						}

						if (additionalOptions.externalTaskId) {
							body.external_task_id = additionalOptions.externalTaskId;
						}
					} else if (operation === 'image2video') {
						// Image to video
						endpoint = '/v1/videos/image2video';
						method = 'POST';

						const model = this.getNodeParameter('model', i) as string;
						const mode = this.getNodeParameter('mode', i) as string;
						const image = this.getNodeParameter('image', i) as string;
						const prompt = this.getNodeParameter('prompt', i, '') as string;
						const duration = this.getNodeParameter('duration', i) as string;
						const additionalOptions = this.getNodeParameter('additionalOptions', i, {}) as IDataObject;

						body = {
							model_name: model,
							mode,
							image,
							duration,
						};

						if (prompt) {
							body.prompt = prompt;
						}

						if (additionalOptions.imageTail) {
							body.image_tail = additionalOptions.imageTail;
						}

						if (additionalOptions.negativePrompt) {
							body.negative_prompt = additionalOptions.negativePrompt;
						}

						if (additionalOptions.cfgScale !== undefined) {
							body.cfg_scale = additionalOptions.cfgScale;
						}

						if (additionalOptions.callbackUrl) {
							body.callback_url = additionalOptions.callbackUrl;
						}

						if (additionalOptions.externalTaskId) {
							body.external_task_id = additionalOptions.externalTaskId;
						}
					} else if (operation === 'lipSync') {
						// Lip sync
						endpoint = '/v1/videos/lip-sync';
						method = 'POST';

						const inputType = this.getNodeParameter('inputType', i) as string;
						const videoSource = this.getNodeParameter('videoSource', i) as string;
						const callbackUrl = this.getNodeParameter('callbackUrl', i, '') as string;

						// Build the input object based on the selected parameters
						const input: IDataObject = {
							mode: inputType
						};

						// Add video source
						if (videoSource === 'videoId') {
							input.video_id = this.getNodeParameter('videoId', i) as string;
						} else {
							input.video_url = this.getNodeParameter('videoUrl', i) as string;
						}

						// Add mode-specific parameters
						if (inputType === 'text2video') {
							input.text = this.getNodeParameter('text', i) as string;
							input.voice_id = this.getNodeParameter('voiceId', i) as string;
							input.voice_language = this.getNodeParameter('voiceLanguage', i) as string;
							input.voice_speed = this.getNodeParameter('voiceSpeed', i) as number;
						} else {
							// audio2video mode
							const audioType = this.getNodeParameter('audioType', i) as string;
							input.audio_type = audioType;

							if (audioType === 'file') {
								input.audio_file = this.getNodeParameter('audioFile', i) as string;
							} else {
								input.audio_url = this.getNodeParameter('audioUrl', i) as string;
							}
						}

						body = { input };

						if (callbackUrl) {
							body.callback_url = callbackUrl;
						}
					} else if (operation === 'get') {
						// Get video
						const videoType = this.getNodeParameter('videoType', i) as string;
						const taskId = this.getNodeParameter('taskId', i, '') as string;
						const externalTaskId = this.getNodeParameter('externalTaskId', i, '') as string;

						// Special handling for endpoints that use hyphen instead of camelCase
						let formattedType = videoType;
						if (videoType === 'lipSync') {
							formattedType = 'lip-sync';
						} else if (videoType === 'videoExtend') {
							formattedType = 'video-extend';
						}

						if (taskId) {
							endpoint = `/v1/videos/${formattedType}/${taskId}`;
						} else if (externalTaskId) {
							endpoint = `/v1/videos/${formattedType}/${externalTaskId}`;
						} else {
							throw new NodeOperationError(this.getNode(), 'Either Task ID or External Task ID must be provided');
						}
					} else if (operation === 'list') {
						// List videos
						const videoType = this.getNodeParameter('videoType', i) as string;

						// Special handling for endpoints that use hyphen instead of camelCase
						let formattedType = videoType;
						if (videoType === 'lipSync') {
							formattedType = 'lip-sync';
						} else if (videoType === 'videoExtend') {
							formattedType = 'video-extend';
						}

						endpoint = `/v1/videos/${formattedType}`;

						const additionalOptions = this.getNodeParameter('additionalOptions', i, {}) as IDataObject;

						if (additionalOptions.pageNum) {
							qs.pageNum = additionalOptions.pageNum;
						}

						if (additionalOptions.pageSize) {
							qs.pageSize = additionalOptions.pageSize;
						}
					}
				} else if (resource === 'tryOn') {
					if (operation === 'create') {
						// Create virtual try-on
						endpoint = '/v1/images/kolors-virtual-try-on';
						method = 'POST';

						const model = this.getNodeParameter('model', i) as string;
						const humanImage = this.getNodeParameter('humanImage', i) as string;
						const clothImage = this.getNodeParameter('clothImage', i) as string;
						const callbackUrl = this.getNodeParameter('callbackUrl', i, '') as string;

						body = {
							model_name: model,
							human_image: humanImage,
							cloth_image: clothImage,
						};

						if (callbackUrl) {
							body.callback_url = callbackUrl;
						}
					} else if (operation === 'get') {
						// Get virtual try-on
						const taskId = this.getNodeParameter('taskId', i) as string;
						endpoint = `/v1/images/kolors-virtual-try-on/${taskId}`;
					} else if (operation === 'list') {
						// List virtual try-ons
						endpoint = '/v1/images/kolors-virtual-try-on';

						const additionalOptions = this.getNodeParameter('additionalOptions', i, {}) as IDataObject;

						if (additionalOptions.pageNum) {
							qs.pageNum = additionalOptions.pageNum;
						}

						if (additionalOptions.pageSize) {
							qs.pageSize = additionalOptions.pageSize;
						}
					}
				} else if (resource === 'account') {
					if (operation === 'getResourcePackages') {
						// Get resource packages
						endpoint = '/account/costs';

						const startTime = this.getNodeParameter('startTime', i) as number;
						const endTime = this.getNodeParameter('endTime', i) as number;
						const resourcePackName = this.getNodeParameter('resourcePackName', i, '') as string;

						qs = {
							start_time: startTime,
							end_time: endTime,
						};

						if (resourcePackName) {
							qs.resource_pack_name = resourcePackName;
						}
					}
				}

				// Execute the request
				let responseData;

				const options = {
					method: method as IHttpRequestMethods,
					url: baseUrl + endpoint,
					headers,
					qs,
					body: Object.keys(body).length ? body : undefined,
					json: true,
				};

				try {
					responseData = await this.helpers.request(options);

					// Validate response data
					if (responseData === undefined) {
						throw new NodeOperationError(this.getNode(), 'No response data received from Kling AI API');
					}

					returnData.push({
						json: responseData,
						pairedItem: {
							item: i,
						},
					});
				} catch (error) {
					// Handle API-specific errors
					if (error.response?.body) {
						const errorMessage = error.response.body.message || error.response.body.error || JSON.stringify(error.response.body);

						// Add more helpful message for auth errors
						if (error.response.statusCode === 401) {
							throw new NodeOperationError(
								this.getNode(),
								`Kling AI API authentication failed: ${errorMessage}. Make sure your JWT token is valid and properly formatted according to Kling AI specifications.`,
								{ itemIndex: i }
							);
						}

						throw new NodeOperationError(this.getNode(), `Kling AI API error: ${errorMessage}`, { itemIndex: i });
					}

					if (this.continueOnFail()) {
						returnData.push({
							json: {
								error: error.message,
								details: error.description || undefined,
								statusCode: error.statusCode || undefined,
							} as JsonObject,
							pairedItem: {
								item: i,
							},
						});
						continue;
					}
					throw error;
				}
			} catch (error) {
				// Handle any other errors
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
						},
						pairedItem: {
							item: i,
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
