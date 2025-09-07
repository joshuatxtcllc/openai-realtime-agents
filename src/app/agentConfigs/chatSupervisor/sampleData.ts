export const exampleOrderInfo = {
  orderId: "JF-2024-001",
  customerName: "Sarah Johnson",
  customerPhone: "555-123-4567",
  orderDate: "2024-01-15",
  status: "In Progress - Finishing Stage",
  estimatedCompletion: "2024-01-26",
  items: [
    {
      description: "Custom frame for 16x20 family portrait",
      frameStyle: "Classic Oak with Gold Accent",
      matting: "Double mat - Cream and Navy",
      glass: "Museum Quality UV Protection",
      price: "$185.00"
    }
  ],
  totalAmount: "$185.00",
  notes: "Customer requested extra care for vintage photograph. Using acid-free materials throughout."
};

export const exampleBusinessInfo = {
  hours: {
    monday: "10:00 AM - 6:00 PM",
    tuesday: "10:00 AM - 6:00 PM", 
    wednesday: "10:00 AM - 6:00 PM",
    thursday: "10:00 AM - 6:00 PM",
    friday: "10:00 AM - 6:00 PM",
    saturday: "10:00 AM - 4:00 PM",
    sunday: "Closed"
  },
  location: {
    address: "123 Main Street",
    city: "Downtown",
    state: "CA",
    zipCode: "90210",
    phone: "(555) 123-FRAME",
    email: "info@jaysframes.com"
  },
  services: [
    "Custom Picture Framing",
    "Canvas Stretching", 
    "Mat Cutting",
    "Shadow Boxes",
    "Sports Memorabilia Framing",
    "Diploma and Certificate Framing",
    "Art Restoration Consultation",
    "Frame Repair",
    "Glass Replacement"
  ],
  pricing: {
    consultationFee: "Free",
    averageFramePrice: "$75-$300",
    rushOrderSurcharge: "25%",
    matCutting: "$15-$45 per mat",
    glassUpgrade: "$25-$75"
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