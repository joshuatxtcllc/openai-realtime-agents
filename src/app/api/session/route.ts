import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Proxy endpoint for the OpenAI Realtime Sessions API
export async function GET(req: NextRequest) {
  try {
    console.log("=== SESSION ROUTE DEBUG ===");
    console.log("OPENAI_API_KEY exists:", !!process.env.OPENAI_API_KEY);
    console.log("OPENAI_API_KEY length:", process.env.OPENAI_API_KEY?.length || 0);
    console.log("OPENAI_API_KEY starts with sk-:", process.env.OPENAI_API_KEY?.startsWith('sk-'));
    
    if (!process.env.OPENAI_API_KEY) {
      console.error("No OPENAI_API_KEY found in environment variables");
      return NextResponse.json(
        { error: "No API key configured" },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY 
    });

    console.log("Creating realtime session...");
    
    const session = await openai.beta.realtime.sessions.create({
      model: "gpt-4o-realtime-preview-2024-10-01",
      voice: "alloy"
    });
    
    console.log("=== OPENAI SESSION RESPONSE ===");
    console.log("Session created successfully:", !!session);
    console.log("Session ID:", session.id);
    console.log("Client secret exists:", !!session.client_secret);
    console.log("Full session object:", JSON.stringify(session, null, 2));
    
    if (!session.client_secret?.value) {
      console.error("No client_secret.value in session response");
      return NextResponse.json(
        { error: "Invalid session response from OpenAI" },
        { status: 500 }
      );
    }
    
    return NextResponse.json(session);
    
  } catch (error: any) {
    console.error("=== ERROR IN SESSION ROUTE ===");
    console.error("Error type:", error.constructor.name);
    console.error("Error message:", error.message);
    console.error("Error status:", error.status);
    console.error("Error code:", error.code);
    console.error("Full error:", error);
    
    return NextResponse.json(
      { 
        error: "Failed to create session", 
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