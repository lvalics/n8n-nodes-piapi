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
