import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper para mascarar segredos nos logs
const maskSecret = (secret: string) => {
  if (!secret || secret.length < 10) return '***';
  return secret.slice(0, 6) + '...' + secret.slice(-3);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { instanceId, token, clientToken, verbose = false, ignoreClientToken = false } = await req.json();

    console.log('Validating Z-API connection:', { 
      instanceId: maskSecret(instanceId), 
      hasToken: !!token,
      hasClientToken: !!clientToken,
      verbose,
      ignoreClientToken
    });

    const hints: string[] = [];

    // Se clientToken não foi fornecido, buscar o global
    let finalClientToken = clientToken;
    if (!clientToken && !ignoreClientToken) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        
        const { data: globalToken, error: tokenError } = await supabaseAdmin
          .from('zapi_settings')
          .select('client_token')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (!tokenError && globalToken?.client_token) {
          finalClientToken = globalToken.client_token;
          console.log('Using global client token from database');
        }
      } catch (e) {
        console.error('Error fetching global client token:', e);
      }
    }

    // Preparar headers (Client Token é opcional)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (finalClientToken && finalClientToken.trim() !== '' && !ignoreClientToken) {
      headers['Client-Token'] = finalClientToken;
    }

    const statusUrl = `https://api.z-api.io/instances/${instanceId}/token/${token}/status`;

    // Verificar status da instância com tratamento de erros SSL
    let statusResponse;
    try {
      statusResponse = await fetch(statusUrl, {
        method: 'GET',
        headers,
      });
    } catch (fetchError) {
      const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
      console.error('Fetch error:', errorMessage);
      
      // Erro específico de certificado SSL
      if (errorMessage.includes('certificate') || errorMessage.includes('UnknownIssuer')) {
        hints.push('Erro de certificado SSL ao conectar com Z-API. Isso pode ser temporário.');
        hints.push('Verifique se consegue acessar https://api.z-api.io no navegador.');
        hints.push('Se o problema persistir, entre em contato com o suporte da Z-API.');
        
        return new Response(
          JSON.stringify({ 
            connected: false, 
            error: 'Erro de certificado SSL ao conectar com Z-API',
            details: errorMessage,
            hints
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      // Outros erros de rede
      return new Response(
        JSON.stringify({ 
          connected: false, 
          error: 'Erro de conexão ao verificar status da instância',
          details: errorMessage,
          hints: ['Verifique sua conexão com a internet e tente novamente.']
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const statusCode = statusResponse.status;
    const statusResponseHeaders = Object.fromEntries(statusResponse.headers.entries());
    const statusResponseBody = await statusResponse.text();
    
    console.log('Z-API status response:', { 
      statusCode,
      bodyPreview: statusResponseBody.substring(0, 200)
    });

    let statusData: any;
    try {
      statusData = JSON.parse(statusResponseBody);
    } catch (e) {
      statusData = { error: 'Invalid JSON response', rawBody: statusResponseBody };
    }

    const debugInfo: {
      statusEndpoint: {
        url: string;
        statusCode: number;
        responseHeaders: { [k: string]: string };
        responseBody: string;
      };
      phoneEndpoint?: {
        url: string;
        statusCode: number;
        responseHeaders: { [k: string]: string };
        responseBody: string;
      };
    } | undefined = verbose ? {
      statusEndpoint: {
        url: statusUrl,
        statusCode,
        responseHeaders: statusResponseHeaders,
        responseBody: statusResponseBody,
      }
    } : undefined;

    if (!statusResponse.ok) {
      console.error('Z-API status check failed:', statusCode);
      
      // Gerar hints baseados no erro
      if (statusCode === 401 || statusCode === 403) {
        hints.push('Possível erro nas credenciais. Verifique Instance ID, Token e Client Token.');
      }
      
      if (statusResponseBody.toLowerCase().includes('client token required')) {
        hints.push('Esta instância exige Client Token. Preencha o campo Client Token exatamente como no painel Z-API.');
      }
      
      if (statusResponseBody.toLowerCase().includes('invalid token') || 
          statusResponseBody.toLowerCase().includes('invalid instance')) {
        hints.push('Verifique se o Instance ID e Token estão corretos.');
      }

      return new Response(
        JSON.stringify({ 
          connected: false, 
          error: 'Falha ao verificar status da instância',
          statusCode,
          hints,
          debug: debugInfo
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verificar se está conectado
    if (statusData.connected === true || (statusData.value === 'online' && statusData.smartphoneConnected === true)) {
      // Buscar número do telefone conectado
      const phoneUrl = `https://api.z-api.io/instances/${instanceId}/token/${token}/phone-number`;
      const phoneResponse = await fetch(phoneUrl, {
        method: 'GET',
        headers,
      });

      const phoneStatusCode = phoneResponse.status;
      const phoneResponseBody = await phoneResponse.text();
      let phone = null;
      
      if (phoneResponse.ok) {
        try {
          const phoneData = JSON.parse(phoneResponseBody);
          phone = phoneData.phone || phoneData.value;
          console.log('Phone number retrieved:', phone);
        } catch (e) {
          console.error('Failed to parse phone response:', e);
        }
      }

      if (verbose && debugInfo) {
        debugInfo.phoneEndpoint = {
          url: phoneUrl,
          statusCode: phoneStatusCode,
          responseHeaders: Object.fromEntries(phoneResponse.headers.entries()),
          responseBody: phoneResponseBody,
        };
      }

      return new Response(
        JSON.stringify({ 
          connected: true, 
          phone,
          status: statusData,
          debug: debugInfo
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
      // Instância não conectada - gerar hints
      if (statusData.smartphoneConnected === false || statusData.error === 'You are not connected.') {
        hints.push('Instância válida, mas aparelho não conectado. Escaneie o QR code no painel Z-API ou use o QR code exibido abaixo.');
      }
      
      return new Response(
        JSON.stringify({ 
          connected: false, 
          qrcode: statusData.qrcode,
          status: statusData,
          hints,
          debug: debugInfo
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
  } catch (error) {
    console.error('Error validating Z-API connection:', error);
    return new Response(
      JSON.stringify({ 
        connected: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        hints: ['Erro inesperado ao validar conexão. Verifique os dados e tente novamente.']
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
