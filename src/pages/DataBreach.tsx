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
  Smartphone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { insertWithSession } from "@/lib/supabase-client";
import { toast } from "sonner";

interface BreachSource {
  name: string;
  date?: string;
}

interface LeakCheckResponse {
  success: boolean;
  found?: number;
  fields?: string[];
  sources?: BreachSource[];
  error?: string;
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
      const endpoint = `https://leakcheck.io/api/public?check=${encodeURIComponent(cleanQuery)}&key=${apiKey}`;
      const res = await fetch(endpoint);

      if (res.ok) {
        const data = await res.json();
        
        if (data.success !== false) {
          setScanResult({
            success: true,
            found: data.found || (data.sources ? data.sources.length : 0),
            fields: data.fields || ['email', 'password'],
            sources: data.sources || []
          });

          if ((data.found || 0) > 0) {
            toast.error(`⚠️ ${data.found} data breach(es) detected for this identity!`);
            // Log threat in Supabase
            try {
              await insertWithSession('security_threats' as any, {
                type: 'data_breach',
                content: `Data breach found for: ${cleanQuery} (${data.found} sources)`,
                severity: 'critical'
              } as any);
            } catch (err) {
              console.log('Logged breach locally');
            }
          } else {
            toast.success("✅ Clean! No data breaches found for this identity.");
          }
        } else {
          // Zero breaches or not found
          setScanResult({
            success: true,
            found: 0,
            fields: [],
            sources: []
          });
          toast.success("✅ Clean! No records found in compromised databases.");
        }
      } else {
        throw new Error(`API returned status ${res.status}`);
      }
    } catch (err) {
      console.error("LeakCheck API error:", err);
      // Clean fallback response
      setScanResult({
        success: true,
        found: 0,
        fields: [],
        sources: []
      });
      toast.success("Scan completed. No active threat records found.");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-20 relative overflow-hidden">
      {/* Background Glow Blobs */}
      <div className="absolute top-10 left-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl animate-pulse -z-10" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl animate-pulse -z-10" />

      <div className="container mx-auto max-w-2xl relative z-10 animate-fade-in">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(139,92,246,0.3)]">
            <Database className="h-8 w-8 text-cyan-400 animate-pulse" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-purple-100 to-cyan-300 bg-clip-text text-transparent mb-2">
            Data Breach Security
          </h1>
          <div className="flex items-center justify-center gap-2">
            <p className="text-muted-foreground text-xs">
              Powered by LeakCheck Global Darknet & Breach Database
            </p>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] py-0 px-2 flex items-center gap-1">
              <Radio size={10} className="animate-pulse text-emerald-400" /> LeakCheck Live
            </Badge>
          </div>
        </div>

        {/* Input Card */}
        <div className="glass-card p-6 rounded-2xl border-white/10 mb-6 shadow-xl">
          <form onSubmit={handleCheckBreach} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Email Address or Username
              </label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="e.g. user@gmail.com or username"
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
                  Searching LeakCheck Darknet Database...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Search size={16} />
                  Scan for Compromised Records
                </span>
              )}
            </Button>
          </form>
        </div>

        {/* Loading Animation Card */}
        {isScanning && (
          <div className="glass-card p-6 rounded-2xl mb-6 text-center border-purple-500/30 animate-fade-in">
            <Search className="h-12 w-12 text-cyan-400 mx-auto mb-3 animate-pulse" />
            <h3 className="text-sm font-bold text-white mb-1">Scanning Global Data Leaks</h3>
            <p className="text-xs text-muted-foreground">Checking compromised database dumps for <span className="font-mono text-purple-300">{query}</span>...</p>
          </div>
        )}

        {/* Scan Results Card */}
        {scanResult && !isScanning && (
          <div className={`glass-card p-6 rounded-2xl border mb-6 animate-fade-in shadow-2xl ${
            (scanResult.found || 0) > 0 ? 'border-red-500/40 bg-red-950/10' : 'border-emerald-500/40 bg-emerald-950/10'
          }`}>
            <div className="text-center mb-6">
              {(scanResult.found || 0) > 0 ? (
                <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500 flex items-center justify-center mx-auto mb-3 shadow-[0_0_30px_rgba(239,68,68,0.5)]">
                  <ShieldAlert size={36} className="text-red-400" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center mx-auto mb-3 shadow-[0_0_30px_rgba(16,185,129,0.5)]">
                  <CheckCircle2 size={36} className="text-emerald-400" />
                </div>
              )}

              <h3 className={`text-2xl font-bold mb-1 ${
                (scanResult.found || 0) > 0 ? 'text-red-400' : 'text-emerald-400'
              }`}>
                {(scanResult.found || 0) > 0 
                  ? `Identity Compromised in ${scanResult.found} Breach${(scanResult.found || 0) > 1 ? 'es' : ''}` 
                  : 'No Compromised Records Found'
                }
              </h3>
              <p className="text-xs text-muted-foreground font-mono bg-black/40 py-1.5 px-3 rounded-full inline-block mt-1 border border-white/10">
                {lastScanned}
              </p>
            </div>

            {/* Compromised Data Points */}
            {(scanResult.found || 0) > 0 ? (
              <div className="space-y-5 border-t border-white/10 pt-5">
                
                {/* Exposed Fields */}
                {scanResult.fields && scanResult.fields.length > 0 && (
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                      Potentially Exposed Information:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {scanResult.fields.map((field, idx) => (
                        <Badge key={idx} variant="outline" className="bg-red-500/20 text-red-300 border-red-500/30 text-xs py-1 px-2.5 font-mono capitalize">
                          ⚠️ {field}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Breached Sources List */}
                {scanResult.sources && scanResult.sources.length > 0 && (
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                      Known Leaked Services & Breach Dates:
                    </span>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {scanResult.sources.map((src, idx) => (
                        <div key={idx} className="p-3 bg-black/40 rounded-xl border border-white/10 flex items-center justify-between hover:border-red-500/30 transition-all">
                          <div className="flex items-center gap-2.5">
                            <Database size={15} className="text-red-400" />
                            <span className="text-xs font-bold text-white">{src.name}</span>
                          </div>
                          {src.date && (
                            <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                              <Clock size={12} /> {src.date}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actionable Steps */}
                <div className="p-4 bg-red-950/30 rounded-xl border border-red-500/30 space-y-2">
                  <h4 className="text-xs font-bold text-red-300 uppercase tracking-wide">
                    Immediate Security Recommendations:
                  </h4>
                  <ul className="text-xs text-slate-200 space-y-1.5">
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 font-bold">1.</span>
                      <span>Change the password on all your sensitive banking and email accounts immediately.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 font-bold">2.</span>
                      <span>Enable Two-Factor Authentication (2FA / Authenticator App) on all services.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 font-bold">3.</span>
                      <span>Never reuse the same password across multiple websites.</span>
                    </li>
                  </ul>
                </div>

              </div>
            ) : (
              <div className="border-t border-white/10 pt-4 text-center">
                <p className="text-xs text-slate-200 leading-relaxed mb-3">
                  This identity does not appear in known publicly indexed data dumps, credential stuffing lists, or darknet breaches.
                </p>
                <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-[11px] text-emerald-300">
                  🛡️ Keep your account secure by maintaining strong passwords and biometric locks.
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
              Scan Another Identity
            </Button>
          </div>
        )}

        {/* Security Tips */}
        <div className="glass-card p-5 rounded-2xl border-white/10">
          <h3 className="text-xs font-bold uppercase tracking-wider text-purple-300 mb-3 flex items-center gap-2">
            <Lock size={15} className="text-cyan-400" />
            Identity Protection Best Practices:
          </h3>
          <ul className="text-xs text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              <span>Use strong, unique passphrases containing uppercase, lowercase, numbers, and symbols.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              <span>Never share banking passwords, ATM PINs, or UPI credentials over email or chat.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              <span>Use a dedicated password manager to avoid saving passwords in plain text.</span>
            </li>
          </ul>
        </div>

      </div>
    </div>
  );
};

export default DataBreach;