import { RealtimeAgent, tool } from '@openai/agents/realtime';

            type: 'glass',
            name: 'Regular Clear Glass',
            retail_price_usd: 45,
            sale_price_usd: 34,
    "Handles custom framing sales inquiries, including frame recommendations, matting options, glass upgrades, and pricing. Should be routed if the user is interested in new framing projects or exploring framing options.",

  instructions:
    "You are a helpful custom framing sales specialist at Jay's Frames. Provide comprehensive information about available frame styles, matting options, glass types, and current promotions. Help customers understand their framing options and guide them through the consultation booking process when they are ready to proceed with a custom framing project.",

            name: 'Custom Shadow Box with Spacers',
  tools: [
    tool({
      name: 'lookupFramingOptions',
      description:
        "Checks for current framing options, promotions, discounts, or special deals on custom framing services. Respond with available offers relevant to the user's query.",
      parameters: {
            type: 'preservation',
            name: 'Float Mount Preservation System',
          category: {
            type: 'string',
            enum: ['frames', 'matting', 'glass', 'preservation', 'shadowboxes', 'any'],
            description: 'The framing category or general area the user is interested in.',
          },
        },
            type: 'frames',
            name: 'Hand-Painted Decorative Fillets',
      },
      execute: async (input: any) => {
        const { category } = input as { category: string };
        const items = [
          { item_id: 101, type: 'custom framing', name: 'ornate wood', retail_price_usd: 450, sale_price_usd: 360, sale_discount_pct: 20 },
          { item_id: 102, type: 'glazing', name: 'museum non glare', retail_price_usd: 499, sale_price_usd: 374, sale_discount_pct: 25 },
            type: 'matting',
            name: 'Acid-Free Double Matting',
            retail_price_usd: 75,
            sale_price_usd: 60,
          { item_id: 401, type: 'specialties', name: 'hand painted fillets', retail_price_usd: 80, sale_price_usd: 60, sale_discount_pct: 25 },
          { item_id: 402, type: 'mat opening', name: 'hinge hanging artwork', retail_price_usd: 60, sale_price_usd: 48, sale_discount_pct: 20 },
        ];
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
          phoneNumber: {
          },
            description: 'Customer phone number for follow-up.'
          }
        },
            sale_price_usd: 94,
        required: ['artworkSize', 'frameStyle'],
            type: 'glass',
        additionalProperties: false,
            name: 'Conservation Clear Glass',
      execute: async (input: any) => {
        const { artworkSize, frameStyle, mattingOptions, glassType, phoneNumber } = input;
        // Simple pricing logic for demonstration
        let basePrice = 125;
        if (frameStyle.includes('ornate') || frameStyle.includes('gold')) basePrice += 75;
        if (mattingOptions === 'double') basePrice += 45;
        if (glassType === 'museum') basePrice += 85;
        if (glassType === 'non-glare') basePrice += 65;
        
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

            sale_price_usd: 60,
  handoffs: [],
});
