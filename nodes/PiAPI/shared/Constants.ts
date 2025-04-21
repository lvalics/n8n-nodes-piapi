export interface AspectRatio {
  name: string;
  description: string;
  width: number;
  height: number;
}

export const ASPECT_RATIOS: { [key: string]: AspectRatio[] } = {
  square: [
    {
      name: 'Square 1:1',
      description: 'Perfect square aspect ratio',
      width: 1024,
      height: 1024,
    },
  ],
  landscape: [
    {
      name: 'Landscape 16:9',
      description: 'Standard widescreen format',
      width: 1280,
      height: 720,
    },
    {
      name: 'Landscape 3:2',
      description: 'Common photo aspect ratio',
      width: 1200,
      height: 800,
    },
    {
      name: 'Landscape 4:3',
      description: 'Traditional TV/monitor aspect ratio',
      width: 1024,
      height: 768,
    },
    {
      name: 'Landscape 21:9',
      description: 'Ultrawide cinematic format',
      width: 1344,
      height: 576,
    },
  ],
  portrait: [
    {
      name: 'Portrait 9:16',
      description: 'Vertical video format for social media',
      width: 720,
      height: 1280,
    },
    {
      name: 'Portrait 2:3',
      description: 'Common vertical photo ratio',
      width: 800,
      height: 1200,
    },
    {
      name: 'Portrait 3:4',
      description: 'Vertical version of 4:3',
      width: 768,
      height: 1024,
    },
    {
      name: 'Portrait 4:5',
      description: 'Instagram portrait format',
      width: 864,
      height: 1080,
    },
  ],
};

// Flatten the aspect ratios for use in dropdown menus
export const ASPECT_RATIO_OPTIONS = [
  {
    name: '-- Square --',
    value: 'square_header',
    description: 'Square aspect ratios',
  },
  ...ASPECT_RATIOS.square.map((ratio) => ({
    name: ratio.name,
    value: `${ratio.width}:${ratio.height}`,
    description: ratio.description,
  })),
  {
    name: '-- Landscape --',
    value: 'landscape_header',
    description: 'Landscape aspect ratios',
  },
  ...ASPECT_RATIOS.landscape.map((ratio) => ({
    name: ratio.name,
    value: `${ratio.width}:${ratio.height}`,
    description: ratio.description,
  })),
  {
    name: '-- Portrait --',
    value: 'portrait_header',
    description: 'Portrait aspect ratios',
  },
  ...ASPECT_RATIOS.portrait.map((ratio) => ({
    name: ratio.name,
    value: `${ratio.width}:${ratio.height}`,
    description: ratio.description,
  })),
  {
    name: 'Custom',
    value: 'custom',
    description: 'Set custom dimensions',
  },
];

export const CONTROLNET_TYPES = [
  {
    name: 'None',
    value: 'none',
    description: 'Don\'t use ControlNet',
  },
  {
    name: 'Depth',
    value: 'depth',
    description: 'Control image generation using depth maps',
  },
  {
    name: 'Canny',
    value: 'canny',
    description: 'Control image generation using edge detection',
  },
  {
    name: 'Soft Edge',
    value: 'soft_edge',
    description: 'Control image generation using soft edge detection',
  },
  {
    name: 'OpenPose',
    value: 'openpose',
    description: 'Control image generation using human pose estimation',
  },
];

export const LORA_OPTIONS = [
  {
    name: 'None',
    value: 'none',
    description: 'Don\'t use any LoRA model',
  },
  {
    name: 'Anime',
    value: 'anime',
    description: 'Anime style LoRA',
  },
  {
    name: 'Art',
    value: 'art',
    description: 'Art style LoRA',
  },
  {
    name: 'Disney',
    value: 'disney',
    description: 'Disney style LoRA',
  },
  {
    name: 'Furry',
    value: 'furry',
    description: 'Furry style LoRA',
  },
  {
    name: 'MidJourney v6',
    value: 'mjv6',
    description: 'MidJourney v6 style LoRA',
  },
  {
    name: 'Realism',
    value: 'realism',
    description: 'Photorealistic style LoRA',
  },
  {
    name: 'Scenery',
    value: 'scenery',
    description: 'Landscape and scenery style LoRA',
  },
  {
    name: 'Collage Art Style',
    value: 'collage-artstyle',
    description: 'Retro collage art style LoRA',
  },
  {
    name: 'Creepycute',
    value: 'creepcute',
    description: 'Creepy but cute style LoRA',
  },
  {
    name: 'Cyberpunk Anime',
    value: 'cyberpunk-anime-style',
    description: 'Cyberpunk anime style LoRA',
  },
  {
    name: 'Deco Pulse',
    value: 'deco-pulse',
    description: 'Decorative pulse style LoRA',
  },
  {
    name: 'Deep Sea Particle',
    value: 'deep-sea-particle-enhencer',
    description: 'Deep sea particle enhancement LoRA',
  },
  {
    name: 'Faetastic Details',
    value: 'faetastic-details',
    description: 'Fae/fantasy detailed style LoRA',
  },
  {
    name: 'Fractal Geometry',
    value: 'fractal-geometry',
    description: 'Fractal geometry style LoRA',
  },
  {
    name: 'Galactixy Illustrations',
    value: 'galactixy-illustrations-style',
    description: 'Galaxy illustration style LoRA',
  },
  {
    name: 'Geometric Woman',
    value: 'geometric-woman',
    description: 'Geometric woman style LoRA',
  },
  {
    name: 'Graphic Portrait',
    value: 'graphic-portrait',
    description: 'Graphic portrait style LoRA',
  },
  {
    name: 'Mat Miller Art',
    value: 'mat-miller-art',
    description: 'Mat Miller art style LoRA',
  },
  {
    name: 'Moebius Style',
    value: 'moebius-style',
    description: 'Moebius style LoRA',
  },
  {
    name: 'OB3D Isometric Room',
    value: 'ob3d-isometric-3d-room',
    description: 'Isometric 3D room style LoRA',
  },
  {
    name: 'Paper Quilling',
    value: 'paper-quilling-and-layering-style',
    description: 'Paper quilling and layering style LoRA',
  },
];

export const GHIBLI_STYLE_OPTIONS = [
  {
    name: 'Default Ghibli Style',
    value: 'ghibli',
    description: 'Standard Studio Ghibli animation style',
  },
  // Add SFW LoRA types
  {
    name: 'Flat Color Style',
    value: 'flat-color',
    description: 'Style without visible lineart, flat colors, little to no depth',
  },
  {
    name: 'Rotation Effect',
    value: 'rotation-effect',
    description: 'Main character or object rotating 360 degrees',
  },
  {
    name: 'Live Wallpaper',
    value: 'live-wallpaper',
    description: 'Style similar to live wallpaper',
  },
  {
    name: 'Passionate Kissing',
    value: 'passionate-kissing',
    description: 'Characters kissing each other deeply',
  },
  {
    name: 'Squish Effect',
    value: 'squish-effect',
    description: 'Squish effect animation',
  },
  {
    name: 'Cakeify Effect',
    value: 'cakeify-effect',
    description: 'Making the main object cut as a cake',
  },
  {
    name: 'SingularUnity MotionCraft',
    value: 'singularunity-motioncraft',
    description: 'Fluid panning shots and dynamic rotations of subjects',
  },
  {
    name: 'Pixel Art',
    value: 'pixel-art',
    description: 'Pixel-art style animation',
  },
  {
    name: 'Super Saiyan Effect',
    value: 'super-saiyan-effect',
    description: 'Super Saiyan transformations',
  },
  {
    name: 'Inflate Effect',
    value: 'inflate-effect',
    description: 'Inflation animation effect',
  },
  {
    name: 'Deflate Effect',
    value: 'deflate-effect',
    description: 'Deflation animation effect',
  },
  {
    name: 'Crush Effect',
    value: 'crush-effect',
    description: 'Crushing animation effect',
  },
  {
    name: 'Particalize Effect',
    value: 'particalize-effect',
    description: 'Particle disintegration animation effect',
  },
  
  // Add NSFW LoRA types
  {
    name: '[NSFW] General',
    value: 'nsfw-general',
    description: 'General NSFW content',
  },
  {
    name: '[NSFW] Bouncing Boobs',
    value: 'nsfw-bouncing-boobs',
    description: 'NSFW bouncing animation',
  },
  {
    name: '[NSFW] Undress',
    value: 'nsfw-undress',
    description: 'NSFW undressing animation',
  },
  {
    name: '[NSFW] POV Blowjob',
    value: 'nsfw-pov-blowjob',
    description: 'NSFW POV animation',
  },
  {
    name: '[NSFW] POV Titfuck',
    value: 'nsfw-pov-titfuck',
    description: 'NSFW POV animation',
  },
  {
    name: '[NSFW] POV Missionary',
    value: 'nsfw-pov-missionary',
    description: 'NSFW POV animation',
  },
  {
    name: '[NSFW] POV Cowgirl',
    value: 'nsfw-pov-cowgirl',
    description: 'NSFW POV animation',
  },
  {
    name: '[NSFW] POV Doggy',
    value: 'nsfw-pov-doggy',
    description: 'NSFW POV animation',
  },
];

export const WANX_MODELS = [
  {
    name: 'Lightweight (1.3B)',
    value: 'txt2video-1.3b',
    description: 'Lightweight text-to-video generation model ($0.12 per generation)',
    price: 0.12,
  },
  {
    name: 'Advanced (14B)',
    value: 'txt2video-14b',
    description: 'Advanced text-to-video generation model ($0.28 per generation)',
    price: 0.28,
  },
  {
    name: 'Ghibli Animation (14B)',
    value: 'txt2video-14b-lora',
    description: 'Generate authentic Studio Ghibli-style animation videos ($0.28 per generation)',
    price: 0.28,
  },
  {
    name: 'Image to Video (14B)',
    value: 'img2video-14b',
    description: 'Image-to-video transformation model ($0.28 per generation)',
    price: 0.28,
  },
  {
    name: 'Keyframe Image to Video (14B)',
    value: 'img2video-14b-keyframe',
    description: 'Generate video from first and last frame images ($0.28 per generation)',
    price: 0.28,
  },
];
