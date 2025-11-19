import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/src/lib/supabaseServer';

/**
 * POST /api/organizations
 * Sync organization from parent app to Supabase
 *
 * Body: {
 *   organization_uuid: string,
 *   name: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organization_uuid, name } = body;

    if (!organization_uuid) {
      return NextResponse.json(
        { error: 'organization_uuid is required' },
        { status: 400 }
      );
    }

    const supabase = supabaseServer();

    // Check if organization already exists
    const { data: existing } = await supabase
      .from('organizations')
      .select('organization_uuid')
      .eq('organization_uuid', organization_uuid)
      .single();

    if (existing) {
      // Update existing organization
      const { data, error } = await supabase
        .from('organizations')
        .update({ name: name || `Organization ${organization_uuid}` })
        .eq('organization_uuid', organization_uuid)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        organization: data,
        updated: true
      });
    }

    // Insert new organization
    const { data, error } = await supabase
      .from('organizations')
      .insert({
        organization_uuid,
        name: name || `Organization ${organization_uuid}`
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      organization: data,
      created: true
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error syncing organization:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

