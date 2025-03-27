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
