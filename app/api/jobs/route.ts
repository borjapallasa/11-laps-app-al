import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/src/lib/supabaseServer';

/**
 * GET /api/jobs?org_uuid={uuid}&status={status}&limit={limit}
 * List jobs for organization with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgUuid = searchParams.get('org_uuid');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (!orgUuid) {
      return NextResponse.json(
        { error: 'org_uuid parameter is required' },
        { status: 400 }
      );
    }

    const supabase = supabaseServer();
    let query = supabase
      .from('job_requests')
      .select('*')
      .eq('organization_uuid', orgUuid)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      jobs: data || [],
      count: data?.length || 0
    });
  } catch (error: any) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/jobs
 * Create new job request
 *
 * Body: {
 *   organization_uuid: string,
 *   project_uuid: string,
 *   voice_id: string,
 *   text: string,
 *   model_id?: string,
 *   voice_settings?: object,
 *   status?: string (default: 'pending'),
 *   metadata?: object
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      organization_uuid,
      project_uuid,
      voice_id,
      text,
      model_id,
      voice_settings,
      status = 'pending',
      metadata
    } = body;

    if (!organization_uuid) {
      return NextResponse.json(
        { error: 'organization_uuid is required' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['pending', 'processing', 'completed', 'failed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Verify organization exists
    const supabase = supabaseServer();
    const { data: org } = await supabase
      .from('organizations')
      .select('organization_uuid')
      .eq('organization_uuid', organization_uuid)
      .single();

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Create job request
    const jobMetadata = {
      voice_id,
      text,
      model_id,
      voice_settings,
      project_uuid,
      ...(metadata || {})
    };

    const { data, error } = await supabase
      .from('job_requests')
      .insert({
        organization_uuid,
        status,
        metadata: jobMetadata
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      job: data
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating job:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

