export interface FramingService {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  category: 'framing' | 'matting' | 'glass' | 'preservation' | 'specialty';
  features: string[];
  turnaroundDays: number;
}

export const framingServices: FramingService[] = [
  {
    id: 'custom-framing',
    name: 'Custom Picture Framing',
    description: 'Professional custom framing for artwork, photos, and memorabilia',
    basePrice: 125,
    category: 'framing',
    features: ['Custom sizing', 'Wide frame selection', 'Professional mounting'],
    turnaroundDays: 7
  },
  {
    id: 'museum-quality',
    name: 'Museum Quality Framing',
    description: 'Archival materials and conservation techniques for valuable artwork',
    basePrice: 250,
    category: 'preservation',
    features: ['Acid-free materials', 'UV protection', 'Conservation mounting', 'Archival backing'],
    turnaroundDays: 10
  },
  {
    id: 'double-matting',
    name: 'Double Matting',
    description: 'Professional double mat cutting with complementary colors',
    basePrice: 45,
    category: 'matting',
    features: ['Color coordination', 'Precision cutting', 'Acid-free materials'],
    turnaroundDays: 3
  },
  {
    id: 'uv-glass',
    name: 'UV Protection Glass',
    description: 'Museum-quality glass that blocks harmful UV rays',
    basePrice: 85,
    category: 'glass',
    features: ['99% UV protection', 'Crystal clear', 'Anti-reflective coating'],
    turnaroundDays: 2
  },
  {
    id: 'shadow-box',
    name: 'Shadow Box Framing',
    description: 'Deep frames for 3D objects and memorabilia',
    basePrice: 180,
    category: 'specialty',
    features: ['Multiple depths available', 'Custom spacing', 'Secure mounting'],
    turnaroundDays: 10
  },
  {
    id: 'canvas-stretching',
    name: 'Canvas Stretching',
    description: 'Professional canvas stretching and mounting',
    basePrice: 95,
    category: 'specialty',
    features: ['Gallery wrap', 'Museum bars', 'Proper tension'],
    turnaroundDays: 5
  },
  {
    id: 'art-restoration',
    name: 'Art Restoration',
    description: 'Professional restoration services for damaged artwork',
    basePrice: 200,
    category: 'specialty',
    features: ['Damage assessment', 'Color matching', 'Conservation techniques'],
    turnaroundDays: 14
  },
  {
    id: 'diploma-framing',
    name: 'Diploma & Certificate Framing',
    description: 'Professional framing for diplomas and certificates',
    basePrice: 150,
    category: 'framing',
    features: ['Acid-free matting', 'Professional presentation', 'Multiple sizes'],
    turnaroundDays: 5
  }
];

export const getServiceById = (id: string): FramingService | undefined => {
  return framingServices.find(service => service.id === id);
};

export const getServicesByCategory = (category: string): FramingService[] => {
  return framingServices.filter(service => service.category === category);
};