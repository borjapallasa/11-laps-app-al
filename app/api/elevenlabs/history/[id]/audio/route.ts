import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/src/lib/supabaseServer';
import { decrypt } from '@/src/lib/encryption';

/**
 * GET /api/elevenlabs/history/[id]/audio?org_uuid={uuid}
 * Stream audio from ElevenLabs history
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const orgUuid = searchParams.get('org_uuid');
    const { id } = params;

    if (!orgUuid) {
      return NextResponse.json(
        { error: 'org_uuid parameter is required' },
        { status: 400 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { error: 'History item ID is required' },
        { status: 400 }
      );
    }

    // Get API key from database
    const supabase = supabaseServer();
    const { data: credential, error: credError } = await supabase
      .from('api_credentials')
      .select('key_encrypted')
      .eq('organization_uuid', orgUuid)
      .eq('provider', 'elevenlabs')
      .single();

    if (credError || !credential) {
      return NextResponse.json(
        { error: 'API credentials not found. Please configure your API key.' },
        { status: 404 }
      );
    }

    // Decrypt API key
    const hexString = credential.key_encrypted.replace(/^\\x/, '');
    const encryptedBuffer = Buffer.from(hexString, 'hex');
    const apiKey = decrypt(encryptedBuffer);

    // Fetch audio from ElevenLabs
    const response = await fetch(`https://api.elevenlabs.io/v1/history/${id}/audio`, {
      headers: {
        'xi-api-key': apiKey,
        'accept': 'audio/mpeg'
      }
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `ElevenLabs API error: ${response.status}` },
        { status: response.status }
      );
    }

    // Stream the audio response
    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'audio/mpeg',
        'Content-Length': response.headers.get('content-length') || audioBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: any) {
    console.error('Error fetching audio:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

