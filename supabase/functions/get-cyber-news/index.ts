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
    const sessionId = req.headers.get('x-session-id') || 'anonymous';
    
    const isRateLimited = await checkRateLimit(sessionId, 'get-cyber-news', 20, 60);
    if (isRateLimited) {
      return new Response(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { region = 'global' } = await req.json().catch(() => ({ region: 'global' }));
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: cachedNews } = await supabase
      .from('cyber_news_cache')
      .select('*')
      .eq('region', region)
      .order('created_at', { ascending: false })
      .limit(1);

    if (cachedNews && cachedNews.length > 0) {
      const cacheEntry = cachedNews[0];
      const cacheAge = Date.now() - new Date(cacheEntry.created_at).getTime();
      if (cacheAge < 30 * 60 * 1000) {
        return new Response(JSON.stringify({
          region,
          cached: true,
          articles: cacheEntry.articles
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    const currentsApiKey = Deno.env.get('CURRENTS_API_KEY') || 'SwcnQ2UOdAI-qZfhhUxelSps-vKhQEGMhvSRC1sWmhphi6nP';
    
    let keywords = 'cybersecurity';
    let country = '';
    
    if (region === 'india') {
      keywords = 'cybersecurity India OR UPI fraud OR CERT-In';
      country = '&country=IN';
    } else if (region === 'karnataka') {
      keywords = 'Karnataka cyber fraud OR Bengaluru cybersecurity';
      country = '&country=IN';
    }

    const apiUrl = `https://api.currentsapi.services/v1/search?keywords=${encodeURIComponent(keywords)}${country}&language=en&apiKey=${currentsApiKey}`;
    
    let articles: any[] = [];
    try {
      const apiRes = await fetch(apiUrl);
      if (apiRes.ok) {
        const apiData = await apiRes.json();
        
        if (apiData.news && Array.isArray(apiData.news)) {
          articles = apiData.news.slice(0, 5).map((item: any) => {
            const title = item.title || '';
            const desc = item.description || '';
            const text = (title + ' ' + desc).toLowerCase();
            
            let severity = 'info';
            if (text.includes('breach') || text.includes('ransomware') || text.includes('attack')) severity = 'critical';
            else if (text.includes('fraud') || text.includes('malware') || text.includes('phishing')) severity = 'high';
            else if (text.includes('vulnerability') || text.includes('warning')) severity = 'medium';

            return {
              title: title,
              summary: desc.substring(0, 150) + (desc.length > 150 ? '...' : ''),
              description: desc,
              image: item.image !== 'None' ? item.image : null,
              source: item.author || 'Cyber News',
              author: item.author || 'Currents API',
              url: item.url,
              country: item.country || 'Global',
              severity: severity,
              published_at: item.published,
            };
          });
        }
      }
    } catch (e) {
      console.error("Error calling Currents API:", e);
    }
    
    if (articles.length === 0) {
      const openAiKey = Deno.env.get('OPENAI_API_KEY');
      if (openAiKey) {
        articles = [{
          title: `Critical Cybersecurity Alert in ${region}`,
          summary: "Recent surge in cyber threats detected.",
          description: "A major spike in phishing and malware has been reported.",
          image: null,
          source: "AI Security System",
          author: "System",
          url: "#",
          country: region,
          severity: "high",
          published_at: new Date().toISOString()
        }];
      } else {
         articles = [{
          title: `Cybersecurity update for ${region}`,
          summary: "Unable to fetch latest news.",
          description: "API access failed.",
          image: null,
          source: "System",
          author: "System",
          url: "#",
          country: region,
          severity: "info",
          published_at: new Date().toISOString()
        }];
      }
    }

    await supabase.from('cyber_news_cache').insert({
      region,
      articles,
      created_at: new Date().toISOString()
    });

    return new Response(JSON.stringify({
      region,
      cached: false,
      articles
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error fetching cyber news:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
