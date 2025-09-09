import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
  try {
    const { agentConfig = 'customerServiceRetail', selectedAgent } = await req.json();
    
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "No API key configured" },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY 
    });

    const session = await openai.beta.realtime.sessions.create({
      model: "gpt-4o-realtime-preview-2024-10-01",
      voice: "sage"
    });
    
    if (!session.client_secret?.value) {
      return NextResponse.json(
        { error: "Invalid session response from OpenAI" },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      sessionId: session.id,
      ephemeralKey: session.client_secret.value,
      agentConfig,
      selectedAgent
    });
    
  } catch (error: any) {
    console.error("Voice connect error:", error);
    
    return NextResponse.json(
      { 
        error: "Failed to create voice session", 
        details: {
          message: error.message,
          status: error.status,
          code: error.code
        }
      },
      { status: error.status || 500 }
    );
  }
}