export interface BusinessHours {
  day: string;
  open: string;
  close: string;
  closed: boolean;
}

export interface BusinessLocation {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  website: string;
}

export interface BusinessInfo {
  name: string;
  tagline: string;
  description: string;
  yearsInBusiness: number;
  location: BusinessLocation;
  hours: BusinessHours[];
  services: string[];
  specialties: string[];
  certifications: string[];
}

export const jaysFramesInfo: BusinessInfo = {
  name: "Jay's Frames",
  tagline: "Custom Picture Framing in Houston",
  description: "With over 15 years of experience, Jay's Frames specializes in museum-quality craftsmanship, custom framing, art restoration, and design consultations. We serve the Houston area with personalized service and expert craftsmanship.",
  yearsInBusiness: 15,
  location: {
    name: "Jay's Frames",
    address: "218 W. 27th Street",
    city: "Houston",
    state: "TX",
    zipCode: "77008",
    phone: "(832) 893-3794",
    email: "info@jaysframes.com",
    website: "jaysframes.com"
  },
  hours: [
    { day: "Monday", open: "10:00 AM", close: "6:00 PM", closed: false },
    { day: "Tuesday", open: "10:00 AM", close: "6:00 PM", closed: false },
    { day: "Wednesday", open: "10:00 AM", close: "6:00 PM", closed: false },
    { day: "Thursday", open: "10:00 AM", close: "6:00 PM", closed: false },
    { day: "Friday", open: "10:00 AM", close: "6:00 PM", closed: false },
    { day: "Saturday", open: "11:00 AM", close: "5:00 PM", closed: false },
    { day: "Sunday", open: "", close: "", closed: true }
  ],
  services: [
    "Custom Picture Framing",
    "Art Restoration",
    "Matting & Design",
    "Canvas Stretching",
    "Shadow Boxes",
    "Ready-Made Frames",
    "Sports Memorabilia Framing",
    "Diploma and Certificate Framing",
    "Large Format Fine Art Printing",
    "Photography Giclee Printing",
    "Frame Repair",
    "Glass Replacement",
    "Pickup and Delivery Services",
    "In-Home Consultations",
    "Commercial Framing Solutions"
  ],
  specialties: [
    "Museum-quality preservation",
    "Acid-free materials",
    "UV protection glass",
    "Conservation mounting",
    "Archival backing systems",
    "Custom matting design",
    "Antique frame restoration",
    "Sports jersey framing",
    "Wedding dress preservation",
    "Military memorabilia"
  ],
  certifications: [
    "Professional Picture Framers Association (PPFA) Certified",
    "Conservation Framing Specialist",
    "Museum Quality Standards Certified"
  ]
};

export const getBusinessHours = (): BusinessHours[] => {
  return jaysFramesInfo.hours;
};

export const getBusinessLocation = (): BusinessLocation => {
  return jaysFramesInfo.location;
};

export const getBusinessServices = (): string[] => {
  return jaysFramesInfo.services;
};

export const isOpenToday = (): boolean => {
  const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
  const todayHours = jaysFramesInfo.hours[today === 0 ? 6 : today - 1]; // Adjust for array index
  return !todayHours.closed;
};

export const getTodaysHours = (): BusinessHours | null => {
  const today = new Date().getDay();
  const todayHours = jaysFramesInfo.hours[today === 0 ? 6 : today - 1];
  return todayHours;
};