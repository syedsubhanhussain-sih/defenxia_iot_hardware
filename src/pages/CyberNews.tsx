import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Globe, Search, Newspaper, Bot, Send, X, User, Clock, 
  ExternalLink, ShieldAlert, Building2, Sparkles, MessageSquare, 
  ChevronLeft, ChevronRight, MapPin, Shield, RefreshCw, Radio, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { invokeEdgeFunction } from '@/lib/supabase-client';
import { toast } from 'sonner';

interface RawArticle {
  id?: string;
  title?: string;
  summary?: string;
  description?: string;
  image?: string | null;
  imageUrl?: string | null;
  source?: string;
  author?: string;
  url?: string;
  country?: string;
  severity?: string;
  published?: string;
  published_at?: string;
  publishedAt?: string;
}

interface Article {
  id: string;
  title: string;
  summary: string;
  description: string;
  imageUrl: string | null;
  source: string;
  country: string;
  publishedAt: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Info';
  url: string;
  author?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const FALLBACK_ARTICLES: Article[] = [
  {
    id: 'fb-1',
    title: 'Warning: New UPI Payment Fraud Targeting Rural Bank Customers',
    summary: 'Cybercriminals are sending fake UPI payment requests via WhatsApp, claiming to be bank officials offering immediate loan approvals.',
    description: 'A detailed advisory regarding a new wave of UPI frauds where attackers use social engineering to trick victims into entering their UPI PIN under the guise of receiving funds. Users are advised never to enter their PIN to receive money.',
    imageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80',
    source: 'CERT-In',
    country: 'India',
    publishedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    severity: 'Critical',
    url: 'https://cybercrime.gov.in'
  },
  {
    id: 'fb-2',
    title: 'Ransomware Gangs Targeting Regional Co-operative Banks',
    summary: 'A new ransomware strain has been detected targeting the outdated infrastructure of regional co-operative banks.',
    description: 'Security researchers have identified a coordinated campaign by a well-known ransomware syndicate targeting tier-2 and tier-3 banks. The attack vector primarily involves phishing emails with malicious macros.',
    imageUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&auto=format&fit=crop&q=80',
    source: 'Cyber Threat Intel',
    country: 'Global',
    publishedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    severity: 'High',
    url: 'https://www.cert-in.org.in'
  },
  {
    id: 'fb-3',
    title: 'Rise in QR Code Scams at Local Merchant Shops in Karnataka',
    summary: 'Fraudsters are replacing legitimate QR codes at merchant shops with their own, redirecting payments to fraudulent accounts.',
    description: 'Local authorities have reported multiple instances of physical tampering with merchant QR codes. Customers are advised to verify the merchant name displayed on their UPI app before authorizing any payment.',
    imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80',
    source: 'Karnataka Cyber Police',
    country: 'Karnataka, India',
    publishedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    severity: 'Medium',
    url: 'https://ksp.karnataka.gov.in'
  },
  {
    id: 'fb-4',
    title: 'Critical Vulnerability Patched in Core Banking Software',
    summary: 'A major core banking software provider has released an emergency patch for an authentication bypass vulnerability.',
    description: 'A CVSS 9.8 vulnerability was discovered in the authentication module of a widely used core banking system. All deployed instances must be patched immediately to prevent unauthorized access.',
    imageUrl: 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=800&auto=format&fit=crop&q=80',
    source: 'Security Advisory',
    country: 'Global',
    publishedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    severity: 'Critical',
    url: 'https://www.cisa.gov'
  },
  {
    id: 'fb-5',
    title: 'Phishing Campaign Uses Fake KYC Update Notices',
    summary: 'Customers are receiving SMS messages threatening account suspension if they do not click a link to update their KYC.',
    description: 'The phishing link leads to a highly convincing spoofed banking portal that captures login credentials and OTPs. Banks reiterate they never ask for sensitive details via SMS links.',
    imageUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80',
    source: 'Cyber Defense Center',
    country: 'India',
    publishedAt: new Date(Date.now() - 3600000 * 72).toISOString(),
    severity: 'High',
    url: 'https://sachet.rbi.org.in'
  },
  {
    id: 'fb-6',
    title: 'SIM Swap Fraud Prevention Guidelines Issued by Telecom Body',
    summary: 'New guidelines have been issued to telecom operators to tighten the SIM replacement process and prevent SIM swap frauds.',
    description: 'Following a spike in SIM swap incidents leading to financial loss, regulatory authorities have mandated stronger verification processes, including mandatory 24-hour SMS hold periods for SIM replacements.',
    imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80',
    source: 'Telecom Regulatory Authority',
    country: 'India',
    publishedAt: new Date(Date.now() - 3600000 * 96).toISOString(),
    severity: 'Info',
    url: 'https://cybercrime.gov.in'
  }
];

function parseCurrentsDate(str?: string): Date {
  if (!str) return new Date();
  try {
    let cleaned = str.trim();
    if (cleaned.includes(' +0000')) {
      cleaned = cleaned.replace(' +0000', 'Z').replace(' ', 'T');
    }
    const d = new Date(cleaned);
    return isNaN(d.getTime()) ? new Date() : d;
  } catch {
    return new Date();
  }
}

function normalizeArticle(raw: RawArticle, index: number): Article {
  const text = ((raw.title || '') + ' ' + (raw.description || '') + ' ' + (raw.summary || '')).toLowerCase();
  let severity: 'Critical' | 'High' | 'Medium' | 'Info' = 'Info';
  
  if (text.includes('breach') || text.includes('ransomware') || text.includes('critical') || text.includes('exploit')) {
    severity = 'Critical';
  } else if (text.includes('fraud') || text.includes('malware') || text.includes('phishing') || text.includes('attack') || text.includes('scam')) {
    severity = 'High';
  } else if (text.includes('vulnerability') || text.includes('warning') || text.includes('alert') || text.includes('patch')) {
    severity = 'Medium';
  }

  const dateObj = parseCurrentsDate(raw.published || raw.published_at || raw.publishedAt);
  const rawImage = raw.imageUrl || raw.image;
  const validImage = rawImage && rawImage !== 'None' && rawImage !== 'null' && rawImage.startsWith('http') ? rawImage : null;

  return {
    id: raw.id || `article-${index}-${Date.now()}`,
    title: raw.title || 'Cybersecurity Intelligence Report',
    summary: raw.summary || (raw.description ? raw.description.substring(0, 160) + (raw.description.length > 160 ? '...' : '') : 'Real-time security bulletin.'),
    description: raw.description || raw.summary || 'Detailed advisory information is available in the original source link.',
    imageUrl: validImage,
    source: raw.source || raw.author || 'Currents Live Feed',
    country: raw.country || 'Global',
    publishedAt: dateObj.toISOString(),
    severity,
    url: raw.url && raw.url !== '#' ? raw.url : 'https://cybercrime.gov.in',
    author: raw.author
  };
}

function formatSafeDate(dateStr?: string): string {
  if (!dateStr) return 'Recently';
  try {
    const d = parseCurrentsDate(dateStr);
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return 'Recently';
  }
}

// Uncluttered, structured point-by-point AI Message Formatter
const FormattedAIMessage = ({ text }: { text: string }) => {
  const lines = text.split('\n').filter((l) => l.trim().length > 0);

  return (
    <div className="space-y-2 text-xs">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // Check for numbered points: "1. **Title**: Body" or "1. Title: Body" or "1) ..."
        const numMatch = trimmed.match(/^(\d+)[\.\)]\s*(?:\*\*(.*?)\*\*|\*(.*?)\*|(.*?))[:\-]\s*(.*)$/);
        if (numMatch) {
          const num = numMatch[1];
          const title = (numMatch[2] || numMatch[3] || numMatch[4] || '').replace(/\*\*/g, '').trim();
          const body = (numMatch[5] || '').replace(/\*\*/g, '').trim();

          return (
            <div key={idx} className="bg-black/40 p-2.5 rounded-xl border border-white/10 flex items-start gap-2.5 shadow-sm">
              <span className="w-5 h-5 rounded-full bg-purple-600/40 border border-purple-400/50 text-cyan-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                {num}
              </span>
              <div className="flex-1">
                {title && <span className="font-bold text-cyan-300 block mb-0.5 tracking-wide">{title}</span>}
                <span className="text-slate-200 text-[11px] leading-relaxed">{body}</span>
              </div>
            </div>
          );
        }

        // Check for bullet points: "* **Title**: Body" or "- **Title**: Body"
        const bulletMatch = trimmed.match(/^[\*\-•]\s*(?:\*\*(.*?)\*\*|\*(.*?)\*|(.*?))[:\-]\s*(.*)$/);
        if (bulletMatch) {
          const title = (bulletMatch[1] || bulletMatch[2] || bulletMatch[3] || '').replace(/\*\*/g, '').trim();
          const body = (bulletMatch[4] || '').replace(/\*\*/g, '').trim();

          return (
            <div key={idx} className="bg-black/40 p-2.5 rounded-xl border border-white/10 flex items-start gap-2.5 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-cyan-400 shrink-0 mt-1.5 shadow-[0_0_8px_rgba(0,229,255,0.8)]" />
              <div className="flex-1">
                {title && <span className="font-bold text-cyan-300 block mb-0.5 tracking-wide">{title}</span>}
                <span className="text-slate-200 text-[11px] leading-relaxed">{body}</span>
              </div>
            </div>
          );
        }

        // Check for standalone simple bullets
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
          const cleanText = trimmed.replace(/^[\*\-•]\s*/, '').replace(/\*\*/g, '');
          return (
            <div key={idx} className="bg-black/30 p-2 rounded-lg border border-white/5 flex items-start gap-2 text-[11px] text-slate-200">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0 mt-1.5" />
              <span>{cleanText}</span>
            </div>
          );
        }

        // Standard text with bold inline formatting
        const parts = trimmed.split(/(\*\*.*?\*\*)/g);
        return (
          <p key={idx} className="text-slate-200 text-[11px] leading-relaxed my-1">
            {parts.map((part, pIdx) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return (
                  <strong key={pIdx} className="font-bold text-cyan-200">
                    {part.slice(2, -2)}
                  </strong>
                );
              }
              return part;
            })}
          </p>
        );
      })}
    </div>
  );
};

// Location-specific intelligence pinpoint knowledge generator
function getPinpointLocationResponse(query: string, region: string): string | null {
  const q = query.toLowerCase();

  if (q.includes('bidar')) {
    return `Here is the targeted Cyber Crime Intelligence for Bidar District, Karnataka:

1. **Fake GESCOM Electricity Bill SMS**: Fraudsters send urgent SMS threatening to cut electricity at night unless a small verification payment is made via an APK link.
2. **Agricultural Subsidy & Loan Impersonation**: Scammers target farmers and local traders in Bidar APMC pretending to be bank agents offering PM-Kisan or zero-interest loans.
3. **QR Code Swapping at Local Mandis**: Fraudulent QR stands placed over genuine shopkeeper codes to divert merchant payments.
4. **AnyDesk & Remote Access Scams**: Victims asked to download QuickSupport or AnyDesk for 'Aadhaar bank link verification' resulting in account drains.
5. **Emergency Action**: If defrauded in Bidar, call 1930 immediately or report to the Bidar CEN (Cyber, Economic & Narcotics) Crime Police Station.`;
  }

  if (q.includes('karnataka') || q.includes('bengaluru') || q.includes('bangalore') || q.includes('mysuru') || q.includes('kalaburagi')) {
    return `Latest Karnataka Cyber Intelligence & Police Advisories:

1. **FedEx / Police Digital Arrest Scams**: Fraudsters pose as Karnataka Police or CBI on video calls, threatening victims with bogus drug parcel accusations.
2. **Part-time Telegram Job Fraud**: Fraudulent rating/review tasks promising daily returns of ₹3,000–₹10,000 before blocking accounts.
3. **Fake BESCOM / HESCOM Utility Alerts**: Malicious APKs sent to steal banking OTPs under the pretext of unpaid power bills.
4. **Immediate Advisory**: Karnataka Police urges victims to dial 1930 within the 1-hour golden window to freeze bank transactions.`;
  }

  if (q.includes('upi') || q.includes('qr') || q.includes('payment')) {
    return `Critical UPI & Payment Security Intelligence:

1. **UPI PIN Golden Rule**: You NEVER enter your UPI PIN to receive money. Entering your PIN always DEDUCTS money from your account.
2. **Reverse QR Phishing**: Scammers send you a QR code claiming it is for 'receiving cashback'. Scanning it authorizes a debit.
3. **Unsolicited Collect Requests**: Reject any unknown 'Request Money' or payment approval alerts from PhonePe, Google Pay, or Paytm.
4. **Emergency Freeze**: Call 1930 immediately to block UPI transactions if unauthorized debits occur.`;
  }

  return null;
}

export default function CyberNews() {
  const [region, setRegion] = useState<'global' | 'india' | 'karnataka'>('global');
  const [articles, setArticles] = useState<Article[]>(FALLBACK_ARTICLES);
  const [loading, setLoading] = useState(true);
  const [isLiveApi, setIsLiveApi] = useState(false);
  
  // Carousel State
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Hello! I am your DEFENXIA Cyber Intelligence AI. Ask me pinpoint questions about local cyber fraud in your city, UPI attacks, or threat advisories.'
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);
  
  // Modal State
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  const fetchNews = useCallback(async (selectedRegion: 'global' | 'india' | 'karnataka') => {
    setLoading(true);
    const currentsKey = import.meta.env.VITE_CURRENTS_API_KEY || 'SwcnQ2UOdAI-qZfhhUxelSps-vKhQEGMhvSRC1sWmhphi6nP';
    
    let keywords = 'cybersecurity';
    let countryParam = '';
    
    if (selectedRegion === 'india') {
      keywords = 'cybersecurity OR UPI OR cyber crime';
      countryParam = '&country=IN';
    } else if (selectedRegion === 'karnataka') {
      keywords = 'Karnataka OR Bengaluru cybersecurity';
      countryParam = '';
    }

    try {
      // 1. PRIMARY: Direct Currents API search
      const directUrl = `https://api.currentsapi.services/v1/search?keywords=${encodeURIComponent(keywords)}${countryParam}&language=en&apiKey=${currentsKey}`;
      const res = await fetch(directUrl);
      
      if (res.ok) {
        const data = await res.json();
        if (data?.news && Array.isArray(data.news) && data.news.length > 0) {
          const mapped = data.news.map((item: any, idx: number) => normalizeArticle({
            title: item.title,
            description: item.description,
            summary: item.description,
            image: item.image,
            source: item.author || 'Currents Live',
            author: item.author,
            url: item.url,
            country: selectedRegion === 'karnataka' ? 'Karnataka' : selectedRegion === 'india' ? 'India' : 'Global',
            published: item.published
          }, idx));
          setArticles(mapped);
          setIsLiveApi(true);
          setLoading(false);
          return;
        }
      }

      // 2. Fallback to Supabase Edge Function
      const response = await invokeEdgeFunction<{ articles: RawArticle[] }>('get-cyber-news', { region: selectedRegion });
      if (response?.data?.articles && Array.isArray(response.data.articles) && response.data.articles.length > 0) {
        const mapped = response.data.articles.map((item, idx) => normalizeArticle(item, idx));
        setArticles(mapped);
        setIsLiveApi(true);
        setLoading(false);
        return;
      }

      // 3. Fallback to rich preloaded articles
      setArticles(FALLBACK_ARTICLES);
      setIsLiveApi(false);
    } catch (error) {
      console.error('Error fetching live news:', error);
      setArticles(FALLBACK_ARTICLES);
      setIsLiveApi(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNews(region);
  }, [region, fetchNews]);

  // Carousel Auto-scroll
  useEffect(() => {
    const heroItems = articles.slice(0, 3);
    if (heroItems.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroItems.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [articles]);

  // Auto scroll chat
  useEffect(() => {
    if (chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatLoading]);

  const handleSendChatMessage = async (msg: string) => {
    if (!msg.trim()) return;
    
    const userMessageText = msg;
    const newMessages: ChatMessage[] = [...chatMessages, { role: 'user', content: userMessageText }];
    setChatMessages(newMessages);
    setChatInput('');
    setIsChatLoading(true);

    try {
      // 1. Check for pinpoint local intelligence answer first
      const pinpoint = getPinpointLocationResponse(userMessageText, region);
      
      const response = await invokeEdgeFunction<{ response: string }>('cyber-news-chat', { 
        message: userMessageText, 
        region 
      });

      if (response?.data?.response) {
        setChatMessages([...newMessages, { role: 'assistant', content: response.data.response }]);
      } else if (pinpoint) {
        setChatMessages([...newMessages, { role: 'assistant', content: pinpoint }]);
      } else {
        const fallback = `Cyber Advisory regarding "${userMessageText}":\n\n1. **Modus Operandi**: Attackers use social engineering and urgency to compromise banking credentials.\n2. **Prevention**: Never share OTP or approve remote access applications.\n3. **Helpline**: In case of financial loss, immediately dial 1930 or visit cybercrime.gov.in.`;
        setChatMessages([...newMessages, { role: 'assistant', content: fallback }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const pinpoint = getPinpointLocationResponse(userMessageText, region);
      const reply = pinpoint || `CERT-In Security Alert:\n\n1. **Precaution**: Verify caller authenticity before transferring any money.\n2. **Immediate Step**: If scammed, call 1930 within the golden hour to freeze fraudulent transactions.`;
      setChatMessages([...newMessages, { role: 'assistant', content: reply }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const heroArticles = articles.slice(0, 3);
  const feedArticles = articles.length > 3 ? articles.slice(3) : articles;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-red-500/20 text-red-400 border-red-500/40';
      case 'High': return 'bg-orange-500/20 text-orange-400 border-orange-500/40';
      case 'Medium': return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
      case 'Info': return 'bg-purple-500/20 text-purple-400 border-purple-500/40';
      default: return 'bg-primary/20 text-primary border-primary/40';
    }
  };

  const CHAT_SUGGESTIONS = [
    'Past Bidar cyber fraud news', 
    'Karnataka cyber crime alerts', 
    'Latest UPI payment attacks', 
    'Fake loan app harassment', 
    'Ransomware advisories', 
    'CERT-In 1930 helpline guidance'
  ];

  return (
    <div className="min-h-screen bg-background pb-16 relative overflow-hidden">
      {/* Animated Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/10 blur-3xl animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-3xl animate-pulse" />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl relative z-10 animate-fade-in">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(139,92,246,0.3)]">
              <Newspaper size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-purple-200 to-cyan-300 bg-clip-text text-transparent">
                CyberNews Intelligence
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-muted-foreground text-xs">Real-time threat intelligence and official advisories</p>
                {isLiveApi && (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] py-0 px-2 flex items-center gap-1">
                    <Radio size={10} className="animate-pulse text-emerald-400" /> Live Currents API
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchNews(region)}
            className="self-start sm:self-auto flex items-center gap-2 border-white/10 text-xs hover:bg-primary/20 rounded-xl"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh News
          </Button>
        </div>

        {/* Hero Carousel */}
        {!loading && heroArticles.length > 0 && (
          <div className="relative w-full h-[300px] md:h-[400px] lg:h-[420px] rounded-2xl overflow-hidden mb-8 group glass-card border-primary/20 shadow-2xl">
            {heroArticles.map((article, idx) => (
              <div 
                key={article.id} 
                className={`absolute inset-0 transition-opacity duration-1000 ${idx === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
              >
                {article.imageUrl ? (
                  <img src={article.imageUrl} alt={article.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-900/40 via-background to-blue-900/30 flex items-center justify-center">
                    <Shield size={100} className="text-primary/30 animate-pulse" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex flex-col justify-end p-6 md:p-10">
                  <div className="flex items-center gap-3 mb-3">
                    <Badge variant="outline" className={getSeverityColor(article.severity)}>{article.severity} Threat</Badge>
                    <span className="flex items-center gap-1 text-xs text-white/80 font-medium">
                      <Clock size={12} className="text-primary" />
                      {formatSafeDate(article.publishedAt)}
                    </span>
                  </div>
                  <h2 className="text-xl md:text-3xl font-bold text-white mb-2 line-clamp-2 leading-snug">{article.title}</h2>
                  <div className="flex items-center gap-4 text-xs text-white/70">
                    <span className="flex items-center gap-1 font-semibold text-purple-300"><Building2 size={14} /> {article.source}</span>
                    <span className="flex items-center gap-1"><Globe size={14} /> {article.country}</span>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Carousel Navigation Dots */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-20">
              {heroArticles.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-2 rounded-full transition-all ${idx === currentSlide ? 'w-6 bg-primary' : 'w-2 bg-white/50 hover:bg-white/80'}`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
            
            <button 
              onClick={() => setCurrentSlide((prev) => (prev - 1 + heroArticles.length) % heroArticles.length)}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/40 text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/50"
            >
              <ChevronLeft size={22} />
            </button>
            <button 
              onClick={() => setCurrentSlide((prev) => (prev + 1) % heroArticles.length)}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/40 text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/50"
            >
              <ChevronRight size={22} />
            </button>
          </div>
        )}

        {/* Four Glass Filter Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div 
            onClick={() => setRegion('global')}
            className={`glass-card p-5 rounded-2xl cursor-pointer transition-all hover:scale-[1.02] hover:shadow-primary/20 flex flex-col items-center justify-center text-center gap-2 ${region === 'global' ? 'border-primary shadow-[0_0_20px_rgba(139,92,246,0.3)] bg-primary/10' : ''}`}
          >
            <span className="text-2xl mb-1">🌍</span>
            <span className="font-bold text-sm">Global Top 10</span>
          </div>
          
          <div 
            onClick={() => setRegion('india')}
            className={`glass-card p-5 rounded-2xl cursor-pointer transition-all hover:scale-[1.02] hover:shadow-primary/20 flex flex-col items-center justify-center text-center gap-2 ${region === 'india' ? 'border-primary shadow-[0_0_20px_rgba(139,92,246,0.3)] bg-primary/10' : ''}`}
          >
            <span className="text-2xl mb-1">🇮🇳</span>
            <span className="font-bold text-sm">India Top 10</span>
          </div>
          
          <div 
            onClick={() => setRegion('karnataka')}
            className={`glass-card p-5 rounded-2xl cursor-pointer transition-all hover:scale-[1.02] hover:shadow-primary/20 flex flex-col items-center justify-center text-center gap-2 ${region === 'karnataka' ? 'border-primary shadow-[0_0_20px_rgba(139,92,246,0.3)] bg-primary/10' : ''}`}
          >
            <span className="text-2xl mb-1">📍</span>
            <span className="font-bold text-sm">Karnataka Top 10</span>
          </div>

          <div 
            onClick={() => setIsChatOpen(true)}
            className="glass-card p-5 rounded-2xl cursor-pointer transition-all hover:scale-[1.02] hover:shadow-primary/20 flex flex-col items-center justify-center text-center gap-2 bg-gradient-to-br from-primary/20 to-blue-500/20 border-primary/40 shadow-[0_0_15px_rgba(139,92,246,0.2)]"
          >
            <Bot size={28} className="text-cyan-400 animate-bounce" />
            <span className="font-bold text-sm bg-gradient-to-r from-primary to-cyan-300 bg-clip-text text-transparent">Ask Cyber AI</span>
          </div>
        </div>

        {/* News Feed Grid */}
        <div>
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Newspaper className="text-primary" size={20} />
            Latest Threat Bulletins ({region.toUpperCase()})
          </h3>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="glass-card rounded-2xl p-4 flex flex-col gap-4">
                  <Skeleton className="w-full h-48 rounded-xl" />
                  <Skeleton className="w-20 h-5 rounded-full" />
                  <Skeleton className="w-full h-6" />
                  <Skeleton className="w-3/4 h-6" />
                  <Skeleton className="w-full h-16" />
                  <div className="flex justify-between mt-auto pt-4">
                    <Skeleton className="w-24 h-4" />
                    <Skeleton className="w-24 h-8 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {feedArticles.map((article) => (
                <div key={article.id} className="glass-card rounded-2xl overflow-hidden flex flex-col hover:shadow-primary/20 transition-all hover:-translate-y-1 group border-white/10">
                  {/* Thumbnail */}
                  <div className="h-48 relative overflow-hidden bg-muted">
                    {article.imageUrl ? (
                      <img src={article.imageUrl} alt={article.title} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-950/40 via-background to-blue-950/40 flex items-center justify-center">
                        <Newspaper size={48} className="text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="absolute top-3 right-3 flex gap-2">
                      <Badge className={getSeverityColor(article.severity)} variant="outline">{article.severity}</Badge>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="p-5 flex flex-col flex-grow">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                      <Clock size={12} className="text-primary" />
                      {formatSafeDate(article.publishedAt)}
                      <span className="mx-1">•</span>
                      <Building2 size={12} />
                      <span className="truncate max-w-[100px]">{article.source}</span>
                      <span className="mx-1">•</span>
                      <Globe size={12} />
                      <span>{article.country}</span>
                    </div>
                    
                    <h4 className="font-bold text-base mb-2 line-clamp-2 leading-tight group-hover:text-purple-200 transition-colors">{article.title}</h4>
                    <p className="text-xs text-muted-foreground mb-4 line-clamp-2 leading-relaxed">{article.summary}</p>
                    
                    <div className="mt-auto pt-4 border-t border-border/40">
                      <Button 
                        variant="ghost" 
                        className="w-full justify-center text-xs font-semibold text-primary hover:text-white hover:bg-primary/20 rounded-xl"
                        onClick={() => setSelectedArticle(article)}
                      >
                        Read Full Advisory
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating AI Button */}
      <Button
        size="lg"
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-6 right-6 rounded-full w-14 h-14 p-0 shadow-[0_0_25px_rgba(139,92,246,0.6)] z-40 hover:scale-110 active:scale-95 transition-all bg-gradient-to-r from-purple-600 to-blue-600 text-white border border-white/20"
      >
        <Bot size={28} className="text-cyan-300 animate-pulse" />
      </Button>

      {/* AI Chat Drawer */}
      {isChatOpen && (
        <div className="fixed inset-0 z-50 flex justify-end animate-fade-in">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsChatOpen(false)} />
          <div className="w-full md:w-[440px] h-full bg-slate-950 border-l border-white/15 flex flex-col relative z-10 shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/40">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="p-2 bg-purple-600/20 rounded-full text-purple-400 border border-purple-500/30">
                    <Bot size={22} className="text-cyan-300" />
                  </div>
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-slate-950 animate-ping" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Cyber Intelligence AI</h3>
                  <p className="text-[11px] text-green-400">Pinpoint Threat & Fraud Advisor</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsChatOpen(false)} className="rounded-full text-muted-foreground hover:text-white">
                <X size={18} />
              </Button>
            </div>

            {/* Chat Messages List */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 max-w-[92%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-blue-600/30 text-blue-400 border border-blue-500/30' : 'bg-purple-600/30 text-cyan-300 border border-purple-500/30'}`}>
                    {msg.role === 'user' ? <User size={15} /> : <Bot size={15} />}
                  </div>
                  <div className={`p-3.5 rounded-2xl text-xs leading-relaxed ${msg.role === 'user' ? 'bg-purple-600 text-white rounded-tr-none shadow-md font-medium' : 'glass-card border-white/15 text-slate-100 rounded-tl-none shadow-lg'}`}>
                    {msg.role === 'assistant' ? (
                      <FormattedAIMessage text={msg.content} />
                    ) : (
                      <p>{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex gap-3 max-w-[85%]">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-purple-600/30 text-cyan-300 border border-purple-500/30">
                    <Bot size={15} />
                  </div>
                  <div className="p-3.5 rounded-2xl glass-card border-white/15 text-xs text-muted-foreground flex items-center gap-1.5">
                    <span>Investigating pinpoint threat intelligence</span>
                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce"></div>
                  </div>
                </div>
              )}
              <div ref={chatMessagesEndRef} />
            </div>

            {/* Suggestions Chips */}
            <div className="px-3 py-2 flex flex-wrap gap-1.5 border-t border-white/10 bg-black/30">
              {CHAT_SUGGESTIONS.map((suggestion) => (
                <button 
                  key={suggestion} 
                  className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-white/5 border border-white/10 text-purple-300 hover:bg-purple-500/20 hover:border-purple-400/40 transition-all text-left"
                  onClick={() => handleSendChatMessage(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/10 bg-black/50">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChatMessage(chatInput);
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask pinpoint questions (e.g., Bidar scams, UPI fraud)..."
                  className="flex-1 bg-black/60 border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/60"
                />
                <Button type="submit" size="icon" disabled={!chatInput.trim() || isChatLoading} className="rounded-xl shrink-0 bg-purple-600 hover:bg-purple-500 text-white shadow-lg">
                  <Send size={15} />
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Full Article Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedArticle(null)} />
          <div className="relative bg-slate-950 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/20 shadow-2xl">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setSelectedArticle(null)} 
              className="absolute top-4 right-4 z-10 bg-black/50 text-white hover:bg-black/80 rounded-full"
            >
              <X size={18} />
            </Button>
            
            {selectedArticle.imageUrl ? (
              <div className="w-full h-60 sm:h-72 relative">
                <img src={selectedArticle.imageUrl} alt={selectedArticle.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
              </div>
            ) : (
              <div className="w-full h-36 bg-gradient-to-br from-purple-900/40 to-blue-900/30 flex items-center justify-center">
                <ShieldAlert size={56} className="text-primary/40" />
              </div>
            )}
            
            <div className="p-6 md:p-8 -mt-6 relative z-10">
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge className={getSeverityColor(selectedArticle.severity)} variant="outline">{selectedArticle.severity} Severity</Badge>
                <Badge variant="secondary" className="bg-white/10 text-xs flex items-center gap-1">
                  <Globe size={12} /> {selectedArticle.country}
                </Badge>
              </div>
              
              <h2 className="text-xl md:text-2xl font-bold text-white mb-4 leading-snug">{selectedArticle.title}</h2>
              
              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-6 pb-4 border-b border-white/10">
                <span className="flex items-center gap-1"><Building2 size={14} className="text-purple-400" /> {selectedArticle.source}</span>
                {selectedArticle.author && <span className="flex items-center gap-1"><User size={14} /> {selectedArticle.author}</span>}
                <span className="flex items-center gap-1"><Clock size={14} /> {formatSafeDate(selectedArticle.publishedAt)}</span>
              </div>
              
              <div className="space-y-4 mb-8">
                <p className="text-sm leading-relaxed text-slate-100 font-medium bg-black/30 p-4 rounded-xl border border-white/10">
                  {selectedArticle.summary}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {selectedArticle.description}
                </p>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <Button variant="outline" size="sm" onClick={() => setSelectedArticle(null)} className="border-white/15 text-xs">
                  Close
                </Button>
                {selectedArticle.url && (
                  <Button 
                    asChild
                    size="sm"
                    className="gap-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg shadow-lg"
                  >
                    <a href={selectedArticle.url} target="_blank" rel="noopener noreferrer">
                      Open Advisory Link <ExternalLink size={14} />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
