import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('Creating realtime session with API key:', process.env.OPENAI_API_KEY ? 'Present' : 'Missing');
    
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is missing');
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }
    
    const response = await fetch(
      "https://api.openai.com/v1/realtime/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "realtime=v1"
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview-2024-10-01",
          voice: "sage",
        }),
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API Error:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: errorText,
        url: response.url
      });
      return NextResponse.json(
        { error: `OpenAI API Error: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    console.log('Session created successfully:', data.id || 'No ID returned');
    return NextResponse.json(data);
  } catch (error) {
    console.error("Detailed error in /session:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error: error
    });
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
