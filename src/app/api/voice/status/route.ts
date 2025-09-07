import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json(
        { error: "SessionId is required" },
        { status: 400 }
      );
    }

    // In a real implementation, you would check the actual session status
    return NextResponse.json({
      success: true,
      sessionId,
      status: 'active',
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error("Voice status error:", error);
    
    return NextResponse.json(
      { error: "Failed to get session status" },
      { status: 500 }
    );
  }
}