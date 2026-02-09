import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contactId } = await req.json();

    if (!contactId) {
      return new Response(
        JSON.stringify({ error: 'contactId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar cliente Supabase com service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar contato com company_id para pegar WhatsApp connection
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id, phone, company_id, profile_picture_url, profile_picture_fetched_at')
      .eq('id', contactId)
      .single();

    if (contactError || !contact) {
      console.error('Contact not found:', contactError);
      return new Response(
        JSON.stringify({ error: 'Contact not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting inteligente: 60min se já tem foto, sem limite se não tem
    if (contact.profile_picture_fetched_at && contact.profile_picture_url) {
      const lastFetch = new Date(contact.profile_picture_fetched_at);
      const now = new Date();
      const hoursSinceLastFetch = (now.getTime() - lastFetch.getTime()) / (1000 * 60 * 60);
      
      // Se já tem foto, rate limit de 60 minutos para reduzir consumo de créditos
      if (hoursSinceLastFetch < 1) {
        console.log(`Profile picture already fetched recently for contact ${contactId} (${hoursSinceLastFetch.toFixed(2)}h ago)`);
        return new Response(
          JSON.stringify({ 
            message: 'Profile picture already fetched recently',
            lastFetch: contact.profile_picture_fetched_at,
            hoursAgo: hoursSinceLastFetch.toFixed(2)
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Buscar conexão WhatsApp da empresa
    const { data: connection, error: connectionError } = await supabase
      .from('whatsapp_connections')
      .select('z_api_instance_id, z_api_token')
      .eq('company_id', contact.company_id)
      .eq('is_connected', true)
      .limit(1)
      .maybeSingle();

    if (connectionError || !connection) {
      console.error('WhatsApp connection not found:', connectionError);
      return new Response(
        JSON.stringify({ error: 'WhatsApp connection not found for company' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar Client Token global da tabela zapi_settings
    const { data: zapiSettings } = await supabase
      .from('zapi_settings')
      .select('client_token')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const clientToken = zapiSettings?.client_token || null;

    // Fazer request à Z-API para buscar metadata do contato (ENDPOINT CORRETO com /contacts/)
    const metadataUrl = `https://api.z-api.io/instances/${connection.z_api_instance_id}/token/${connection.z_api_token}/contacts/get-metadata-contact?phone=${contact.phone}`;
    
    console.log(`Fetching contact metadata from Z-API for contact ${contactId}, phone ${contact.phone}`);
    
    // Preparar headers com Client-Token opcional
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (clientToken) {
      headers['Client-Token'] = clientToken;
    }
    
    const metadataResponse = await fetch(metadataUrl, {
      method: 'GET',
      headers,
    });

    let profilePictureUrl: string | null = null;
    let whatsappPushName: string | null = null;
    let whatsappAbout: string | null = null;
    let metadataData: any = null;

    if (metadataResponse.ok) {
      metadataData = await metadataResponse.json();
      
      // Tentar extrair dados do metadata primeiro
      if (metadataData) {
        profilePictureUrl = metadataData.photo || null;
        whatsappPushName = metadataData.notify || null;
        whatsappAbout = metadataData.about || null;
      }
    } else {
      const errorBody = await metadataResponse.text();
      console.error(`Z-API Metadata Error:`, {
        status: metadataResponse.status,
        url: metadataUrl,
        phone: contact.phone,
        responseBody: errorBody,
      });
      // NÃO retorna aqui — continua para o fallback de get-profile-picture
    }

    // FALLBACK: Se metadata não retornou foto, tentar endpoint direto de foto
    if (!profilePictureUrl) {
      console.log(`Metadata didn't return photo, trying direct profile-picture endpoint for contact ${contactId}`);
      
      const pictureUrl = `https://api.z-api.io/instances/${connection.z_api_instance_id}/token/${connection.z_api_token}/contacts/get-profile-picture?phone=${contact.phone}`;
      
      const pictureResponse = await fetch(pictureUrl, {
        method: 'GET',
        headers,
      });

      if (pictureResponse.ok) {
        // Algumas instâncias da Z-API retornam string pura, outras JSON (objeto/array)
        const raw = await pictureResponse.text();
        const looksLikeUrl = (s: string) =>
          typeof s === 'string' && (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('data:image/'));

        let extractedUrl: string | null = null;
        const tryExtractFromObject = (obj: any): string | null => {
          if (!obj || typeof obj !== 'object') return null;
          const candidates = [
            obj.link, obj.url, obj.imgUrl, obj.imageUrl, obj.profilePictureUrl, obj.profile_picture, obj.picture,
            obj?.data?.link, obj?.data?.url, obj?.data?.imgUrl, obj?.data?.imageUrl, obj?.data?.profilePictureUrl,
            obj?.result?.link, obj?.result?.url, obj?.result?.imgUrl, obj?.result?.imageUrl,
          ];
          const found = candidates.find((v) => looksLikeUrl(v));
          if (found) return found;
          // fallback: varrer chaves de primeiro nível em busca de string URL
          for (const k of Object.keys(obj)) {
            const v = (obj as any)[k];
            if (looksLikeUrl(v)) return v;
          }
          return null;
        };

        const trimmed = raw.trim();
        if (looksLikeUrl(trimmed)) {
          extractedUrl = trimmed;
        } else {
          try {
            const data = JSON.parse(raw);
            if (typeof data === 'string' && looksLikeUrl(data)) {
              extractedUrl = data;
            } else if (Array.isArray(data) && data.length > 0) {
              // Pode vir como [{ link: "..." }] ou ["..."]
              const first = data[0];
              if (typeof first === 'string' && looksLikeUrl(first)) {
                extractedUrl = first;
              } else {
                extractedUrl = tryExtractFromObject(first);
              }
            } else {
              extractedUrl = tryExtractFromObject(data);
            }
          } catch (_e) {
            // não era JSON; já tratamos string pura acima
          }
        }

        if (extractedUrl) {
          profilePictureUrl = extractedUrl;
          console.log(`Fallback profile picture fetch successful for contact ${contactId}`);
        } else {
          try {
            const maybeObj = JSON.parse(raw);
            const keys = maybeObj && typeof maybeObj === 'object' ? Object.keys(maybeObj) : [];
            console.log(`Fallback picture endpoint returned 200 but no URL extracted. Keys:`, keys);
          } catch {
            console.log(`Fallback picture endpoint returned 200 but body wasn't a URL or JSON parsable string.`);
          }
        }
      } else {
        console.log(`Fallback profile picture fetch also failed for contact ${contactId}`);
      }
    }

    // Se ainda não tem foto após ambas tentativas, atualizar timestamp e retornar
    if (!profilePictureUrl) {
      console.log(`No profile picture available for contact ${contactId} after both attempts`);
      
      await supabase
        .from('contacts')
        .update({ profile_picture_fetched_at: new Date().toISOString() })
        .eq('id', contactId);

      return new Response(
        JSON.stringify({ 
          message: 'No profile picture available',
          metadataResponse: metadataData 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Atualizar contato com foto e metadados do WhatsApp
    const { error: updateError } = await supabase
      .from('contacts')
      .update({ 
        profile_picture_url: profilePictureUrl,
        whatsapp_push_name: whatsappPushName,
        whatsapp_about: whatsappAbout,
        profile_picture_fetched_at: new Date().toISOString()
      })
      .eq('id', contactId);

    if (updateError) {
      console.error('Error updating contact with profile picture:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update contact' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Profile picture updated for contact ${contactId}: ${profilePictureUrl}`);

    // Log telemetry
    await supabase.from('system_logs').insert({
      log_type: 'edge_function',
      severity: 'info',
      source: 'zapi-fetch-profile-picture',
      message: `Profile picture fetched successfully for contact ${contactId}`,
      company_id: contact.company_id,
      metadata: {
        contact_id: contactId,
        phone: contact.phone,
        profile_picture_url: profilePictureUrl,
      },
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        contact_id: contactId,
        profile_picture_url: profilePictureUrl
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in zapi-fetch-profile-picture:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
