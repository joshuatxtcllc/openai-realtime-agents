import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('Creating realtime session with API key:', process.env.OPENAI_API_KEY ? 'Present' : 'Missing');
    const response = await fetch(
      "https://api.openai.com/v1/realtime/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview-2025-06-03",
          voice: "sage",
        }),
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Session creation failed:', response.status, errorText);
      return NextResponse.json(
        { error: `Session creation failed: ${response.status}` },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    console.log('Session created successfully:', data.id);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in /session:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
