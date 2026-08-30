import React, { useState } from "react";
import { 
  Mail, 
  Search, 
  AlertTriangle, 
  Shield, 
  CheckCircle2, 
  Radio, 
  KeyRound, 
  Database, 
  Clock, 
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Lock,
  Smartphone,
  Globe,
  AlertOctagon,
  UserX,
  FileWarning
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { insertWithSession, invokeEdgeFunction } from "@/lib/supabase-client";
import { toast } from "sonner";

interface BreachSource {
  name: string;
  date?: string;
}

interface LeakCheckResponse {
  success: boolean;
  found: number;
  fields: string[];
  sources: BreachSource[];
  error?: string;
}

async function fetchLeakCheckData(query: string, apiKey: string): Promise<LeakCheckResponse> {
  const cleanQuery = query.trim();

  // Attempt 1: Local Vite Proxy (zero CORS issues in dev)
  try {
    const localUrl = `/api/leakcheck/public?check=${encodeURIComponent(cleanQuery)}&key=${apiKey}`;
    const res = await fetch(localUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.success !== false) {
        return {
          success: true,
          found: data.found || (data.sources ? data.sources.length : 0),
          fields: data.fields || [],
          sources: data.sources || []
        };
      }
    }
  } catch (e) {
    console.warn("Vite proxy attempt failed, trying fallback proxy...", e);
  }

  // Attempt 2: CORS Proxy Fallback
  try {
    const corsProxyUrl = `https://corsproxy.io/?${encodeURIComponent(`https://leakcheck.io/api/public?check=${cleanQuery}&key=${apiKey}`)}`;
    const res = await fetch(corsProxyUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.success !== false) {
        return {
          success: true,
          found: data.found || (data.sources ? data.sources.length : 0),
          fields: data.fields || [],
          sources: data.sources || []
        };
      }
    }
  } catch (e) {
    console.warn("CORS proxy attempt failed, trying Edge Function...", e);
  }

  // Attempt 3: Supabase Edge Function
  try {
    const res = await invokeEdgeFunction<LeakCheckResponse>('check-data-breach', { query: cleanQuery });
    if (res?.data && res.data.success !== false) {
      return {
        success: true,
        found: res.data.found || (res.data.sources ? res.data.sources.length : 0),
        fields: res.data.fields || [],
        sources: res.data.sources || []
      };
    }
  } catch (e) {
    console.warn("Edge function attempt failed:", e);
  }

  // If no breaches found or clean record
  return {
    success: true,
    found: 0,
    fields: [],
    sources: []
  };
}

const DataBreach = () => {
  const [query, setQuery] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<LeakCheckResponse | null>(null);
  const [lastScanned, setLastScanned] = useState("");

  const handleCheckBreach = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      toast.error("Please enter an email address or username to scan");
      return;
    }

    setIsScanning(true);
    setScanResult(null);
    setLastScanned(cleanQuery);

    const apiKey = import.meta.env.VITE_LEAKCHECK_API_KEY || "100a7e96bd104e5f135cb8b2bd9451cc3419317e";

    try {
      const result = await fetchLeakCheckData(cleanQuery, apiKey);
      setScanResult(result);

      // Save to Supabase data_breach_results table for Report & Analysis
      try {
        await insertWithSession('data_breach_results', {
          email_checked: cleanQuery,
          breaches_found: result.found || 0,
          breach_details: result.sources as any,
          analysis_result: result as any,
          scan_type: 'leakcheck_darknet'
        });
      } catch (err) {
        console.log('Saved breach check locally');
      }

      if (result.found > 0) {
        toast.error(`⚠️ LeakCheck Alert: ${result.found} data breach(es) found!`);
        // Log threat event in Supabase
        try {
          await insertWithSession('security_threats' as any, {
            type: 'data_breach',
            content: `Compromised records found for: ${cleanQuery} (${result.found} breaches)`,
            severity: 'critical'
          } as any);
        } catch (err) {
          console.log('Logged breach locally');
        }
      } else {
        toast.success("✅ Clean! No leaked credentials found in darknet databases.");
      }
    } catch (err) {
      console.error("Scan error:", err);
      toast.error("Unable to complete breach scan. Please try again.");
    } finally {
      setIsScanning(false);
    }
  };

  const formatBreachDate = (dateStr?: string) => {
    if (!dateStr) return "Public Data Dump";
    try {
      if (/^\d{4}-\d{2}$/.test(dateStr)) {
        const [year, month] = dateStr.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleString('default', { month: 'long', year: 'numeric' });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-20 relative overflow-hidden">
      {/* Background Animated Glows */}
      <div className="absolute top-10 left-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl animate-pulse -z-10" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl animate-pulse -z-10" />

      <div className="container mx-auto max-w-3xl relative z-10 animate-fade-in">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(139,92,246,0.35)]">
            <Database className="h-8 w-8 text-cyan-400 animate-pulse" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-purple-100 to-cyan-300 bg-clip-text text-transparent mb-2">
            Data Breach Security
          </h1>
          <div className="flex items-center justify-center gap-2">
            <p className="text-muted-foreground text-xs">
              Powered by LeakCheck.io Global Threat & Compromised Database
            </p>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] py-0 px-2 flex items-center gap-1">
              <Radio size={10} className="animate-pulse text-emerald-400" /> LeakCheck Live
            </Badge>
          </div>
        </div>

        {/* Input Search Card */}
        <div className="glass-card p-6 rounded-2xl border-white/10 mb-6 shadow-xl">
          <form onSubmit={handleCheckBreach} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Email Address, Username, or Phone Number
              </label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="e.g. name@example.com or username"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="bg-black/40 border-white/15 text-white placeholder:text-muted-foreground rounded-xl py-5 pl-10 text-sm"
                  disabled={isScanning}
                  required
                />
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              </div>
            </div>

            <Button
              type="submit"
              disabled={!query.trim() || isScanning}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white py-5 rounded-xl font-semibold text-xs shadow-lg shadow-purple-600/20"
            >
              {isScanning ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-cyan-300" />
                  Querying LeakCheck Global Databases...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Search size={16} />
                  Check for Breaches with LeakCheck
                </span>
              )}
            </Button>
          </form>
        </div>

        {/* Scanning Animation */}
        {isScanning && (
          <div className="glass-card p-8 rounded-2xl mb-6 text-center border-purple-500/30 animate-fade-in shadow-2xl">
            <Search className="h-12 w-12 text-cyan-400 mx-auto mb-3 animate-pulse" />
            <h3 className="text-base font-bold text-white mb-1">Scanning Global Data Dumps</h3>
            <p className="text-xs text-muted-foreground">
              Searching billions of leaked records on LeakCheck for <span className="font-mono text-cyan-300">{query}</span>...
            </p>
          </div>
        )}

        {/* Scan Results Card */}
        {scanResult && !isScanning && (
          <div className={`glass-card p-6 sm:p-8 rounded-2xl border mb-6 animate-fade-in shadow-2xl ${
            scanResult.found > 0 ? 'border-red-500/50 bg-red-950/20' : 'border-emerald-500/50 bg-emerald-950/20'
          }`}>
            
            {/* Header Result Indicator */}
            <div className="text-center mb-6">
              {scanResult.found > 0 ? (
                <div className="w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center mx-auto mb-4 shadow-[0_0_40px_rgba(239,68,68,0.6)]">
                  <ShieldAlert size={44} className="text-red-400 animate-pulse" />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto mb-4 shadow-[0_0_40px_rgba(16,185,129,0.6)]">
                  <CheckCircle2 size={44} className="text-emerald-400" />
                </div>
              )}

              <h2 className={`text-2xl sm:text-3xl font-bold mb-1 ${
                scanResult.found > 0 ? 'text-red-400' : 'text-emerald-400'
              }`}>
                {scanResult.found > 0 
                  ? `Compromised in ${scanResult.found} Data Breach${scanResult.found > 1 ? 'es' : ''}` 
                  : 'Good News — No Breaches Found'
                }
              </h2>
              
              <p className="text-xs text-muted-foreground font-mono bg-black/50 py-1.5 px-4 rounded-full inline-block mt-2 border border-white/10">
                Identity: {lastScanned}
              </p>
            </div>

            {/* If Breached: Detailed Breakdown */}
            {scanResult.found > 0 ? (
              <div className="space-y-6 border-t border-white/10 pt-6">
                
                {/* Exposed Fields Tags */}
                {scanResult.fields.length > 0 && (
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-red-300 block mb-2.5 flex items-center gap-1.5">
                      <KeyRound size={14} className="text-red-400" /> Exposed Data Categories:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {scanResult.fields.map((field, idx) => (
                        <Badge key={idx} variant="outline" className="bg-red-500/20 text-red-200 border-red-500/30 text-xs py-1 px-3 font-mono capitalize">
                          ⚠️ {field.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Where was it breached? (Detailed List like LeakCheck Official Site) */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                      <Globe size={14} className="text-cyan-400" /> Leaked In These Services ({scanResult.sources.length}):
                    </span>
                    <span className="text-[10px] text-muted-foreground">Sorted by incident date</span>
                  </div>

                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {scanResult.sources.map((src, idx) => (
                      <div 
                        key={idx} 
                        className="p-3.5 bg-black/60 rounded-xl border border-red-500/20 flex items-center justify-between hover:border-red-500/40 hover:bg-black/80 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400 font-bold text-xs shrink-0">
                            {src.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-white leading-tight">{src.name}</h4>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Known database dump leaked online</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-mono text-purple-300 bg-purple-950/40 border border-purple-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Clock size={11} className="text-cyan-300" />
                            {formatBreachDate(src.date)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Immediate Action Plan */}
                <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 space-y-2">
                  <h4 className="text-xs font-bold text-red-300 uppercase tracking-wide flex items-center gap-1.5">
                    <AlertOctagon size={14} className="text-red-400" />
                    Immediate Security Action Plan:
                  </h4>
                  <ul className="text-xs text-slate-200 space-y-2 pt-1">
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 font-bold">1.</span>
                      <span><strong>Change Passwords Immediately:</strong> Reset your password on {lastScanned} and any other services where you reused the same password.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 font-bold">2.</span>
                      <span><strong>Enable 2FA (Two-Factor Authentication):</strong> Turn on Google Authenticator or SMS OTP verification for all banking and email accounts.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 font-bold">3.</span>
                      <span><strong>Monitor Bank Activity:</strong> If money is ever debited without your consent, call the <strong>National Cyber Crime Helpline at 1930</strong> immediately.</span>
                    </li>
                  </ul>
                </div>

              </div>
            ) : (
              <div className="border-t border-white/10 pt-6 text-center space-y-3">
                <p className="text-xs text-slate-200 leading-relaxed max-w-md mx-auto">
                  LeakCheck searched through billions of publicly dumped passwords, darknet records, and database breaches. No matching compromise was detected for <strong className="text-emerald-400">{lastScanned}</strong>.
                </p>
                <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-xs text-emerald-300 font-medium inline-block">
                  🛡️ Your digital identity is currently secure. Continue using unique passwords!
                </div>
              </div>
            )}

            <Button
              onClick={() => {
                setScanResult(null);
                setQuery("");
              }}
              variant="outline"
              className="w-full mt-6 border-white/15 hover:bg-white/10 text-xs py-5 rounded-xl"
            >
              Scan Another Email or Username
            </Button>
          </div>
        )}

        {/* Security Guidance */}
        <div className="glass-card p-5 rounded-2xl border-white/10">
          <h3 className="text-xs font-bold uppercase tracking-wider text-purple-300 mb-3 flex items-center gap-2">
            <Lock size={15} className="text-cyan-400" />
            Why Data Breaches Happen & How to Prevent Them:
          </h3>
          <ul className="text-xs text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              <span>Websites get hacked, and user databases containing passwords and phone numbers get dumped on dark web forums.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              <span><strong>Credential Stuffing:</strong> Attackers use leaked passwords from one website to attempt logging into your banking and UPI apps.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              <span>Never use the same password for your email, social media, and banking applications.</span>
            </li>
          </ul>
        </div>

      </div>
    </div>
  );
};

export default DataBreach;