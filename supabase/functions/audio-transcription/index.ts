import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function processBase64Chunks(base64String: string, chunkSize = 32768) {
  const chunks: Uint8Array[] = [];
  let position = 0;
  
  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);
    
    for (let i = 0; i < binaryChunk.length; i++) {
      bytes[i] = binaryChunk.charCodeAt(i);
    }
    
    chunks.push(bytes);
    position += chunkSize;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audio, audioUrl, companyId, contactId, conversationId, audioDuration } = await req.json();
    
    if ((!audio && !audioUrl) || !companyId) {
      throw new Error('Audio data (base64 or URL) and company ID are required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get OpenAI API key from database
    const { data: keyData, error: keyError } = await supabaseClient
      .from('openai_settings')
      .select('api_key')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (keyError || !keyData || !keyData.api_key) {
      console.error('OpenAI API key not configured in database:', keyError);
      return new Response(JSON.stringify({ 
        error: 'OpenAI API key not configured. Please add it in Settings.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const OPENAI_API_KEY = keyData.api_key;

    let audioBlob: Blob;

    if (audioUrl) {
      // Download da URL do Z-API
      console.log('📥 Baixando áudio de URL:', audioUrl);
      const audioResponse = await fetch(audioUrl);
      const audioBuffer = await audioResponse.arrayBuffer();
      audioBlob = new Blob([audioBuffer], { type: 'audio/ogg' });
    } else if (audio) {
      // Processar base64 (comportamento existente)
      console.log('📥 Processando áudio base64');
      const binaryAudio = processBase64Chunks(audio);
      audioBlob = new Blob([binaryAudio], { type: 'audio/webm' });
    } else {
      throw new Error('Audio data (base64 or URL) is required');
    }
    
    // Prepare form data
    const formData = new FormData();
    formData.append('file', audioBlob, audioUrl ? 'audio.ogg' : 'audio.webm');
    formData.append('model', 'whisper-1');

    // Send to OpenAI
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI Whisper error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const result = await response.json();
    const transcriptionText = result.text;

    // Log transcription usage
    await supabaseClient.from('audio_transcription_usage').insert({
      company_id: companyId,
      contact_id: contactId,
      conversation_id: conversationId,
      audio_duration_seconds: audioDuration || 0,
      transcription_text: transcriptionText,
      whisper_model: 'whisper-1',
    });

    return new Response(
      JSON.stringify({ text: transcriptionText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in audio-transcription function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
