import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/src/lib/supabaseServer';

/**
 * GET /api/jobs/[id]
 * Get individual job by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from('job_requests')
      .select('*')
      .eq('job_request_uuid', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Job not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      job: data
    });
  } catch (error: any) {
    console.error('Error fetching job:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/jobs/[id]
 * Update job status
 *
 * Body: {
 *   status?: string,
 *   metadata?: object
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { status, metadata } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    const supabase = supabaseServer();

    // Build update object
    const updateData: any = {};
    if (status) {
      const validStatuses = ['pending', 'processing', 'completed', 'failed'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
      updateData.status = status;
    }

    if (metadata) {
      // Merge metadata if existing
      const { data: existing } = await supabase
        .from('job_requests')
        .select('metadata')
        .eq('job_request_uuid', id)
        .single();

      updateData.metadata = existing?.metadata
        ? { ...existing.metadata, ...metadata }
        : metadata;
    }

    const { data, error } = await supabase
      .from('job_requests')
      .update(updateData)
      .eq('job_request_uuid', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Job not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      job: data
    });
  } catch (error: any) {
    console.error('Error updating job:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

