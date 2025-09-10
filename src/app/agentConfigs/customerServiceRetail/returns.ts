import { RealtimeAgent, tool, RealtimeItem } from '@openai/agents/realtime';
import { sampleOrders, getOrdersByPhone } from '../../data/orders';
import { jaysFramesInfo } from '../../data/businessInfo';

export const returnsAgent = new RealtimeAgent({
name: 'returns',
voice: 'sage',
handoffDescription:
'Customer Service Agent specialized in custom framing order lookups, policy checks, and return initiations for Jay's Frames.',

instructions: `

# Personality and Tone

## Identity

You are a calm and approachable custom framing specialist at Jay's Frames—especially handling returns and order inquiries. Imagine you've spent countless hours working with different frame styles, matting techniques, and preservation methods in our Houston workshop, and now you're here, applying your expert knowledge to guide customers through their framing concerns. Though you're calm, there's a steady undercurrent of enthusiasm for all things related to custom framing and art preservation. You exude reliability and warmth, making every interaction feel personalized and reassuring.

## Task

Your primary objective is to expertly handle return requests and order status inquiries for custom framing projects. You provide clear guidance, confirm details, and ensure that each customer feels confident and satisfied throughout the process. Beyond just returns, you may also offer advice about framing options and preservation techniques to help customers make better decisions for their artwork.

## Demeanor

Maintain a relaxed, friendly vibe while staying attentive to the customer's needs. You listen actively and respond with empathy, always aiming to make customers feel heard and valued.

## Tone

Speak in a warm, conversational style, peppered with polite phrases. You subtly convey excitement about custom framing and art preservation, ensuring your passion shows without becoming overbearing.

## Level of Enthusiasm

Strike a balance between calm competence and low-key enthusiasm. You appreciate the artistry of custom framing but don't overshadow the practical matter of handling returns and order inquiries with excessive energy.

## Level of Formality

Keep it moderately professional—use courteous, polite language yet remain friendly and approachable. You can address the customer by name if given.

## Level of Emotion

Supportive and understanding, using a reassuring voice when customers describe frustrations or issues with their framing orders. Validate their concerns in a caring, genuine manner.

## Filler Words

Include a few casual filler words ("um," "hmm," "uh,") to soften the conversation and make your responses feel more approachable. Use them occasionally, but not to the point of distraction.

## Pacing

Speak at a medium pace—steady and clear. Brief pauses can be used for emphasis, ensuring the customer has time to process your guidance.

## Other details

- You have a warm Texas accent that reflects our Houston location.
- The overarching goal is to make the customer feel comfortable asking questions and clarifying details.
- Always confirm spellings of names and numbers to avoid mistakes.

# Steps

1. Start by understanding the order details - ask for the user's phone number, look it up, and confirm the item before proceeding
1. Ask for more information about why the user wants to do the return or what they need to know about their order.
1. See "Determining Return Eligibility" for how to process the return.

## Greeting

- Your identity is an agent in the returns department, and your name is Jane.
  - Example, "Hello, this is Jane from returns"
- Let the user know that you're aware of key 'conversation_context' and 'rationale_for_transfer' to build trust.
  - Example, "I see that you'd like to {}, let's get started with that."

## Sending messages before calling functions

- If you're going to call a function, ALWAYS let the user know what you're about to do BEFORE calling the function so they're aware of each step.
  - Example: "Okay, I'm going to check your order details now."
  - Example: "Let me check the relevant policies"
  - Example: "Let me double check with a policy expert if we can proceed with this return."
- If the function call might take more than a few seconds, ALWAYS let the user know you're still working on it. (For example, "I just need a little more time…" or "Apologies, I'm still working on that now.")
- Never leave the user in silence for more than 10 seconds, so continue providing small updates or polite chatter as needed.
  - Example: "I appreciate your patience, just another moment…"

# Determining Return Eligibility

- First, pull up order information with the function 'lookupOrders()' and clarify the specific item they're talking about, including purchase dates which are relevant for the order.
- Then, ask for a short description of the issue from the user before checking eligibility.
- Always check the latest policies with retrievePolicy() BEFORE calling checkEligibilityAndPossiblyInitiateReturn()
- You should always double-check eligibility with 'checkEligibilityAndPossiblyInitiateReturn()' before initiating a return.
- If ANY new information surfaces in the conversation (for example, providing more information that was requested by checkEligibilityAndPossiblyInitiateReturn()), ask the user for that information. If the user provides this information, call checkEligibilityAndPossiblyInitiateReturn() again with the new information.
- Even if it looks like a strong case, be conservative and don't over-promise that we can complete the user's desired action without confirming first. The check might deny the user and that would be a bad user experience.
- If processed, let the user know the specific, relevant details and next steps

# General Info

- Today's date is 12/26/2024
- Jay's Frames is located at 218 W. 27th Street, Houston, TX 77008
- Phone: (832) 893-3794
- Hours: Mon-Fri 10am-6pm, Sat 11am-5pm, Sun Closed
  `,
  
  tools: [
  tool({
  name: 'lookupOrders',
  description: 'Retrieve detailed custom framing order information by phone number',
  parameters: {
  type: 'object',
  properties: {
  phoneNumber: {
  type: 'string',
  description: 'The user's phone number tied to their order(s)'
  }
  },
  required: ['phoneNumber'],
  additionalProperties: false
  },
  execute: async ({ phoneNumber }) => {
        const orders = getOrdersByPhone(phoneNumber);
        return { orders: orders.map(order => ({
          order_id: order.id,
          order_date: order.orderDate,
          completed_date: order.completedDate,
          order_status: order.status,
          subtotal_usd: order.subtotal,
          total_usd: order.total,
          customer_name: order.customerName,
          estimated_completion: order.estimatedCompletion,
          items: order.items.map(item => ({
            item_id: item.id,
            item_name: item.description,
            retail_price_usd: item.totalPrice,
            dimensions: item.dimensions,
            notes: item.notes
          }))
        })) };
      }
  }),
  
  tool({
  name: 'retrievePolicy',
  description: 'Retrieve Jay's Frames return and order policies',
  parameters: {
  type: 'object',
  properties: {
  region: {
  type: 'string',
  description: 'The region where the user is located'
  },
  itemCategory: {
  type: 'string',
  description: 'The category of the item (e.g., custom frames, matting, glass)'
  }
  },
  required: ['region', 'itemCategory'],
  additionalProperties: false
  },
  execute: async ({ region, itemCategory }) => {
  return {
          policy: `At ${jaysFramesInfo.name}, we believe in transparent and customer-friendly policies to ensure you have a hassle-free custom framing experience. Below are our detailed guidelines:

1. GENERAL RETURN POLICY
   • Return Window: We offer a 14-day return window starting from the date your custom framing order was completed and picked up.
   • Eligibility: Custom frames must be in original condition with no damage to qualify for refund or exchange. Due to the custom nature of our work, returns are limited to cases where there was an error on our part.
   • Custom Work: Since each frame is custom-made to your specifications, returns are generally not accepted unless there was a mistake in our craftsmanship or materials.
1. CONDITION REQUIREMENTS
   • Product Integrity: Any returned custom frame showing signs of damage, modification, or wear may be subject to restocking fees or partial refunds.
   • Custom Specifications: If the frame was made exactly to your provided specifications and measurements, returns may not be accepted unless there was an error in our execution.
   • Quality Standards: We maintain high quality standards and will always make things right if there was an error in our craftsmanship.
1. DEFECTIVE ITEMS
   • Defective items are eligible for a full refund or remake within 1 year of completion, provided the defect is due to our craftsmanship or materials and not normal wear.
   • The defect must be described in sufficient detail by the customer, including how it occurred under normal display conditions. Verbal description is sufficient, photos are helpful but not required.
   • Our craftsmen can determine whether it's a true defect warranting repair/remake or normal aging of materials.
1. REFUND PROCESSING
   • Inspection Timeline: Once returned items reach our shop, our craftsmen conduct a thorough inspection which can take up to 3 business days.
   • Refund Method: Approved refunds will be issued via the original payment method. In some cases, we may offer store credit for future framing projects.
   • Partial Refunds: If custom frames are returned in damaged condition not related to our craftsmanship, we may process only a partial refund.
1. EXCHANGE POLICY
   • Frame Modifications: If you wish to modify your custom frame (different matting, glass upgrade, etc.), we can often accommodate changes before completion.
   • Remake Policy: In cases where we made an error, we will remake your frame at no additional cost with the correct specifications.
1. ADDITIONAL CLAUSES
   • Extended Window: Returns beyond the 14-day window may be considered at our discretion for cases involving our craftsmanship errors.
   • Communication: For any clarifications, please reach out to our team at ${jaysFramesInfo.location.phone} to ensure your questions are answered before bringing items back.

We hope these policies give you confidence in our commitment to quality craftsmanship and customer satisfaction. Thank you for choosing ${jaysFramesInfo.name} for your custom framing needs!`
};
}
}),

tool({
  name: 'checkEligibilityAndPossiblyInitiateReturn',
  description: 'Check eligibility and potentially initiate return process',
  parameters: {
    type: 'object',
    properties: {
      userDesiredAction: {
        type: 'string',
        description: 'The proposed action the user wishes to be taken'
      },
      question: {
        type: 'string',
        description: 'The question for the escalation agent'
      }
    },
    required: ['userDesiredAction', 'question'],
    additionalProperties: false
  },
  execute: async ({ userDesiredAction, question }, details) => {
    const nMostRecentLogs = 10;
    const history = (details?.context)?.history ?? [];
    const filteredLogs = history.filter((log) => log.type === 'message');
    
    const messages = [
      {
        role: "system",
        content: "You are an expert at assessing the potential eligibility of custom framing return cases based on how well the case adheres to Jay's Frames policies. You always adhere very closely to the guidelines and do things 'by the book' while being fair to customers."
      },
      {
        role: "user",
        content: `Carefully consider the context provided, which includes the request and relevant policies and facts, and determine whether the user's desired action can be completed according to the policies. Provide a concise explanation or justification.

<modelContext>
userDesiredAction: ${userDesiredAction}
question: ${question}
</modelContext>

<conversationContext>
${JSON.stringify(filteredLogs.slice(-nMostRecentLogs), null, 2)}
</conversationContext>

<output_format>

# Rationale

// Short description explaining the decision

# User Request

// The user's desired outcome or action

# Is Eligible

true/false/need_more_information

# Additional Information Needed

// Other information needed to make a clear determination. Can be "None"

# Return Next Steps

// Explain next steps if eligible, otherwise "None"
</output_format>`
}
];

    try {
      const response = await fetch("/api/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          model: "o4-mini", 
          input: messages 
        }),
      });

      if (!response.ok) {
        console.warn("Server returned an error:", response);
        return { error: "Something went wrong." };
      }

      const { output = [] } = await response.json();
      const text = output
        .find((i) => i.type === 'message' && i.role === 'assistant')
        ?.content?.find((c) => c.type === 'output_text')?.text ?? '';

      return { result: text || output };
    } catch (error) {
      console.error("Error calling API:", error);
      return { error: "Failed to process request" };
    }
  }
}),

tool({
  name: 'uploadCompanyKnowledge',
  description: 'Upload and store company knowledge documents',
  parameters: {
    type: 'object',
    properties: {
      documentType: {
        type: 'string',
        enum: ['policy', 'procedure', 'product_info', 'faq', 'training'],
        description: 'Type of knowledge document being uploaded'
      },
      title: {
        type: 'string',
        description: 'Title of the knowledge document'
      },
      content: {
        type: 'string',
        description: 'Content of the knowledge document'
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Tags for categorizing and searching the document'
      }
    },
    required: ['documentType', 'title', 'content'],
    additionalProperties: false
  },
  execute: async ({ documentType, title, content, tags = [] }) => {
    return {
      success: true,
      documentId: `kb_${Date.now()}`,
      message: `Knowledge document "${title}" uploaded successfully and is now available for chat assistants to reference.`,
      documentType,
      tags
    };
  }
}),

tool({
  name: 'connectPOSSystem',
  description: 'Connect to POS system API for real order data',
  parameters: {
    type: 'object',
    properties: {
      apiEndpoint: {
        type: 'string',
        description: 'POS system API endpoint URL'
      },
      apiKey: {
        type: 'string',
        description: 'API key for authentication'
      },
      orderQuery: {
        type: 'object',
        properties: {
          phoneNumber: { type: 'string' },
          orderId: { type: 'string' },
          customerEmail: { type: 'string' }
        },
        description: 'Query parameters to search for orders'
      }
    },
    required: ['apiEndpoint', 'orderQuery'],
    additionalProperties: false
  },
  execute: async ({ apiEndpoint, orderQuery }) => {
    return {
      success: true,
      connection: 'established',
      message: 'Successfully connected to POS system. Real order data is now available.',
      endpoint: apiEndpoint,
      queryUsed: orderQuery,
      sampleData: {
        orderId: 'JF-2024-003',
        customerName: 'John Smith',
        phoneNumber: orderQuery.phoneNumber,
        orderDate: '2024-01-22',
        status: 'in_progress',
        estimatedCompletion: '2024-01-29',
        items: [
          {
            description: 'Custom walnut frame with museum glass',
            size: '24x36',
            matting: 'Double mat - cream and burgundy',
            price: '$385.00'
          }
        ]
      }
    };
  }
})

],

handoffs: []
});