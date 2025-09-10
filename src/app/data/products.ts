export interface FrameProduct {
  id: string;
  name: string;
  description: string;
  material: string;
  style: string;
  colors: string[];
  pricePerLinearFoot: number;
  category: 'wood' | 'metal' | 'ornate' | 'modern' | 'classic';
  inStock: boolean;
  image?: string;
}

export interface MattingOption {
  id: string;
  name: string;
  color: string;
  texture: string;
  price: number;
  acidFree: boolean;
}

export interface GlassOption {
  id: string;
  name: string;
  description: string;
  price: number;
  features: string[];
}

export const frameProducts: FrameProduct[] = [
  {
    id: 'oak-classic',
    name: 'Classic Oak Frame',
    description: 'Traditional oak frame with natural wood grain',
    material: 'Oak Wood',
    style: 'Classic',
    colors: ['Natural Oak', 'Dark Oak', 'Weathered Oak'],
    pricePerLinearFoot: 12,
    category: 'wood',
    inStock: true
  },
  {
    id: 'gold-ornate',
    name: 'Ornate Gold Frame',
    description: 'Decorative gold leaf frame with intricate details',
    material: 'Wood with Gold Leaf',
    style: 'Ornate',
    colors: ['Antique Gold', 'Bright Gold', 'Champagne Gold'],
    pricePerLinearFoot: 25,
    category: 'ornate',
    inStock: true
  },
  {
    id: 'black-metal',
    name: 'Modern Black Metal',
    description: 'Sleek black metal frame for contemporary artwork',
    material: 'Aluminum',
    style: 'Modern',
    colors: ['Matte Black', 'Glossy Black', 'Brushed Black'],
    pricePerLinearFoot: 8,
    category: 'metal',
    inStock: true
  },
  {
    id: 'silver-metal',
    name: 'Silver Metal Frame',
    description: 'Contemporary silver metal frame',
    material: 'Aluminum',
    style: 'Modern',
    colors: ['Brushed Silver', 'Polished Silver', 'Antique Silver'],
    pricePerLinearFoot: 9,
    category: 'metal',
    inStock: true
  },
  {
    id: 'walnut-premium',
    name: 'Premium Walnut Frame',
    description: 'High-quality walnut frame with rich grain',
    material: 'Walnut Wood',
    style: 'Classic',
    colors: ['Natural Walnut', 'Dark Walnut', 'Honey Walnut'],
    pricePerLinearFoot: 18,
    category: 'wood',
    inStock: true
  },
  {
    id: 'white-modern',
    name: 'Modern White Frame',
    description: 'Clean white frame perfect for contemporary spaces',
    material: 'Painted Wood',
    style: 'Modern',
    colors: ['Pure White', 'Off White', 'Cream White'],
    pricePerLinearFoot: 10,
    category: 'modern',
    inStock: true
  }
];

export const mattingOptions: MattingOption[] = [
  {
    id: 'white-acid-free',
    name: 'Museum White Mat',
    color: 'White',
    texture: 'Smooth',
    price: 25,
    acidFree: true
  },
  {
    id: 'cream-acid-free',
    name: 'Cream Mat',
    color: 'Cream',
    texture: 'Smooth',
    price: 25,
    acidFree: true
  },
  {
    id: 'black-acid-free',
    name: 'Black Mat',
    color: 'Black',
    texture: 'Smooth',
    price: 30,
    acidFree: true
  },
  {
    id: 'navy-acid-free',
    name: 'Navy Blue Mat',
    color: 'Navy Blue',
    texture: 'Smooth',
    price: 30,
    acidFree: true
  },
  {
    id: 'burgundy-acid-free',
    name: 'Burgundy Mat',
    color: 'Burgundy',
    texture: 'Smooth',
    price: 30,
    acidFree: true
  }
];

export const glassOptions: GlassOption[] = [
  {
    id: 'standard-clear',
    name: 'Standard Clear Glass',
    description: 'Basic clear glass for everyday framing',
    price: 25,
    features: ['Clear visibility', 'Standard protection']
  },
  {
    id: 'uv-protection',
    name: 'UV Protection Glass',
    description: 'Glass that blocks harmful UV rays',
    price: 65,
    features: ['99% UV protection', 'Prevents fading', 'Crystal clear']
  },
  {
    id: 'museum-glass',
    name: 'Museum Quality Glass',
    description: 'Premium glass with maximum protection and clarity',
    price: 125,
    features: ['99% UV protection', 'Anti-reflective', 'Maximum clarity', 'Conservation grade']
  },
  {
    id: 'non-glare',
    name: 'Non-Glare Glass',
    description: 'Reduces reflections and glare',
    price: 45,
    features: ['Reduced glare', 'Matte finish', 'Good visibility']
  }
];

export const getFrameById = (id: string): FrameProduct | undefined => {
  return frameProducts.find(frame => frame.id === id);
};

export const getFramesByCategory = (category: string): FrameProduct[] => {
  return frameProducts.filter(frame => frame.category === category);
};

export const getMattingById = (id: string): MattingOption | undefined => {
  return mattingOptions.find(mat => mat.id === id);
};

export const getGlassById = (id: string): GlassOption | undefined => {
  return glassOptions.find(glass => glass.id === id);
};