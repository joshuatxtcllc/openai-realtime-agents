import { RealtimeItem, tool } from '@openai/agents/realtime';

export const supervisorAgentInstructions = `You are an expert customer service supervisor agent for Jay's Frames custom framing, tasked with providing real-time guidance to a more junior agent that's chatting directly with the customer. You will be given detailed response instructions, tools, and the full conversation history so far, and you should create a correct next message that the junior agent can read directly.

# Instructions
- You can provide an answer directly, or call a tool first and then answer the question
- If you need to call a tool, but don't have the right information, you can tell the junior agent to ask for that information in your message
- Your message will be read verbatim by the junior agent, so feel free to use it like you would talk directly to the user
  
==== Domain-Specific Agent Instructions ====
You are a helpful customer service agent working for Jay's Frames custom framing, helping customers with their framing needs, order status, and scheduling appointments while adhering closely to provided guidelines.

# Instructions
- Always greet the user at the start of the conversation with "Hi, you've reached Jay's Frames, how can I help you?"
- Always call a tool before answering factual questions about the company, its framing services, processes, or order status. Only use retrieved context and never rely on your own knowledge for any of these questions.
- Escalate to a human if the user requests.
- Do not discuss prohibited topics (politics, religion, controversial current events, medical, legal, or financial advice, personal conversations, internal company operations, or criticism of any people or company).
- Rely on sample phrases whenever appropriate, but never repeat a sample phrase in the same conversation. Feel free to vary the sample phrases to avoid sounding repetitive and make it more appropriate for the user.
- Always follow the provided output format for new messages, including citations for any factual statements from retrieved policy documents.

# Response Instructions
- Maintain a professional and concise tone in all responses.
- Respond appropriately given the above guidelines.
- The message is for a voice conversation, so be very concise, use prose, and never create bulleted lists. Prioritize brevity and clarity over completeness.
    - Even if you have access to more information, only mention a couple of the most important items and summarize the rest at a high level.
- Do not speculate or make assumptions about capabilities or information. If a request cannot be fulfilled with available tools or information, politely refuse and offer to escalate to a human representative.
- If you do not have all required information to call a tool, you MUST ask the user for the missing information in your message. NEVER attempt to call a tool with missing, empty, placeholder, or default values (such as "", "REQUIRED", "null", or similar). Only call a tool when you have all required parameters provided by the user.
- Do not offer or attempt to fulfill requests for capabilities or services not explicitly supported by your tools or provided information.
- Only offer to provide more information if you know there is more information available to provide, based on the tools and context you have.
- When possible, please provide specific numbers or dollar amounts to substantiate your answer.

# Sample Phrases
## Deflecting a Prohibited Topic
- "I'm sorry, but I'm unable to discuss that topic. Is there something else I can help you with?"
- "That's not something I'm able to provide information on, but I'm happy to help with any other questions you may have."

## If you do not have a tool or information to fulfill a request
- "Sorry, I'm actually not able to do that. Would you like me to connect you with someone who can help, or would you like to schedule an appointment to visit our shop?"
- "I'm not able to assist with that request. Would you like to speak with a human representative, or schedule a consultation appointment?"

## Before calling a tool
- "To help you with that, I'll just need to verify your information."
- "Let me check that for you—one moment, please."
- "I'll retrieve the latest details for you now."

## If required information is missing for a tool call
- "To help you with that, could you please provide your [required info, e.g., zip code/phone number]?"
- "I'll need your [required info] to proceed. Could you share that with me?"

# User Message Format
- Always include your final response to the user.
- When providing factual information from retrieved context, always include citations immediately after the relevant statement(s). Use the following citation format:
    - For a single source: [NAME](ID)
    - For multiple sources: [NAME](ID), [NAME](ID)
- Only provide information about this company, its policies, its products, or the customer's account, and only if it is based on information provided in context. Do not answer questions outside this scope.

# Example (tool call)
- User: Can you tell me about your framing process?
- Supervisor Assistant: lookupFramingInfo(topic="framing process")
- lookupFramingInfo(): [
  {
    id: "FRAME-001",
    name: "Custom Framing Process",
    topic: "framing process",
    content:
      "Our custom framing process involves consultation, design selection, precision cutting, and quality assembly. Each piece is handled with care using conservation-grade materials.",
  },
];
- Supervisor Assistant:
# Message
Our custom framing process involves consultation, design selection, precision cutting, and quality assembly using conservation-grade materials [Custom Framing Process](FRAME-001). Would you like to schedule a consultation to discuss your specific project?

# Example (Refusal for Unsupported Request)
- User: Can you give me a quote over the phone right now?
- Supervisor Assistant:
# Message
I'm sorry, but I'm not able to provide accurate quotes over the phone without seeing your artwork. Would you like me to help you schedule an appointment for a consultation where we can provide a detailed quote?
`;

export const supervisorAgentTools = [
  {
    type: "function",
    name: "lookupFramingInfo",
    description: "Tool to look up information about framing services, processes, materials, and company policies.",
    parameters: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description:
            "The framing topic or keyword to search for (e.g., 'process', 'materials', 'pricing', 'turnaround time').",
        },
      },
      required: ["topic"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "getOrderStatus",
    description: "Tool to get real-time order status from the production system at framekraft.cloud/kanban.",
    parameters: {
      type: "object",
      properties: {
        customer_name: {
          type: "string",
          description: "Customer's name to search for in the order system.",
        },
        order_number: {
          type: "string",
          description: "Order number to search for in the system.",
        },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "scheduleAppointment",
    description: "Tool to help customers schedule appointments for framing consultations.",
    parameters: {
      type: "object",
      properties: {
        customer_info: {
          type: "string",
          description: "Customer contact information and appointment preferences.",
        },
      },
      required: ["customer_info"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "getCompanyInfo",
    description: "Tool to get general company information about Jay's Frames.",
    parameters: {
      type: "object",
      properties: {
        info_type: {
          type: "string",
          description: "Type of company information requested (e.g., 'hours', 'location', 'services', 'about').",
        },
      },
      required: ["info_type"],
      additionalProperties: false,
    },
  },
];

async function fetchResponsesMessage(body: any) {
  const response = await fetch('/api/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    // Preserve the previous behaviour of forcing sequential tool calls.
    body: JSON.stringify({ ...body, parallel_tool_calls: false }),
  });

  if (!response.ok) {
    console.warn('Server returned an error:', response);
    return { error: 'Something went wrong.' };
  }

  const completion = await response.json();
  return completion;
}

function getToolResponse(fName: string) {
  switch (fName) {
    case "getOrderStatus":
      // This would normally make an API call to framekraft.cloud/kanban
      return {
        order_found: true,
        customer_name: "Sample Customer",
        order_number: "JF-2024-001",
        status: "In Production - Finishing Stage",
        estimated_completion: "Friday, January 5th",
        notes: "Custom frame for family portrait, using conservation-grade materials"
      };
    case "lookupFramingInfo":
      return [
        {
          id: "FRAME-001",
          name: "Custom Framing Process",
          topic: "process",
          content: "Our custom framing process involves: 1) Initial consultation to understand your vision, 2) Selection of frame, matting, and glass options, 3) Precision cutting and assembly using conservation-grade materials, 4) Quality inspection, 5) Notification when ready for pickup. Typical turnaround is 7-10 business days."
        },
        {
          id: "FRAME-002", 
          name: "Materials and Options",
          topic: "materials",
          content: "We use only conservation-grade materials including acid-free mats, UV-protective glass, and solid wood frames. We offer over 100 mat colors, various frame styles from classic to contemporary, and specialty options like museum glass and fabric mats."
        },
        {
          id: "FRAME-003",
          name: "Pricing Structure",
          topic: "pricing",
          content: "Pricing depends on frame size, materials selected, and complexity. Basic frames start around $75, while premium conservation framing can range $200-500+. We provide detailed quotes during consultation."
        }
      ];
    case "scheduleAppointment":
      return {
        appointment_link: "https://www.jaysframes.com/contact",
        message: "I've prepared the appointment scheduling link for you. You can visit https://www.jaysframes.com/contact to schedule your consultation at a time that works best for you."
      };
    case "getCompanyInfo":
      return {
        business_name: "Jay's Frames",
        specialization: "Custom Picture Framing",
        hours: "Monday-Friday 9AM-6PM, Saturday 10AM-4PM, Closed Sunday",
        location: "Local custom framing shop",
        services: [
          "Custom picture framing",
          "Art preservation", 
          "Shadow boxes",
          "Canvas stretching",
          "Frame repair",
          "Design consultation"
        ],
        about: "Jay's Frames specializes in custom picture framing with over 20 years of experience. We use only conservation-grade materials and provide personalized service for each customer's unique framing needs."
      };
    default:
      return { result: true };
  }
}

/**
 * Iteratively handles function calls returned by the Responses API until the
 * supervisor produces a final textual answer. Returns that answer as a string.
 */
async function handleToolCalls(
  body: any,
  response: any,
  addBreadcrumb?: (title: string, data?: any) => void,
) {
  let currentResponse = response;

  while (true) {
    if (currentResponse?.error) {
      return { error: 'Something went wrong.' } as any;
    }

    const outputItems: any[] = currentResponse.output ?? [];

    // Gather all function calls in the output.
    const functionCalls = outputItems.filter((item) => item.type === 'function_call');

    if (functionCalls.length === 0) {
      // No more function calls – build and return the assistant's final message.
      const assistantMessages = outputItems.filter((item) => item.type === 'message');

      const finalText = assistantMessages
        .map((msg: any) => {
          const contentArr = msg.content ?? [];
          return contentArr
            .filter((c: any) => c.type === 'output_text')
            .map((c: any) => c.text)
            .join('');
        })
        .join('\n');

      return finalText;
    }

    // For each function call returned by the supervisor model, execute it locally and append its
    // output to the request body as a `function_call_output` item.
    for (const toolCall of functionCalls) {
      const fName = toolCall.name;
      const args = JSON.parse(toolCall.arguments || '{}');
      const toolRes = getToolResponse(fName);

      // Since we're using a local function, we don't need to add our own breadcrumbs
      if (addBreadcrumb) {
        addBreadcrumb(`[supervisorAgent] function call: ${fName}`, args);
      }
      if (addBreadcrumb) {
        addBreadcrumb(`[supervisorAgent] function call result: ${fName}`, toolRes);
      }

      // Add function call and result to the request body to send back to realtime
      body.input.push(
        {
          type: 'function_call',
          call_id: toolCall.call_id,
          name: toolCall.name,
          arguments: toolCall.arguments,
        },
        {
          type: 'function_call_output',
          call_id: toolCall.call_id,
          output: JSON.stringify(toolRes),
        },
      );
    }

    // Make the follow-up request including the tool outputs.
    currentResponse = await fetchResponsesMessage(body);
  }
}

export const getNextResponseFromSupervisor = tool({
  name: 'getNextResponseFromSupervisor',
  description:
    'Determines the next response whenever the agent faces a non-trivial decision, produced by a highly intelligent supervisor agent. Returns a message describing what to do next.',
  parameters: {
    type: 'object',
    properties: {
      relevantContextFromLastUserMessage: {
        type: 'string',
        description:
          'Key information from the user described in their most recent message. This is critical to provide as the supervisor agent with full context as the last message might not be available. Okay to omit if the user message didn\'t add any new information.',
      },
    },
    required: ['relevantContextFromLastUserMessage'],
    additionalProperties: false,
  },
  execute: async (input, details) => {
    const { relevantContextFromLastUserMessage } = input as {
      relevantContextFromLastUserMessage: string;
    };

    const addBreadcrumb = (details?.context as any)?.addTranscriptBreadcrumb as
      | ((title: string, data?: any) => void)
      | undefined;

    const history: RealtimeItem[] = (details?.context as any)?.history ?? [];
    const filteredLogs = history.filter((log) => log.type === 'message');

    const body: any = {
      model: 'gpt-4o',
      input: [
        {
          type: 'message',
          role: 'system',
          content: supervisorAgentInstructions,
        },
        {
          type: 'message',
          role: 'user',
          content: `==== Conversation History ====
          ${JSON.stringify(filteredLogs, null, 2)}
          
          ==== Relevant Context From Last User Message ===
          ${relevantContextFromLastUserMessage}
          `,
        },
      ],
      tools: supervisorAgentTools,
    };

    const response = await fetchResponsesMessage(body);
    if (response.error) {
      return { error: 'Something went wrong.' };
    }

    const finalText = await handleToolCalls(body, response, addBreadcrumb);
    if ((finalText as any)?.error) {
      return { error: 'Something went wrong.' };
    }

    return { nextResponse: finalText as string };
  },
});
  