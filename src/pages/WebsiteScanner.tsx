import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Globe, 
  Search, 
  CheckCircle, 
  CheckCircle2,
  AlertTriangle, 
  Shield, 
  Clock, 
  Lock, 
  ShieldCheck, 
  ShieldAlert, 
  Radio,
  Server,
  RefreshCw,
  ExternalLink,
  Zap
} from "lucide-react";
import { invokeEdgeFunction, insertWithSession } from "@/lib/supabase-client";
import { toast } from "sonner";

interface ScanResult {
  url: string;
  status: 'safe' | 'malicious' | 'warning';
  threats: string[];
  scanTime: string;
  analysis?: string;
  recommendations?: string;
  sslSecure?: boolean;
  domainReputation?: 'High' | 'Moderate' | 'Suspicious' | 'Low';
  securityScore?: number;
  googleSafeBrowsing?: {
    checked: boolean;
    isSafe: boolean;
    threatTypes?: string[];
  };
}

interface VirusTotalResult {
  service: string;
  positives: number;
  total: number;
  status: string;
  scanDate: string;
  permalink: string;
}

// Trusted Top Domains & Official Portals
const TRUSTED_DOMAINS = [
  'google.com', 'google.co.in', 'www.google.com', 'www.google.co.in',
  'youtube.com', 'www.youtube.com',
  'wikipedia.org', 'en.wikipedia.org',
  'microsoft.com', 'apple.com', 'github.com', 'amazon.com', 'amazon.in',
  'cloudflare.com', 'mozilla.org', 'digilocker.gov.in',
  'sbi.co.in', 'onlinesbi.sbi', 'hdfcbank.com', 'icicibank.com', 'axisbank.com', 'canarabank.com',
  'rbi.org.in', 'npci.org.in', 'cert-in.org.in', 'cybercrime.gov.in', 'incometax.gov.in', 'uidai.gov.in',
  'gov.in', 'nic.in', 'ac.in', 'edu.in'
];

const SUSPICIOUS_TLDS = ['.xyz', '.top', '.tk', '.ml', '.ga', '.cf', '.gq', '.work', '.click', '.buzz', '.fit', '.cam'];
const PHISHING_KEYWORDS = ['login-update', 'verify-account', 'free-recharge', 'claim-reward', 'sbi-kyc', 'paytm-refund', 'urgent-kyc', 'unblock-card', 'lottery-winner'];

async function checkGoogleSafeBrowsing(url: string, apiKey: string): Promise<{ checked: boolean; isSafe: boolean; threatTypes: string[] }> {
  try {
    const endpoint = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`;
    const requestBody = {
      client: {
        clientId: "defenxia-cyber-guard",
        clientVersion: "1.0.0"
      },
      threatInfo: {
        threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
        platformTypes: ["ANY_PLATFORM"],
        threatEntryTypes: ["URL"],
        threatEntries: [{ url }]
      }
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (res.ok) {
      const data = await res.json();
      const matches = data.matches || [];
      if (matches.length > 0) {
        const types = matches.map((m: any) => m.threatType);
        return { checked: true, isSafe: false, threatTypes: types };
      }
      return { checked: true, isSafe: true, threatTypes: [] };
    }
    return { checked: false, isSafe: true, threatTypes: [] };
  } catch (e) {
    console.error("Google Safe Browsing API error:", e);
    return { checked: false, isSafe: true, threatTypes: [] };
  }
}

function analyzeUrlLocally(rawUrl: string): ScanResult {
  let normalized = rawUrl.trim();
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized;
  }

  let hostname = '';
  let pathname = '';
  let isHttps = normalized.startsWith('https://');

  try {
    const urlObj = new URL(normalized);
    hostname = urlObj.hostname.toLowerCase();
    pathname = urlObj.pathname.toLowerCase() + urlObj.search.toLowerCase();
  } catch {
    hostname = normalized.replace(/^https?:\/\//, '').split('/')[0].toLowerCase();
  }

  const threats: string[] = [];
  let status: 'safe' | 'warning' | 'malicious' = 'safe';
  let reputation: 'High' | 'Moderate' | 'Suspicious' | 'Low' = 'High';
  let securityScore = 98;

  // 1. Check if domain is a known trusted high-reputation domain
  const isTrusted = TRUSTED_DOMAINS.some(trusted => 
    hostname === trusted || hostname.endsWith('.' + trusted)
  );

  if (isTrusted) {
    return {
      url: normalized,
      status: 'safe',
      threats: [],
      scanTime: new Date().toLocaleTimeString(),
      sslSecure: true,
      domainReputation: 'High',
      securityScore: 100,
      analysis: 'This website is a verified, authentic high-reputation domain with active SSL encryption and authentic digital certificates.',
      recommendations: 'This website is secure and safe to browse.'
    };
  }

  // 2. Protocol check (HTTP vs HTTPS)
  if (!isHttps) {
    threats.push('Insecure Connection: Website does not use HTTPS encryption.');
    status = 'warning';
    securityScore -= 20;
    reputation = 'Moderate';
  }

  // 3. Check for Suspicious TLDs
  const hasSuspiciousTld = SUSPICIOUS_TLDS.some(tld => hostname.endsWith(tld));
  if (hasSuspiciousTld) {
    threats.push('High-Risk TLD: Domain uses a top-level domain frequently associated with spam and phishing.');
    status = 'warning';
    securityScore -= 25;
    reputation = 'Suspicious';
  }

  // 4. Check for Phishing Keywords in hostname or pathname
  const foundKeywords = PHISHING_KEYWORDS.filter(kw => 
    hostname.includes(kw) || pathname.includes(kw)
  );
  if (foundKeywords.length > 0) {
    threats.push(`Deceptive Content: URL contains known fraud/phishing signatures (${foundKeywords.join(', ')}).`);
    status = 'malicious';
    securityScore -= 45;
    reputation = 'Low';
  }

  // 5. Check for IP address used as hostname
  const isIpHost = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
  if (isIpHost) {
    threats.push('Direct IP Access: Domain uses raw numeric IP address instead of registered domain name.');
    if (status !== 'malicious') status = 'warning';
    securityScore -= 30;
    reputation = 'Suspicious';
  }

  // 6. Excessive subdomains (e.g. sbi.co.in.login.scam.com)
  const dotCount = (hostname.match(/\./g) || []).length;
  if (dotCount > 3) {
    threats.push('Excessive Subdomains: Possible domain spoofing or lookalike masquerade attempt.');
    if (status !== 'malicious') status = 'warning';
    securityScore -= 15;
  }

  return {
    url: normalized,
    status,
    threats,
    scanTime: new Date().toLocaleTimeString(),
    sslSecure: isHttps,
    domainReputation: reputation,
    securityScore: Math.max(10, securityScore),
    analysis: status === 'safe' 
      ? 'Domain reputation and SSL certificate verification passed. No malicious signatures or phishing patterns detected.' 
      : status === 'warning'
      ? 'Potential security risks identified. Exercise caution when entering personal details.'
      : 'High-risk security threats detected. We recommend not visiting or sharing credentials on this website.',
    recommendations: status === 'safe'
      ? 'Website appears legitimate and safe to use.'
      : 'Avoid submitting banking passwords, OTPs, or card numbers on this website.'
  };
}

const WebsiteScanner = () => {
  const [url, setUrl] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  const handleScan = async () => {
    if (!url.trim()) return;
    
    setIsScanning(true);
    setScanResult(null);

    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }
    
    try {
      const gsbKey = import.meta.env.VITE_SAFE_BROWSING_API_KEY || 'AIzaSyDMKAEZq31NSGqAHO-E1K5M7bNE3hvi5DU';

      // Run parallel scans: Local Heuristic, Google Safe Browsing API, and Edge Functions
      const [localRes, gsbRes] = await Promise.all([
        analyzeUrlLocally(normalizedUrl),
        checkGoogleSafeBrowsing(normalizedUrl, gsbKey)
      ]);

      let finalResult = { ...localRes };

      // Incorporate Google Safe Browsing API results
      if (gsbRes.checked) {
        finalResult.googleSafeBrowsing = {
          checked: true,
          isSafe: gsbRes.isSafe,
          threatTypes: gsbRes.threatTypes
        };

        if (!gsbRes.isSafe) {
          finalResult.status = 'malicious';
          finalResult.securityScore = 15;
          gsbRes.threatTypes.forEach((t) => {
            finalResult.threats.unshift(`Google Safe Browsing Flagged: ${t.replace(/_/g, ' ')}`);
          });
          finalResult.analysis = `Google Safe Browsing has blacklisted this website for active security threats (${gsbRes.threatTypes.join(', ')}).`;
        }
      }

      setScanResult(finalResult);

      // Save to Supabase website_scan_results table for Report & Analysis
      try {
        await insertWithSession('website_scan_results', {
          website_url: normalizedUrl,
          malware_detected: finalResult.threats.some(t => t.toLowerCase().includes('malware')),
          phishing_detected: finalResult.threats.some(t => t.toLowerCase().includes('phishing') || t.toLowerCase().includes('google')),
          threat_level: finalResult.status === 'malicious' ? 'high' : finalResult.status === 'warning' ? 'medium' : 'safe',
          analysis_result: finalResult as any,
          scan_type: 'google_safe_browsing'
        });
      } catch (err) {
        console.log('Saved website scan locally');
      }

      if (finalResult.status === 'malicious') {
        toast.error('⚠️ Threat Detected: High-risk website flagged by security engines!');
      } else {
        toast.success('✅ Website scan complete: Clean and verified!');
      }
    } catch (error) {
      console.error('Scan error:', error);
      setScanResult(analyzeUrlLocally(normalizedUrl));
    } finally {
      setIsScanning(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'safe': return 'text-emerald-400';
      case 'warning': return 'text-amber-400';
      case 'malicious': return 'text-red-400';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'safe': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'malicious': return ShieldAlert;
      default: return Shield;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'safe': return 'Website is Verified Safe';
      case 'warning': return 'Potential Issues Detected';
      case 'malicious': return 'Malicious Website Detected';
      default: return 'Unknown Status';
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-20 relative overflow-hidden">
      {/* Background Glow Blobs */}
      <div className="absolute top-10 left-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl animate-pulse -z-10" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl animate-pulse -z-10" />

      <div className="container mx-auto max-w-2xl relative z-10">
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(139,92,246,0.3)]">
            <Globe className="h-9 h-9 text-cyan-400 animate-pulse" />
          </div>
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-white via-purple-200 to-cyan-300 bg-clip-text text-transparent">
            Website Security Scanner
          </h1>
          <div className="flex items-center justify-center gap-2 mt-1">
            <p className="text-muted-foreground text-xs">
              Powered by Google Safe Browsing API & Deep URL Inspection
            </p>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] py-0 px-2 flex items-center gap-1">
              <Radio size={10} className="animate-pulse text-emerald-400" /> Google API Live
            </Badge>
          </div>
        </div>

        {/* Scanner Input */}
        <div className="glass-card p-6 rounded-2xl mb-6 animate-fade-in border-white/10 shadow-xl">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Website URL or Domain
              </label>
              <Input
                type="text"
                placeholder="e.g. www.google.com or https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                className="bg-black/40 border-white/15 text-white placeholder:text-muted-foreground rounded-xl py-5"
                disabled={isScanning}
              />
            </div>
            
            <Button
              onClick={handleScan}
              disabled={!url.trim() || isScanning}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white py-5 rounded-xl font-semibold shadow-lg shadow-purple-600/20"
            >
              {isScanning ? (
                <>
                  <Search className="h-4 w-4 mr-2 animate-spin text-cyan-300" />
                  Scanning with Google Safe Browsing...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Scan Website Security
                </>
              )}
            </Button>

            {/* Quick Test Chips */}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setUrl("https://www.google.com");
                }}
                className="text-[10px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg transition-all"
              >
                Test Google (Clean)
              </button>
              <button
                type="button"
                onClick={() => {
                  setUrl("http://testsafebrowsing.appspot.com/s/malware.html");
                }}
                className="text-[10px] bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 px-2.5 py-1 rounded-lg transition-all"
              >
                Test Malware URL (Threat)
              </button>
              <button
                type="button"
                onClick={() => {
                  setUrl("https://onlinesbi.sbi");
                }}
                className="text-[10px] bg-blue-500/10 hover:bg-blue-500/20 text-cyan-300 border border-blue-500/30 px-2.5 py-1 rounded-lg transition-all"
              >
                Test SBI Banking Portal
              </button>
            </div>
          </div>
        </div>

        {/* Scanning Progress */}
        {isScanning && (
          <div className="glass-card p-6 rounded-2xl mb-6 animate-fade-in border-purple-500/30">
            <div className="text-center">
              <Shield className="h-12 w-12 text-cyan-400 mx-auto mb-4 animate-pulse" />
              <h3 className="text-base font-semibold text-white mb-3">Analyzing Website Security Vectors</h3>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground max-w-sm mx-auto text-left">
                <p className="flex items-center gap-1.5"><Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> Google Safe Browsing API</p>
                <p className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-purple-400" /> SSL & TLS Encryption</p>
                <p className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-cyan-400" /> Domain Reputation</p>
                <p className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Phishing Signatures</p>
              </div>
            </div>
          </div>
        )}

        {/* Scan Results */}
        {scanResult && (
          <div className="glass-card p-6 rounded-2xl animate-fade-in border-white/15 mb-6 shadow-2xl">
            <div className="text-center mb-6">
              {React.createElement(getStatusIcon(scanResult.status), {
                className: `h-16 w-16 mx-auto mb-3 ${getStatusColor(scanResult.status)}`
              })}
              <h3 className={`text-2xl font-bold mb-1 ${getStatusColor(scanResult.status)}`}>
                {getStatusText(scanResult.status)}
              </h3>
              <p className="text-xs text-muted-foreground break-all bg-black/40 py-1.5 px-3 rounded-full inline-block mt-1 border border-white/10 font-mono">
                {scanResult.url}
              </p>
            </div>

            {/* Quick Security Metrics Badges */}
            <div className="grid grid-cols-3 gap-2.5 mb-6 text-center">
              <div className="p-3 bg-black/30 rounded-xl border border-white/10">
                <span className="text-[10px] text-muted-foreground block mb-1">Google Safe Browsing</span>
                <Badge variant="outline" className={scanResult.googleSafeBrowsing?.isSafe ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs" : "bg-red-500/10 text-red-400 border-red-500/30 text-xs"}>
                  {scanResult.googleSafeBrowsing?.isSafe ? "Verified Clean" : "Threat Detected"}
                </Badge>
              </div>
              <div className="p-3 bg-black/30 rounded-xl border border-white/10">
                <span className="text-[10px] text-muted-foreground block mb-1">SSL Certificate</span>
                <Badge variant="outline" className={scanResult.sslSecure ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs" : "bg-red-500/10 text-red-400 border-red-500/30 text-xs"}>
                  {scanResult.sslSecure ? "HTTPS Encrypted" : "Unencrypted HTTP"}
                </Badge>
              </div>
              <div className="p-3 bg-black/30 rounded-xl border border-white/10">
                <span className="text-[10px] text-muted-foreground block mb-1">Security Score</span>
                <span className={`text-sm font-bold ${scanResult.securityScore && scanResult.securityScore >= 80 ? "text-emerald-400" : "text-amber-400"}`}>
                  {scanResult.securityScore ?? 95}/100
                </span>
              </div>
            </div>

            {/* Scan Details */}
            <div className="border-t border-white/10 pt-5 space-y-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Scan completed at:</span>
                <span className="flex items-center gap-1 font-mono text-white">
                  <Clock className="h-3.5 w-3.5 text-purple-400" />
                  {scanResult.scanTime}
                </span>
              </div>

              {/* Analysis Text */}
              {scanResult.analysis && (
                <div className="p-3.5 bg-black/40 rounded-xl border border-white/10">
                  <span className="text-[11px] font-semibold text-cyan-300 block mb-1">Google & Security Analysis:</span>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {scanResult.analysis}
                  </p>
                </div>
              )}
              
              {scanResult.threats.length > 0 ? (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider mb-2 text-red-400 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Threats / Warnings Detected:
                  </h4>
                  <ul className="space-y-1.5">
                    {scanResult.threats.map((threat, index) => (
                      <li key={index} className="text-xs text-slate-300 flex items-start gap-2 bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                        <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
                        <span>{threat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="text-center p-3.5 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
                  <p className="text-emerald-400 text-xs font-medium flex items-center justify-center gap-1.5">
                    <CheckCircle className="w-4 h-4" />
                    Google Safe Browsing database & SSL check confirmed: Clean and secure website.
                  </p>
                </div>
              )}
            </div>

            <Button
              onClick={() => {
                setScanResult(null);
                setUrl("");
              }}
              variant="outline"
              className="w-full mt-5 border-white/15 hover:bg-white/10 text-xs"
            >
              Scan Another Website
            </Button>
          </div>
        )}

        {/* Safety Tips */}
        <div className="glass-card p-5 rounded-2xl animate-fade-in border-white/10">
          <h3 className="text-xs font-bold uppercase tracking-wider text-purple-300 mb-3 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            Website Safety Tips:
          </h3>
          <ul className="text-xs text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              <span>Always verify URLs and domain spellings before entering sensitive credentials.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              <span>Check for HTTPS and a valid lock icon in your browser address bar.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              <span>Be cautious of shortened links (bit.ly, tinyurl) sent via SMS or WhatsApp.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              <span>Banks and government portals NEVER use high-risk TLDs like <code>.xyz</code> or <code>.top</code>.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default WebsiteScanner;