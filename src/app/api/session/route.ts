import { NextResponse } from "next/server";

export async function GET() {
  try {
    console.log("=== SESSION ROUTE DEBUG ===");
    console.log("OPENAI_API_KEY exists:", !!process.env.OPENAI_API_KEY);
    console.log("OPENAI_API_KEY length:", process.env.OPENAI_API_KEY?.length || 0);
    console.log("OPENAI_API_KEY starts with sk-:", process.env.OPENAI_API_KEY?.startsWith('sk-'));
    
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
        }),
      }
    );
    
    console.log("OpenAI API response status:", response.status);
    console.log("OpenAI API response ok:", response.ok);
    console.log("OpenAI API response headers:", Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log("=== FULL OPENAI RESPONSE ===");
    console.log(JSON.stringify(data, null, 2));
    
    if (!response.ok) {
      console.error("OpenAI API Error:", data);
      return NextResponse.json(
        { error: "OpenAI API Error", details: data },
        { status: response.status }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in /session:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
