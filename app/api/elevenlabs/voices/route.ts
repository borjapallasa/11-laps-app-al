import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/src/lib/supabaseServer';
import { decrypt } from '@/src/lib/encryption';

/**
 * GET /api/elevenlabs/voices?org_uuid={uuid}
 * Proxy to ElevenLabs voices API
 * Fetches API key from database and makes authenticated request
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgUuid = searchParams.get('org_uuid');

    if (!orgUuid) {
      return NextResponse.json(
        { error: 'org_uuid parameter is required' },
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

    // Fetch voices from ElevenLabs
    const response = await fetch('https://api.elevenlabs.io/v2/voices?voice_type=personal', {
      headers: {
        'xi-api-key': apiKey
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `ElevenLabs API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching voices:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

