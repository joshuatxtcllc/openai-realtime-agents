import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Test basic internet connectivity first
    console.log('Testing basic internet connectivity...');
    
    const testResponse = await fetch('https://httpbin.org/get', {
      method: 'GET',
      headers: {
        'User-Agent': 'Jay\'s-Frames-Connection-Test/1.0',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });
    
    if (!testResponse.ok) {
      return NextResponse.json({
        success: false,
        error: 'Basic internet connectivity failed',
        details: `HTTP ${testResponse.status}: ${testResponse.statusText}`
      });
    }
    
    // Test OpenAI API connectivity (without authentication)
    console.log('Testing OpenAI API connectivity...');
    
    const openaiResponse = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'User-Agent': 'Jay\'s-Frames-Connection-Test/1.0',
      },
      signal: AbortSignal.timeout(15000), // 15 second timeout
    });
    
    return NextResponse.json({
      success: true,
      basicInternet: true,
      openaiReachable: openaiResponse.status !== 0,
      openaiStatus: openaiResponse.status,
      openaiStatusText: openaiResponse.statusText,
      message: openaiResponse.status === 401 
        ? 'OpenAI API is reachable (401 expected without auth)'
        : `OpenAI API responded with status ${openaiResponse.status}`
    });
    
  } catch (error: any) {
    console.error('Connection test error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Connection test failed',
      errorCode: error.cause?.code || error.code,
      details: error.toString()
    });
  }
}