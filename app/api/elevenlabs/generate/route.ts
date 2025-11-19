import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/src/lib/supabaseServer';
import { decrypt } from '@/src/lib/encryption';

/**
 * POST /api/elevenlabs/generate
 * Generate TTS audio using ElevenLabs API
 * Creates a job record and returns the generated audio
 *
 * Body: {
 *   org_uuid: string,
 *   project_uuid: string,
 *   voice_id: string,
 *   text: string,
 *   model_id?: string,
 *   voice_settings?: {
 *     stability?: number,
 *     similarity_boost?: number,
 *     style?: number,
 *     use_speaker_boost?: boolean
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      org_uuid,
      project_uuid,
      voice_id,
      text,
      model_id = 'eleven_multilingual_v2',
      voice_settings = {}
    } = body;

    if (!org_uuid || !project_uuid || !voice_id || !text) {
      return NextResponse.json(
        { error: 'Missing required fields: org_uuid, project_uuid, voice_id, text' },
        { status: 400 }
      );
    }

    // Get API key from database
    const supabase = supabaseServer();
    const { data: credential, error: credError } = await supabase
      .from('api_credentials')
      .select('key_encrypted')
      .eq('organization_uuid', org_uuid)
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

    // Create job record
    const { data: job, error: jobError } = await supabase
      .from('job_requests')
      .insert({
        organization_uuid: org_uuid,
        status: 'processing',
        metadata: {
          voice_id,
          text,
          model_id,
          voice_settings,
          project_uuid
        }
      })
      .select()
      .single();

    if (jobError) {
      console.error('Error creating job:', jobError);
      // Continue anyway, job creation is not critical
    }

    // Generate audio using ElevenLabs API
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'accept': 'audio/mpeg'
      },
      body: JSON.stringify({
        text,
        model_id,
        voice_settings: {
          stability: voice_settings.stability ?? 0.85,
          similarity_boost: voice_settings.similarity_boost ?? 0.9,
          style: voice_settings.style ?? 0,
          use_speaker_boost: voice_settings.use_speaker_boost ?? true
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      // Update job status to failed
      if (job) {
        await supabase
          .from('job_requests')
          .update({ status: 'failed' })
          .eq('job_request_uuid', job.job_request_uuid);
      }

      return NextResponse.json(
        { error: `ElevenLabs API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    // Get audio buffer
    const audioBuffer = await response.arrayBuffer();

    // Update job status to completed
    if (job) {
      await supabase
        .from('job_requests')
        .update({
          status: 'completed',
          metadata: {
            ...job.metadata,
            audio_generated: true,
            audio_size: audioBuffer.byteLength
          }
        })
        .eq('job_request_uuid', job.job_request_uuid);
    }

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: any) {
    console.error('Error generating audio:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

