import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { validateInput } from "../_shared/url-validator.ts";
import { checkRateLimit } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-id',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const sessionId = req.headers.get('x-session-id');
    if (!sessionId) return json({ error: 'Session ID required' }, 400);

    const rate = await checkRateLimit(sessionId);
    if (!rate.allowed) {
      return json({ error: 'Rate limit exceeded. Please try again later.', resetAt: rate.resetAt }, 429);
    }

    const body = await req.json().catch(() => ({}));
    const message = body?.message;
    const region = typeof body?.region === 'string' ? body.region.toLowerCase() : 'global';

    if (!message || typeof message !== 'string') return json({ error: 'Message is required' }, 400);

    const validation = validateInput(message, 1000);
    if (!validation.valid) return json({ error: validation.error }, 400);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Log the query (session isolated)
    await supabase.from('cyber_news_queries').insert({ session_id: sessionId, query: message.slice(0, 1000) });

    // Give the model the currently cached headlines as grounding context
    const { data: cached } = await supabase
      .from('cyber_news_cache')
      .select('title, summary, severity, region, published_at')
      .order('published_at', { ascending: false })
      .limit(20);

    const context = (cached ?? [])
      .map((a: any) => `- [${a.region}/${a.severity}] ${a.title}: ${a.summary}`)
      .join('\n')
      .slice(0, 6000);

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) return json({ error: 'AI key not configured' }, 500);

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content:
              `You are the DEFENXIA Cyber Intelligence AI, an expert cybersecurity investigator and rural banking defense assistant in India.

RESPONSE RULES:
1. Provide PINPOINT, SPECIFIC, AND LOCATION-ACCURATE answers. If the user asks about a specific district, city, or state (e.g. Bidar, Bengaluru, Kalaburagi, Mysuru, Karnataka, Delhi, etc.), give specific cyber fraud cases, local police advisories, and targeted scams prevalent in that exact area (such as fake electricity bill disconnections, agricultural subsidy/loan scams, WhatsApp loan schemes, UPI collect requests at local APMC/mandis, and fake bank KYC calls).
2. Structure your reply strictly in clean, numbered bullet points.
3. Each bullet point MUST start with a bold title: '1. **[Incident / Modus Operandi]**: [1-2 concise sentences]'.
4. Do NOT output messy blocks of unformatted text. Keep points brief, crisp, and high-impact.
5. Always conclude with a quick 1-sentence action step including the 1930 Cyber Helpline & cybercrime.gov.in.
6. Never ask for user OTP, PIN, CVV, or passwords.`,
          },
          {
            role: 'user',
            content: `User Question: "${message}"\nActive Region Filter: ${region}\nRelevant Headlines Context:\n${context || 'No specific cached headlines'}`,
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error('Lovable AI error:', aiRes.status, errText);
      if (aiRes.status === 429) return json({ error: 'Rate limit exceeded. Please try again later.' }, 429);
      if (aiRes.status === 402) return json({ error: 'Payment required. Please add credits to your Lovable workspace.' }, 402);
      return json({ error: 'Failed to get response from AI service' }, 500);
    }

    const data = await aiRes.json();
    const response = data.choices?.[0]?.message?.content ?? 'Sorry, I could not answer that right now.';

    return json({ response });
  } catch (error) {
    console.error('cyber-news-chat error:', error);
    return json({ error: 'Internal server error' }, 500);
  }
});
