import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/src/lib/supabaseServer';
import { encrypt } from '@/src/lib/encryption';

/**
 * GET /api/credentials?org_uuid={uuid}&provider={provider}
 * Check if API credentials exist for organization
 * Does NOT return the decrypted key (use /api/credentials/decrypt for that)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgUuid = searchParams.get('org_uuid');
    const provider = searchParams.get('provider') || 'elevenlabs';

    if (!orgUuid) {
      return NextResponse.json(
        { error: 'org_uuid parameter is required' },
        { status: 400 }
      );
    }

    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from('api_credentials')
      .select('api_credentials_uuid, organization_uuid, provider, created_at')
      .eq('organization_uuid', orgUuid)
      .eq('provider', provider)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return NextResponse.json({
          exists: false,
          organization_uuid: orgUuid,
          provider
        });
      }
      throw error;
    }

    return NextResponse.json({
      exists: true,
      credential: data
    });
  } catch (error: any) {
    console.error('Error checking API credentials:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/credentials
 * Store new API key (encrypted)
 *
 * Body: {
 *   organization_uuid: string,
 *   provider: string (default: 'elevenlabs'),
 *   api_key: string (plain text, will be encrypted)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organization_uuid, provider = 'elevenlabs', api_key } = body;

    if (!organization_uuid) {
      return NextResponse.json(
        { error: 'organization_uuid is required' },
        { status: 400 }
      );
    }

    if (!api_key) {
      return NextResponse.json(
        { error: 'api_key is required' },
        { status: 400 }
      );
    }

    // Verify organization exists, create if it doesn't
    const supabase = supabaseServer();
    let { data: org } = await supabase
      .from('organizations')
      .select('organization_uuid')
      .eq('organization_uuid', organization_uuid)
      .single();

    if (!org) {
      // Auto-create organization if it doesn't exist
      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert({
          organization_uuid,
          name: `Organization ${organization_uuid}`
        })
        .select('organization_uuid')
        .single();

      if (orgError) {
        console.error('Error creating organization:', orgError);
        return NextResponse.json(
          { error: 'Failed to create organization' },
          { status: 500 }
        );
      }

      org = newOrg;
    }

    // Encrypt the API key
    const keyEncrypted = encrypt(api_key);

    // Convert Buffer to hex string for PostgreSQL bytea
    // PostgreSQL expects bytea in format: \x[hexstring]
    const keyEncryptedHex = '\\x' + keyEncrypted.toString('hex');

    // Check if credentials already exist
    const { data: existing } = await supabase
      .from('api_credentials')
      .select('api_credentials_uuid')
      .eq('organization_uuid', organization_uuid)
      .eq('provider', provider)
      .single();

    if (existing) {
      // Update existing credentials
      const { data, error } = await supabase
        .from('api_credentials')
        .update({ key_encrypted: keyEncryptedHex })
        .eq('api_credentials_uuid', existing.api_credentials_uuid)
        .select('api_credentials_uuid, organization_uuid, provider, created_at')
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        credential: data,
        updated: true
      });
    }

    // Insert new credentials
    const { data, error } = await supabase
      .from('api_credentials')
      .insert({
        organization_uuid,
        provider,
        key_encrypted: keyEncryptedHex
      })
      .select('api_credentials_uuid, organization_uuid, provider, created_at')
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      credential: data,
      created: true
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error saving API credentials:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/credentials?org_uuid={uuid}&provider={provider}
 * Delete API credentials for organization
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgUuid = searchParams.get('org_uuid');
    const provider = searchParams.get('provider') || 'elevenlabs';

    if (!orgUuid) {
      return NextResponse.json(
        { error: 'org_uuid parameter is required' },
        { status: 400 }
      );
    }

    const supabase = supabaseServer();
    const { error } = await supabase
      .from('api_credentials')
      .delete()
      .eq('organization_uuid', orgUuid)
      .eq('provider', provider);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'API credentials deleted'
    });
  } catch (error: any) {
    console.error('Error deleting API credentials:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

