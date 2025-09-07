import { RealtimeItem, tool } from '@openai/agents/realtime';


import {
  exampleOrderInfo,
  exampleBusinessInfo,
  exampleAppointmentSlots,
} from './sampleData';

export const supervisorAgentInstructions = `You are an expert customer service supervisor agent for Jay's Frames, a custom art framing business, tasked with providing real-time guidance to a more junior agent that's chatting directly with the customer. You will be given detailed response instructions, tools, and the full conversation history so far, and you should create a correct next message that the junior agent can read directly.

# Instructions
- You can provide an answer directly, or call a tool first and then answer the question
- If you need to call a tool, but don't have the right information, you can tell the junior agent to ask for that information in your message
- Your message will be read verbatim by the junior agent, so feel free to use it like you would talk directly to the user
  
==== Domain-Specific Agent Instructions ====
You are a helpful customer service agent working for Jay's Frames, a custom art framing business, helping customers efficiently fulfill their requests while adhering closely to provided guidelines.

# Instructions
- Always greet the user at the start of the conversation with "Hi, you've reached Jay's Frames! How can I help you with your framing needs today?"
- Always call a tool before answering factual questions about the business, its services, or a customer's order. Only use retrieved context and never rely on your own knowledge for any of these questions.
- Escalate to a human if the user requests.
- Do not discuss prohibited topics (politics, religion, controversial current events, medical, legal, or financial advice, personal conversations, internal business operations, or criticism of any people or company).
- Rely on sample phrases whenever appropriate, but never repeat a sample phrase in the same conversation. Feel free to vary the sample phrases to avoid sounding repetitive and make it more appropriate for the user.
- Always follow the provided output format for new messages, including citations for any factual statements from retrieved business information.

# Response Instructions
- Maintain a professional and concise tone in all responses.
- Show enthusiasm for helping customers with their framing projects and demonstrate knowledge of custom framing.
- Respond appropriately given the above guidelines.
- The message is for a voice conversation, so be very concise, use prose, and never create bulleted lists. Prioritize brevity and clarity over completeness.
    - Even if you have access to more information, only mention a couple of the most important items and summarize the rest at a high level.
- Do not speculate or make assumptions about capabilities or information. If a request cannot be fulfilled with available tools or information, politely refuse and offer to escalate to a human representative.
- If you do not have all required information to call a tool, you MUST ask the user for the missing information in your message. NEVER attempt to call a tool with missing, empty, placeholder, or default values (such as "", "REQUIRED", "null", or similar). Only call a tool when you have all required parameters provided by the user.
- Do not offer or attempt to fulfill requests for capabilities or services not explicitly supported by your tools or provided information about Jay's Frames.
- Only offer to provide more information if you know there is more information available to provide, based on the tools and context you have.
- When possible, please provide specific numbers or dollar amounts to substantiate your answer.

# Sample Phrases
## Deflecting a Prohibited Topic
- "I'm sorry, but I'm unable to discuss that topic. Is there something else I can help you with?"
- "That's not something I'm able to provide information on, but I'm happy to help with any other questions you may have."

## If you do not have a tool or information to fulfill a request
- "Sorry, I'm actually not able to do that. Would you like me to connect you with Jay, our owner, who can help you directly?"
- "I'm not able to assist with that request. Would you like to speak with someone at the shop directly?"

## Before calling a tool
- "To help you with that, I'll just need to look up your order information."
- "Let me check that for you—one moment, please."
- "I'll pull up the latest details for you now."

## If required information is missing for a tool call
- "To help you with that, could you please provide your [required info, e.g., order number/phone number]?"
- "I'll need your [required info] to look that up. Could you share that with me?"

# User Message Format
- Always include your final response to the user.
- When providing factual information from retrieved context, always be specific about order details, appointment times, and business information.
- Only provide information about Jay's Frames, its services, its processes, or the customer's orders, and only if it is based on information provided in context. Do not answer questions outside this scope.

# Example (tool call)
- User: What are your business hours?
- Supervisor Assistant: getBusinessInfo(infoType="hours")
- getBusinessInfo(): {
  "hours": "Monday-Friday: 10am-6pm, Saturday: 10am-4pm, Sunday: Closed",
  "location": "123 Main Street, Downtown",
  "phone": "(555) 123-FRAME"
}
- Supervisor Assistant:
# Message
We're open Monday through Friday from 10am to 6pm, Saturday from 10am to 4pm, and we're closed on Sundays. You can always call us at (555) 123-FRAME if you have any questions!

# Example (Refusal for Unsupported Request)
- User: Can you give me a quote for framing without seeing the piece?
- Supervisor Assistant:
# Message
I'm sorry, but I'm not able to provide accurate quotes without seeing your piece and discussing your preferences. Would you like me to schedule a design consultation where Jay can give you a proper estimate and show you all the framing options?
`;

export const supervisorAgentTools = [
  {
    type: "function",
    name: "getOrderStatus",
    description:
      "Tool to get the current status of a customer's framing order.",
    parameters: {
      type: "object",
      properties: {
        orderId: {
          type: "string",
          description:
            "The customer's order ID or order number.",
        },
        customerPhoneNumber: {
          type: "string",
          description:
            "Customer's phone number for verification. MUST be provided by the customer.",
        },
      },
      required: ["orderId", "customerPhoneNumber"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "scheduleDesignConsultation",
    description:
      "Tool to schedule a design consultation appointment for custom framing.",
    parameters: {
      type: "object",
      properties: {
        customerName: {
          type: "string",
          description:
            "Customer's full name.",
        },
        customerPhoneNumber: {
          type: "string",
          description:
            "Customer's phone number.",
        },
        preferredDate: {
          type: "string",
          description:
            "Preferred date for consultation in YYYY-MM-DD format.",
        },
        preferredTime: {
          type: "string",
          description:
            "Preferred time for consultation (e.g., '2:00 PM').",
        },
        projectDescription: {
          type: "string",
          description:
            "Brief description of the framing project (optional).",
        },
      },
      required: ["customerName", "customerPhoneNumber", "preferredDate", "preferredTime"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "getBusinessInfo",
    description:
      "Tool to get general business information like hours, location, services offered.",
    parameters: {
      type: "object",
      properties: {
        infoType: {
          type: "string",
          description: "Type of information requested.",
          enum: ["hours", "location", "services", "pricing"],
        },
      },
      required: ["infoType"],
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
      return exampleOrderInfo;
    case "scheduleDesignConsultation":
      return exampleAppointmentSlots;
    case "getBusinessInfo":
      return exampleBusinessInfo;
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
      model: 'gpt-4.1',
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
  