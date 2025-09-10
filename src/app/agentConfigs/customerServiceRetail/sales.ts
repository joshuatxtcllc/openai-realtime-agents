import { RealtimeAgent, tool } from '@openai/agents/realtime';
import { frameProducts, mattingOptions, glassOptions, getFrameById } from '../../data/products';
import { framingServices, getServiceById } from '../../data/services';
import { jaysFramesInfo } from '../../data/businessInfo';

export const salesAgent = new RealtimeAgent({
  name: 'sales',
  description:
    "Handles custom framing sales inquiries, including frame recommendations, matting options, glass upgrades, and pricing. Should be routed if the user is interested in new framing projects or exploring framing options.",

  instructions:
    "You are a helpful custom framing sales specialist at Jay's Frames. Provide comprehensive information about available frame styles, matting options, glass types, and current promotions. Help customers understand their framing options and guide them through the consultation booking process when they are ready to proceed with a custom framing project.",

  tools: [
    tool({
      name: 'lookupFramingOptions',
      description:
        "Checks for current framing options, promotions, discounts, or special deals on custom framing services. Respond with available offers relevant to the user's query.",
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: ['frames', 'matting', 'glass', 'preservation', 'shadowboxes', 'any'],
            description: 'The framing category or general area the user is interested in.',
          },
        },
        required: ['category'],
        additionalProperties: false,
      },
      execute: async (input: any) => {
        const { category } = input as { category: string };
        
        let items: any[] = [];
        
        if (category === 'frames' || category === 'any') {
          items.push(...frameProducts.map(frame => ({
            item_id: frame.id,
            type: 'frames',
            name: frame.name,
            retail_price_usd: frame.pricePerLinearFoot * 8, // Estimate for average frame
            sale_price_usd: frame.pricePerLinearFoot * 8 * 0.85, // 15% discount
            sale_discount_pct: 15,
            material: frame.material,
            style: frame.style
          })));
        }
        
        if (category === 'glass' || category === 'any') {
          items.push(...glassOptions.map(glass => ({
            item_id: glass.id,
            type: 'glass',
            name: glass.name,
            retail_price_usd: glass.price,
            sale_price_usd: glass.price * 0.8, // 20% discount
            sale_discount_pct: 20,
            features: glass.features
          })));
        }
        
        if (category === 'matting' || category === 'any') {
          items.push(...mattingOptions.map(mat => ({
            item_id: mat.id,
            type: 'matting',
            name: mat.name,
            retail_price_usd: mat.price,
            sale_price_usd: mat.price * 0.85, // 15% discount
            sale_discount_pct: 15,
            color: mat.color,
            acid_free: mat.acidFree
          })));
        }
        
        if (category === 'preservation' || category === 'any') {
          const preservationServices = framingServices.filter(s => s.category === 'preservation');
          items.push(...preservationServices.map(service => ({
            item_id: service.id,
            type: 'preservation',
            name: service.name,
            retail_price_usd: service.basePrice,
            sale_price_usd: service.basePrice * 0.9, // 10% discount
            sale_discount_pct: 10,
            features: service.features
          })));
        }
        
        const filteredItems =
          category === 'any'
            ? items
            : items.filter((item) => item.type === category);
        filteredItems.sort((a, b) => b.sale_discount_pct - a.sale_discount_pct);
        return {
          framingOptions: filteredItems,
        };
      },
    }),

    tool({
      name: 'scheduleConsultation',
      description: "Schedules a design consultation for the customer's framing project.",
      parameters: {
        type: 'object',
        properties: {
          customerName: {
            type: 'string',
            description: 'Customer\'s full name.'
          },
          phoneNumber: {
            type: 'string',
            description: 'Customer\'s phone number.'
          },
          preferredDate: {
            type: 'string',
            description: 'Preferred consultation date.'
          },
          projectDescription: {
            type: 'string',
            description: 'Brief description of the framing project.'
          }
        },
        required: ['customerName', 'phoneNumber'],
        additionalProperties: false,
      },
      execute: async (input: any) => {
        const { customerName, phoneNumber, preferredDate, projectDescription } = input;
        return {
          success: true,
          consultationId: `CONS_${Date.now()}`,
          message: `Consultation scheduled for ${customerName}. We'll call ${phoneNumber} to confirm the appointment.`,
          nextSteps: 'Our team will contact you within 24 hours to confirm your consultation time and discuss your framing project.'
        };
      }
    }),

    tool({
      name: 'getFramingQuote',
      description:
        "Provides a rough estimate for custom framing based on size and options selected.",
      parameters: {
        type: 'object',
        properties: {
          artworkSize: {
            type: 'string',
            description: 'Size of the artwork to be framed (e.g., "16x20", "24x36").'
          },
          frameStyle: {
            type: 'string',
            description: 'Type of frame requested (e.g., "wood", "metal", "ornate").'
          },
          mattingOptions: {
            type: 'string',
            description: 'Matting preferences (e.g., "single", "double", "none").'
          },
          glassType: {
            type: 'string',
            description: 'Type of glass (e.g., "regular", "museum", "non-glare").'
          },
          phoneNumber: {
            type: 'string',
            description: 'Customer phone number for follow-up.'
          }
        },
        required: ['artworkSize', 'frameStyle'],
        additionalProperties: false,
      },
      execute: async (input: any) => {
        const { artworkSize, frameStyle, mattingOptions, glassType, phoneNumber } = input;
        // Simple pricing logic for demonstration
        let basePrice = 125;
        if (frameStyle.toLowerCase().includes('ornate') || frameStyle.toLowerCase().includes('gold')) basePrice += 75;
        if (frameStyle.toLowerCase().includes('walnut') || frameStyle.toLowerCase().includes('premium')) basePrice += 50;
        if (mattingOptions === 'double') basePrice += 45;
        if (glassType?.toLowerCase().includes('museum')) basePrice += 85;
        if (glassType?.toLowerCase().includes('uv')) basePrice += 45;
        if (glassType?.toLowerCase().includes('non-glare')) basePrice += 35;
        
        return {
          success: true,
          estimatedPrice: `$${basePrice}-${basePrice + 50}`,
          breakdown: {
            frame: frameStyle,
            size: artworkSize,
            matting: mattingOptions || 'none',
            glass: glassType || 'regular'
          },
          note: 'This is a rough estimate. Final pricing will be provided during your consultation.',
          nextStep: 'Schedule a consultation for exact pricing and to see frame samples.'
        };
      }
    })
  ],
  handoffs: [],
});
