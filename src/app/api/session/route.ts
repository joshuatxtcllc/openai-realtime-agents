import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('Creating realtime session...');
    
    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY environment variable is not set');
      return NextResponse.json(
        { 
          error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your .env file.',
          details: 'Create a .env file in your project root with: OPENAI_API_KEY=your_api_key_here'
        },
        { status: 500 }
      );
    }

    // Validate API key format
    if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
      console.error('Invalid OPENAI_API_KEY format');
      return NextResponse.json(
        { 
          error: 'Invalid OpenAI API key format. API keys should start with "sk-"',
          details: 'Please check your OPENAI_API_KEY in the .env file'
        },
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
        body: errorText,
      });

      // Handle specific error cases
      if (response.status === 401) {
        return NextResponse.json(
          { 
            error: 'Invalid OpenAI API key. Please check your OPENAI_API_KEY in the .env file.',
            details: `OpenAI API returned: ${response.status} - ${errorText}`
          },
          { status: 401 }
        );
      }

      if (response.status === 429) {
        return NextResponse.json(
          { 
            error: 'OpenAI API rate limit exceeded. Please try again later.',
            details: `OpenAI API returned: ${response.status} - ${errorText}`
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { 
          error: `OpenAI API Error: ${response.status} - ${response.statusText}`,
          details: errorText
        },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    console.log('Session created successfully');
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error in /session:", error);
    
    // Handle network errors specifically
    if (error.cause?.code === 'ENOTFOUND' || error.message.includes('fetch failed')) {
      return NextResponse.json(
        { 
          error: "Network error connecting to OpenAI API. Please check your internet connection.",
          details: error.message
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { 
        error: "Internal Server Error",
        details: error.message
      },
      { status: 500 }
    );
  }
}