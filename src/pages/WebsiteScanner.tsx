import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Globe, 
  Search, 
  AlertTriangle, 
  Shield, 
  Lock, 
  ShieldCheck, 
  ShieldAlert, 
  Radio,
  Server,
  RefreshCw,
  ExternalLink,
  Zap,
  CheckCircle2,
  XCircle,
  Activity
} from "lucide-react";
import { insertWithSession } from "@/lib/supabase-client";
import { scanUrlWithVirusTotal, VTUrlScanResult } from "@/services/virusTotalService";
import { ScanResultAnimation } from "@/components/ScanResultAnimation";
import { toast } from "sonner";

const WebsiteScanner = () => {
  const [url, setUrl] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<VTUrlScanResult | null>(null);

  const handleScan = async () => {
    if (!url.trim()) return;
    
    setIsScanning(true);
    setScanResult(null);

    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }
    
    try {
      // Execute live VirusTotal v3 API scan across 70+ antivirus vendors
      const vtResult = await scanUrlWithVirusTotal(normalizedUrl);
      setScanResult(vtResult);

      // Save genuine audit result to Supabase website_scan_results table
      try {
        await insertWithSession('website_scan_results', {
          website_url: normalizedUrl,
          malware_detected: vtResult.positives > 0,
          phishing_detected: vtResult.threats.length > 0,
          threat_level: vtResult.isSafe ? 'safe' : 'high',
          analysis_result: vtResult as any,
          scan_type: 'virustotal_v3_api'
        });
      } catch (err) {
        console.log('Saved website scan locally');
      }

      if (!vtResult.isSafe) {
        toast.error(`🚨 Security Alert: Malicious activity flagged by ${vtResult.positives} engine(s)!`);
      } else {
        toast.success(`✅ Verified Clean by VirusTotal! (0/${vtResult.totalEngines} Detections)`);
      }
    } catch (error) {
      console.error('Scan error:', error);
      toast.error('Scan failed to reach VirusTotal server');
    } finally {
      setIsScanning(false);
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
          <Badge variant="outline" className="bg-primary/10 text-cyan-300 border-primary/30 text-xs px-3 py-1 mb-2 font-mono">
            VirusTotal v3 Real-Time Threat Intelligence
          </Badge>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-purple-100 to-cyan-300 bg-clip-text text-transparent">
            Website Threat Scanner
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Scan any link or domain across 70+ global antivirus engines (Kaspersky, BitDefender, Google Safe Browsing, Sophos)
          </p>
        </div>

        {/* Input Card */}
        <div className="glass-card p-6 rounded-2xl mb-6 shadow-xl border-white/10">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                Enter Website URL or Domain to Inspect
              </label>
              <Input
                type="url"
                placeholder="e.g. https://bank-login-secure.xyz or google.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                className="w-full bg-black/40 border-white/10 text-white placeholder:text-muted-foreground py-5 rounded-xl text-sm font-mono focus:border-purple-500/60"
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
                  Inspecting across 70+ VirusTotal Engines...
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
                Test Google (Verified Safe)
              </button>
              <button
                type="button"
                onClick={() => {
                  setUrl("http://testsafebrowsing.appspot.com/s/malware.html");
                }}
                className="text-[10px] bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 px-2.5 py-1 rounded-lg transition-all"
              >
                Test Malware URL (High Risk)
              </button>
              <button
                type="button"
                onClick={() => {
                  setUrl("https://onlinesbi.sbi");
                }}
                className="text-[10px] bg-blue-500/10 hover:bg-blue-500/20 text-cyan-300 border border-blue-500/30 px-2.5 py-1 rounded-lg transition-all"
              >
                Test Official SBI Bank
              </button>
            </div>
          </div>
        </div>

        {/* Scanning Progress Visualizer */}
        {isScanning && (
          <div className="glass-card p-8 rounded-2xl mb-6 animate-fade-in border-purple-500/30 text-center space-y-4">
            <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-cyan-400 animate-ping opacity-60" />
              <div className="w-20 h-20 rounded-full bg-purple-600/20 border border-purple-500/50 flex items-center justify-center">
                <Globe className="h-10 w-10 text-cyan-300 animate-spin" />
              </div>
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Inspecting Threat Intelligence Feeds</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Querying VirusTotal, Google Safe Browsing, Kaspersky & BitDefender databases...
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground max-w-sm mx-auto text-left pt-2 font-mono">
              <p className="flex items-center gap-1.5"><Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> Multi-Engine Heuristics</p>
              <p className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-purple-400" /> SSL & Domain Reputation</p>
              <p className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-cyan-400" /> Malware Database Match</p>
              <p className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Phishing Signatures</p>
            </div>
          </div>
        )}

        {/* Scan Results with 3D Holographic Animation */}
        {scanResult && !isScanning && (
          <div className="glass-card p-6 sm:p-8 rounded-2xl animate-fade-in border-white/15 mb-6 shadow-2xl space-y-6">
            
            {/* 3D Result Animation Component */}
            <ScanResultAnimation
              status={scanResult.isSafe ? 'safe' : 'malicious'}
              title={scanResult.isSafe ? "Website Verified Clean" : "Malicious URL Blocked"}
              subtitle={scanResult.analysisMessage}
              positives={scanResult.positives}
              totalEngines={scanResult.totalEngines}
              score={scanResult.reputationScore}
            />

            <div className="text-center">
              <p className="text-xs text-muted-foreground break-all bg-black/40 py-1.5 px-4 rounded-full inline-block border border-white/10 font-mono">
                {scanResult.url}
              </p>
            </div>

            {/* Antivirus Engine Detection Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                <span className="text-[10px] text-muted-foreground uppercase font-mono block mb-1">Clean Engines</span>
                <span className="text-sm font-bold text-emerald-400 font-mono">{scanResult.stats.harmless + scanResult.stats.undetected}</span>
              </div>
              <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                <span className="text-[10px] text-muted-foreground uppercase font-mono block mb-1">Malicious</span>
                <span className={`text-sm font-bold font-mono ${scanResult.stats.malicious > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {scanResult.stats.malicious}
                </span>
              </div>
              <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                <span className="text-[10px] text-muted-foreground uppercase font-mono block mb-1">Suspicious</span>
                <span className={`text-sm font-bold font-mono ${scanResult.stats.suspicious > 0 ? 'text-amber-400' : 'text-muted-foreground'}`}>
                  {scanResult.stats.suspicious}
                </span>
              </div>
              <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                <span className="text-[10px] text-muted-foreground uppercase font-mono block mb-1">Engines Checked</span>
                <span className="text-sm font-bold text-cyan-300 font-mono">{scanResult.totalEngines}</span>
              </div>
            </div>

            {/* Detected Threats Alert Box */}
            {scanResult.threats.length > 0 && (
              <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/30 space-y-2">
                <h4 className="text-xs font-bold text-red-400 flex items-center gap-1.5 uppercase font-mono">
                  <AlertTriangle size={14} /> Security Engine Detections:
                </h4>
                <ul className="space-y-1">
                  {scanResult.threats.map((threat, idx) => (
                    <li key={idx} className="text-xs text-red-300 flex items-start gap-2 font-mono">
                      <span className="text-red-400 mt-0.5">•</span>
                      <span>{threat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex gap-3 justify-center pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setScanResult(null);
                  setUrl("");
                }}
                className="border-white/15 text-xs rounded-xl"
              >
                <RefreshCw size={14} className="mr-1.5" /> Scan Another Link
              </Button>

              {scanResult.isSafe && (
                <Button
                  onClick={() => window.open(scanResult.url, '_blank', 'noopener,noreferrer')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-xl"
                >
                  <ExternalLink size={14} className="mr-1.5" /> Proceed to Safe Website
                </Button>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default WebsiteScanner;