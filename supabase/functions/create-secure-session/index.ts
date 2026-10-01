import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { checkRateLimit } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-id',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const sessionId = req.headers.get('x-session-id');
    if (!sessionId) {
      throw new Error('x-session-id header is required');
    }

    const rate = await checkRateLimit(sessionId);
    if (!rate.allowed) {
      return new Response(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { app_name, package_name, rfid_uid } = await req.json();
    if (!app_name || !package_name || !rfid_uid) {
      throw new Error('app_name, package_name, and rfid_uid are required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);

    const sessionData = {
      session_id: sessionId,
      app_name,
      package_name,
      verification_status: 'authorized',
      rfid_uid,
      started_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      duration_seconds: 300
    };

    const { data, error } = await supabase
      .from('secure_sessions')
      .insert(sessionData)
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
