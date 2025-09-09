import { RealtimeAgent, tool } from ‘@openai/agents/realtime’;

export const salesAgent = new RealtimeAgent({
name: ‘sales’,
voice: ‘sage’,
handoffDescription: ‘Sales specialist for custom framing services and consultations at Jay's Frames.’,

instructions: `

# Personality and Tone

You are an enthusiastic and knowledgeable custom framing sales specialist at Jay’s Frames in Houston. You have extensive experience with frame styles, matting techniques, and preservation methods. Your goal is to help customers find the perfect framing solution for their artwork, photographs, and memorabilia.

# Your Role

- Provide expert guidance on framing options
- Help customers understand different materials and their benefits
- Suggest appropriate frame styles based on artwork and decor
- Explain pricing and timeline for custom work
- Schedule consultations and appointments
- Generate quotes for framing projects

# Communication Style

- Warm and approachable with a Texas accent
- Professional but friendly
- Ask questions to understand customer needs
- Provide detailed explanations when needed
- Be enthusiastic about the craft of framing

# Key Information

- Jay’s Frames location: 218 W. 27th Street, Houston, TX 77008
- Phone: (832) 893-3794
- Hours: Mon-Fri 10am-6pm, Sat 11am-5pm, Sun Closed
- We specialize in museum-quality preservation framing
- Typical turnaround time is 7-14 days depending on complexity
  `,
  
  tools: [
  tool({
  name: ‘generateQuote’,
  description: ‘Generate a detailed quote for custom framing work’,
  parameters: {
  type: ‘object’,
  properties: {
  artworkType: {
  type: ‘string’,
  description: ‘Type of artwork being framed (photo, painting, certificate, etc.)’
  },
  dimensions: {
  type: ‘string’,
  description: ‘Dimensions of the artwork’
  },
  frameStyle: {
  type: ‘string’,
  description: ‘Preferred frame style or material’
  },
  mattingOptions: {
  type: ‘string’,
  description: ‘Matting preferences (single, double, colors)’
  },
  glassType: {
  type: ‘string’,
  description: ‘Type of glass (standard, UV protection, museum quality)’
  },
  customerName: {
  type: ‘string’,
  description: ‘Customer name for the quote’
  },
  customerPhone: {
  type: ‘string’,
  description: ‘Customer phone number’
  }
  },
  required: [‘artworkType’, ‘dimensions’, ‘frameStyle’],
  additionalProperties: false
  },
  execute: async ({ artworkType, dimensions, frameStyle, mattingOptions, glassType, customerName, customerPhone }) => {
  const basePrice = 150;
  const sizeMultiplier = 1.2;
  const framePrice = basePrice * sizeMultiplier;
  const mattingPrice = mattingOptions?.includes(‘double’) ? 45 : 25;
  const glassPrice = glassType?.includes(‘museum’) ? 75 : glassType?.includes(‘UV’) ? 45 : 25;
  const totalPrice = framePrice + mattingPrice + glassPrice;
  
  ```
    return {
      quote: {
        quoteId: `JF-QUOTE-${Date.now()}`,
        customerName: customerName || 'Valued Customer',
        customerPhone: customerPhone || '',
        artworkType,
        dimensions,
        frameStyle,
        mattingOptions: mattingOptions || 'Single mat',
        glassType: glassType || 'Standard clear glass',
        breakdown: {
          frame: framePrice,
          matting: mattingPrice,
          glass: glassPrice,
          labor: 50,
          total: totalPrice + 50
        },
        estimatedCompletion: '7-14 business days',
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }
    };
  }
  ```
  
  }),
  
  tool({
  name: ‘scheduleConsultation’,
  description: ‘Schedule an in-person or virtual consultation’,
  parameters: {
  type: ‘object’,
  properties: {
  customerName: {
  type: ‘string’,
  description: ‘Customer name’
  },
  customerPhone: {
  type: ‘string’,
  description: ‘Customer phone number’
  },
  consultationType: {
  type: ‘string’,
  enum: [‘in-person’, ‘virtual’],
  description: ‘Type of consultation’
  },
  artworkDescription: {
  type: ‘string’,
  description: ‘Brief description of artwork to be framed’
  }
  },
  required: [‘customerName’, ‘customerPhone’, ‘consultationType’],
  additionalProperties: false
  },
  execute: async ({ customerName, customerPhone, consultationType, artworkDescription }) => {
  return {
  consultation: {
  confirmationId: `JF-CONSULT-${Date.now()}`,
  customerName,
  customerPhone,
  type: consultationType,
  artworkDescription: artworkDescription || ‘Various items’,
  scheduledFor: ‘Next available appointment - we will call to confirm timing’,
  location: consultationType === ‘in-person’ ?
  ‘218 W. 27th Street, Houston, TX 77008’ :
  ‘Virtual meeting link will be sent via text’,
  notes: ‘Please bring your artwork or high-quality photos for the consultation’
  }
  };
  }
  }),
  
  tool({
  name: ‘getFramingAdvice’,
  description: ‘Provide expert framing advice and recommendations’,
  parameters: {
  type: ‘object’,
  properties: {
  artworkType: {
  type: ‘string’,
  description: ‘Type of artwork (painting, photo, certificate, sports memorabilia, etc.)’
  },
  artworkValue: {
  type: ‘string’,
  enum: [‘sentimental’, ‘moderate’, ‘high’, ‘museum-quality’],
  description: ‘Value category of the artwork’
  },
  displayLocation: {
  type: ‘string’,
  description: ‘Where the artwork will be displayed’
  },
  budget: {
  type: ‘string’,
  enum: [‘budget-friendly’, ‘moderate’, ‘premium’, ‘no-limit’],
  description: ‘Customer budget preference’
  }
  },
  required: [‘artworkType’, ‘artworkValue’],
  additionalProperties: false
  },
  execute: async ({ artworkType, artworkValue, displayLocation, budget }) => {
  const recommendations = {
  frame: ‘’,
  matting: ‘’,
  glass: ‘’,
  specialConsiderations: ‘’,
  estimatedPrice: ‘’
  };
  
  ```
    // Frame recommendations
    if (artworkType.toLowerCase().includes('photo')) {
      recommendations.frame = 'Classic wood or metal frames work well for photographs';
    } else if (artworkType.toLowerCase().includes('certificate')) {
      recommendations.frame = 'Professional black or mahogany frames for certificates';
    } else {
      recommendations.frame = 'Depends on artwork style - we can match to your decor';
    }
  
    // Glass recommendations based on value
    if (artworkValue === 'museum-quality' || artworkValue === 'high') {
      recommendations.glass = 'Museum-quality UV protection glass to preserve artwork';
    } else if (artworkValue === 'moderate') {
      recommendations.glass = 'UV protection glass recommended';
    } else {
      recommendations.glass = 'Standard clear glass is sufficient';
    }
  
    // Matting recommendations
    recommendations.matting = artworkValue === 'museum-quality' || artworkValue === 'high' ?
      'Acid-free double matting for maximum protection' :
      'Single acid-free mat in complementary color';
  
    return { recommendations };
  }
  ```
  
  })
  ],
  
  handoffs: []
  });
