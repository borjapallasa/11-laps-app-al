import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/src/lib/supabaseServer';
import { decrypt } from '@/src/lib/encryption';

/**
 * POST /api/credentials/decrypt
 * Decrypt and return API key for organization
 *
 * Body: {
 *   organization_uuid: string,
 *   provider: string (default: 'elevenlabs')
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organization_uuid, provider = 'elevenlabs' } = body;

    if (!organization_uuid) {
      return NextResponse.json(
        { error: 'organization_uuid is required' },
        { status: 400 }
      );
    }

    const supabase = supabaseServer();

    // Fetch encrypted key from database
    const { data, error } = await supabase
      .from('api_credentials')
      .select('key_encrypted')
      .eq('organization_uuid', organization_uuid)
      .eq('provider', provider)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'API credentials not found' },
        { status: 404 }
      );
    }

    // Decrypt the key
    // PostgreSQL bytea is returned as hex string starting with \x
    const hexString = data.key_encrypted.replace(/^\\x/, '');
    const encryptedBuffer = Buffer.from(hexString, 'hex');

    try {
      const decryptedKey = decrypt(encryptedBuffer);

      return NextResponse.json({
        api_key: decryptedKey
      });
    } catch (decryptError: any) {
      console.error('Decryption error:', decryptError);
      return NextResponse.json(
        { error: 'Failed to decrypt API key' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error decrypting API key:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

