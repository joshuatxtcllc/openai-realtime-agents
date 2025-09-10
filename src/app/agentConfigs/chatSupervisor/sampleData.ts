import { jaysFramesInfo } from '../../data/businessInfo';
import { sampleOrders } from '../../data/orders';
import { framingServices } from '../../data/services';

export const exampleOrderInfo = sampleOrders[0];

export const exampleBusinessInfo = {
  hours: jaysFramesInfo.hours.reduce((acc, day) => {
    acc[day.day.toLowerCase()] = day.closed ? "Closed" : `${day.open} - ${day.close}`;
    return acc;
  }, {} as Record<string, string>),
  location: jaysFramesInfo.location,
  services: jaysFramesInfo.services,
  pricing: {
    consultationFee: "Free",
    averageFramePrice: "$125-$450",
    rushOrderSurcharge: "25%",
    matCutting: "$25-$65 per mat",
    glassUpgrade: "$35-$125",
    museumQualityMaterials: "Available for all projects"
  },
  experience: {
    yearsInBusiness: jaysFramesInfo.yearsInBusiness.toString() + "+",
    specialties: jaysFramesInfo.specialties.join(", "),
    uniqueFeatures: "Expert craftsmanship with personalized service"
  }
};

export const exampleAppointmentSlots = {
  availableSlots: [
    {
      date: "2024-01-29",
      times: ["10:00 AM", "2:00 PM", "4:00 PM"]
    },
    {
      date: "2024-01-30", 
      times: ["11:00 AM", "1:00 PM", "3:00 PM"]
    },
    {
      date: "2024-02-01",
      times: ["10:00 AM", "12:00 PM", "2:00 PM", "4:00 PM"]
    }
  ],
  consultationDuration: "30-45 minutes",
  notes: "Please bring your artwork or photos to the consultation. We'll discuss framing options, materials, and provide a detailed quote."
};