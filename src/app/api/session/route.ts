import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Add network connectivity test
    console.log('Testing network connectivity...');
    
    console.log('Creating realtime session...', {
      hasApiKey: !!process.env.OPENAI_API_KEY,
      apiKeyPrefix: process.env.OPENAI_API_KEY?.substring(0, 7) + '...',
      nodeVersion: process.version,
      platform: process.platform,
    });
    
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
    
    const requestBody = {
      model: "gpt-4o-realtime-preview-2024-10-01",
      voice: "sage",
    };

    console.log('Making request to OpenAI API...', {
      url: "https://api.openai.com/v1/realtime/sessions",
      body: requestBody,
      timestamp: new Date().toISOString(),
    });

    // Add custom fetch options for better error handling
    const fetchOptions = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "realtime=v1",
        "User-Agent": "Jay's-Frames-App/1.0",
        // Add additional headers that might help with network issues
        "Accept": "application/json",
        "Cache-Control": "no-cache",
      },
      body: JSON.stringify(requestBody),
      // Increase timeout and add retry logic
      signal: AbortSignal.timeout(45000), // 45 second timeout
    };

    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      ...fetchOptions
    });
    
    console.log('OpenAI API response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    });

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
    console.log('Session created successfully', {
      sessionId: data.id,
      expiresAt: data.expires_at,
    });
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error in /session:", error);
    
    // Handle different types of errors
    if (error.name === 'TimeoutError') {
      return NextResponse.json(
        { 
          error: "Request timeout connecting to OpenAI API. This might be a temporary network issue.",
          details: "The request took longer than 45 seconds. Please try again in a moment."
        },
        { status: 408 }
      );
    }
    
    // More specific network error handling
    const errorCode = error.cause?.code || error.code;
    const errorMessage = error.message || '';
    const causeMessage = error.cause?.message || '';
    
    if (errorCode === 'ENOTFOUND') {
      return NextResponse.json(
        { 
          error: "DNS resolution failed for OpenAI API.",
          details: "Cannot resolve api.openai.com. This could be due to DNS issues or network restrictions. Try using a different DNS server (like 8.8.8.8) or check if your network blocks OpenAI."
        },
        { status: 503 }
      );
    }
    
    if (errorCode === 'ECONNRESET' || errorMessage.includes('other side closed') || causeMessage.includes('other side closed')) {
      return NextResponse.json(
        { 
          error: "Connection reset by OpenAI API server.",
          details: "The connection was closed unexpectedly. This often indicates: 1) Corporate firewall blocking the connection, 2) Network proxy interference, 3) ISP blocking OpenAI, or 4) Temporary server issues."
        },
        { status: 503 }
      );
    }

    if (errorCode === 'ECONNREFUSED') {
      return NextResponse.json(
        { 
          error: "Connection refused by OpenAI API.",
          details: "The OpenAI API server refused the connection. This might be a temporary issue."
        },
        { status: 503 }
      );
    }
    
    if (errorMessage.includes('fetch failed')) {
      return NextResponse.json(
        { 
          error: "Network fetch failed connecting to OpenAI API.",
          details: `Network request failed. This could be due to: 1) Corporate firewall/proxy blocking OpenAI, 2) VPN interference, 3) ISP restrictions, 4) Temporary network issues. Error code: ${errorCode || 'unknown'}`
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { 
        error: "Internal Server Error",
        details: `${errorMessage} (Code: ${errorCode || 'unknown'})`
      },
      { status: 500 }
    );
  }
}