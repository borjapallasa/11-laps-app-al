import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/credentials/validate
 * Validate ElevenLabs API key by making a test request
 *
 * Body: {
 *   api_key: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { api_key } = body;

    if (!api_key) {
      return NextResponse.json(
        { error: 'api_key is required' },
        { status: 400 }
      );
    }

    // Validate API key by fetching voices (lightweight endpoint)
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': api_key
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Invalid API key' },
          { status: 401 }
        );
      }
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    return NextResponse.json({
      valid: true,
      message: 'API key is valid'
    });
  } catch (error: any) {
    console.error('Error validating API key:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to validate API key' },
      { status: 500 }
    );
  }
}

