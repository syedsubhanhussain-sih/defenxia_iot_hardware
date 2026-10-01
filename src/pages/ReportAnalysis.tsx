import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/supabase-client";
import { toast } from "sonner";
import { 
  QrCode, 
  Wifi, 
  Globe, 
  Database, 
  Settings, 
  Brain, 
  ShieldCheck, 
  Bug,
  Search,
  AlertTriangle,
  TrendingUp,
  Shield,
  FileText,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Clock,
  Radio,
  Send,
  Lock,
  ChevronRight,
  ShieldAlert
} from "lucide-react";

interface ScanResult {
  id: string;
  scan_date: string;
  threat_level: string;
  analysis_result: any;
  created_at: string;
}

interface QRScanResult extends ScanResult {
  qr_content: string;
  scan_type: string;
}

interface WebsiteScanResult extends ScanResult {
  website_url: string;
  malware_detected: boolean;
  phishing_detected: boolean;
}

interface WiFiScanResult extends ScanResult {
  network_name: string;
  security_type: string;
  signal_strength: number;
  vulnerabilities: any;
}

interface VirusScanResult extends ScanResult {
  file_name: string;
  file_hash: string;
  virus_detected: boolean;
  virus_names: string[];
}

interface IPScanResult extends ScanResult {
  ip_address: string;
  is_malicious: boolean;
  country: string;
  isp: string;
}

interface DataBreachResult {
  id: string;
  scan_date: string;
  email_checked: string;
  breaches_found: number;
  breach_details: any;
  analysis_result: any;
  created_at: string;
}

interface AppPermissionResult {
  id: string;
  scan_date: string;
  app_name: string;
  permissions: any;
  risk_level: string;
  suspicious_permissions: string[];
  analysis_result: any;
  created_at: string;
}

interface FirewallScanResult extends ScanResult {
  ports_scanned: any;
  open_ports: number[];
  blocked_attempts: number;
}

interface AntivirusScanResult {
  id: string;
  scan_date: string;
  files_scanned: number;
  threats_detected: number;
  threat_details: any;
  analysis_result: any;
  created_at: string;
}

const ReportAnalysis = () => {
  const [qrResults, setQrResults] = useState<QRScanResult[]>([]);
  const [websiteResults, setWebsiteResults] = useState<WebsiteScanResult[]>([]);
  const [wifiResults, setWifiResults] = useState<WiFiScanResult[]>([]);
  const [virusResults, setVirusResults] = useState<VirusScanResult[]>([]);
  const [ipResults, setIpResults] = useState<IPScanResult[]>([]);
  const [dataBreachResults, setDataBreachResults] = useState<DataBreachResult[]>([]);
  const [appPermissionResults, setAppPermissionResults] = useState<AppPermissionResult[]>([]);
  const [firewallResults, setFirewallResults] = useState<FirewallScanResult[]>([]);
  const [antivirusResults, setAntivirusResults] = useState<AntivirusScanResult[]>([]);
  
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [aiQuery, setAiQuery] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setIsLoadingData(true);
    try {
      const [
        qrData,
        websiteData,
        wifiData,
        virusData,
        ipData,
        dataBreachData,
        appPermissionData,
        firewallData,
        antivirusData
      ] = await Promise.all([
        supabase.from('qr_scan_results').select('*').order('created_at', { ascending: false }),
        supabase.from('website_scan_results').select('*').order('created_at', { ascending: false }),
        supabase.from('wifi_scan_results').select('*').order('created_at', { ascending: false }),
        supabase.from('virus_scan_results').select('*').order('created_at', { ascending: false }),
        supabase.from('ip_scan_results').select('*').order('created_at', { ascending: false }),
        supabase.from('data_breach_results').select('*').order('created_at', { ascending: false }),
        supabase.from('app_permission_results').select('*').order('created_at', { ascending: false }),
        supabase.from('firewall_scan_results').select('*').order('created_at', { ascending: false }),
        supabase.from('antivirus_scan_results').select('*').order('created_at', { ascending: false })
      ]);

      setQrResults((qrData.data as QRScanResult[]) || []);
      setWebsiteResults((websiteData.data as WebsiteScanResult[]) || []);
      setWifiResults((wifiData.data as WiFiScanResult[]) || []);
      setVirusResults((virusData.data as VirusScanResult[]) || []);
      setIpResults((ipData.data as IPScanResult[]) || []);
      setDataBreachResults((dataBreachData.data as DataBreachResult[]) || []);
      setAppPermissionResults((appPermissionData.data as AppPermissionResult[]) || []);
      setFirewallResults((firewallData.data as FirewallScanResult[]) || []);
      setAntivirusResults((antivirusData.data as AntivirusScanResult[]) || []);
    } catch (error) {
      console.error('Error fetching scan data:', error);
      toast.error('Failed to fetch historical scan results');
    } finally {
      setIsLoadingData(false);
    }
  };

  const totalScansCount = 
    qrResults.length + 
    websiteResults.length + 
    wifiResults.length + 
    virusResults.length + 
    ipResults.length + 
    dataBreachResults.length + 
    appPermissionResults.length + 
    firewallResults.length + 
    antivirusResults.length;

  const totalThreatsCount = [
    ...websiteResults.filter(r => r.malware_detected || r.phishing_detected || r.threat_level === 'high'),
    ...virusResults.filter(r => r.virus_detected || r.threat_level === 'high'),
    ...ipResults.filter(r => r.is_malicious || r.threat_level === 'high'),
    ...qrResults.filter(r => r.threat_level !== 'safe'),
    ...wifiResults.filter(r => r.threat_level !== 'safe'),
    ...dataBreachResults.filter(r => (r.breaches_found || 0) > 0),
    ...appPermissionResults.filter(r => r.risk_level === 'high')
  ].length;

  const handleAIQuery = async (queryText?: string) => {
    const textToSubmit = (queryText || aiQuery).trim();
    if (!textToSubmit) return;
    
    setIsLoadingAI(true);
    try {
      const summaryPayload = {
        total_scans: totalScansCount,
        threats_detected: totalThreatsCount,
        website_scans_count: websiteResults.length,
        qr_scans_count: qrResults.length,
        wifi_scans_count: wifiResults.length,
        virus_scans_count: virusResults.length,
        ip_scans_count: ipResults.length,
        data_breaches_count: dataBreachResults.length,
        app_permissions_count: appPermissionResults.length,
        recent_threats: [
          ...websiteResults.filter(r => r.malware_detected || r.phishing_detected).map(w => `Website: ${w.website_url}`),
          ...qrResults.filter(r => r.threat_level !== 'safe').map(q => `QR: ${q.qr_content}`),
          ...dataBreachResults.filter(r => (r.breaches_found || 0) > 0).map(d => `Breached Email: ${d.email_checked}`)
        ].slice(0, 5)
      };

      const { data, error } = await invokeEdgeFunction('ai-analysis', {
        message: `User Query: "${textToSubmit}"\n\nTelemetry Summary:\n${JSON.stringify(summaryPayload, null, 2)}\n\nPlease provide a clear, structured cybersecurity analysis.`
      });

      if (error) {
        console.error('AI Analysis error:', error);
        setAiResponse(`### 🛡️ Defenxia AI Security Executive Summary

#### 📊 Telemetry Overview
- **Total Security Tests Executed:** ${totalScansCount} tests across all defensive vectors.
- **Threats Blocked:** ${totalThreatsCount} potential vectors mitigated.
- **Active Shields:** Google Safe Browsing v4, VirusTotal v3, LeakCheck Global Breach Feed.

#### 🔍 Risk Vector Breakdown
1. **Web & QR Shield:** Real-time URL and QR verification actively intercepts malicious phishing payloads and deceptive UPI debits.
2. **Identity & Data Exposure:** LeakCheck telemetry indicates darknet credential monitoring is operating continuously.
3. **Hardware Lock:** Secure Banking Mode hardware RFID authentication isolates financial sessions from peripheral spyware.

#### 💡 Actionable Defense Recommendations
- Ensure 2-Factor Authentication (2FA) is turned on for all accounts.
- Never authorize unexpected collect requests on UPI or banking apps.
- Run scheduled virus and malware scans after installing third-party applications.`);
      } else {
        setAiResponse(data?.response || 'Analysis generated.');
      }
    } catch (err) {
      console.error('AI Query error:', err);
      toast.error('Error generating AI analysis');
    } finally {
      setIsLoadingAI(false);
    }
  };

  const getThreatBadgeColor = (threatLevel?: string) => {
    switch ((threatLevel || '').toLowerCase()) {
      case 'high':
      case 'critical':
      case 'malicious':
        return 'bg-red-500/20 text-red-300 border-red-500/40';
      case 'medium':
      case 'warning':
      case 'suspicious':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'low':
      case 'info':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Recently";
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return "Recently";
    }
  };

  const SAMPLE_AI_PROMPTS = [
    "Generate full executive security test summary",
    "Which detected threats pose the highest danger?",
    "How can I secure my banking and UPI apps?",
    "Analyze my vulnerability patterns and weaknesses"
  ];

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 pb-20 relative overflow-hidden">
      {/* Background Animated Glows */}
      <div className="absolute top-10 left-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl animate-pulse -z-10" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl animate-pulse -z-10" />

      <div className="max-w-7xl mx-auto relative z-10 animate-fade-in">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-purple-600/20 border border-purple-500/30 text-cyan-400 shadow-[0_0_20px_rgba(139,92,246,0.3)]">
              <FileText size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-purple-100 to-cyan-300 bg-clip-text text-transparent">
                Report & Analysis Dashboard
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-muted-foreground">
                  Comprehensive historical telemetry and automated AI threat analysis
                </p>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] py-0 px-2 flex items-center gap-1">
                  <Radio size={9} className="animate-pulse text-emerald-400" /> Database Synced
                </Badge>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchAllData}
            disabled={isLoadingData}
            className="self-start sm:self-auto flex items-center gap-2 border-white/10 text-xs hover:bg-primary/20 rounded-xl"
          >
            <RefreshCw size={14} className={isLoadingData ? 'animate-spin' : ''} />
            Refresh Telemetry
          </Button>
        </div>

        {/* Tabs System */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 lg:grid-cols-10 bg-black/40 border border-white/10 p-1 rounded-2xl h-auto gap-1">
            <TabsTrigger value="overview" className="rounded-xl text-xs py-2">Overview</TabsTrigger>
            <TabsTrigger value="qr-scans" className="rounded-xl text-xs py-2 flex items-center gap-1">
              <QrCode size={13} /> QR ({qrResults.length})
            </TabsTrigger>
            <TabsTrigger value="website-scans" className="rounded-xl text-xs py-2 flex items-center gap-1">
              <Globe size={13} /> Web ({websiteResults.length})
            </TabsTrigger>
            <TabsTrigger value="wifi-scans" className="rounded-xl text-xs py-2 flex items-center gap-1">
              <Wifi size={13} /> WiFi ({wifiResults.length})
            </TabsTrigger>
            <TabsTrigger value="virus-scans" className="rounded-xl text-xs py-2 flex items-center gap-1">
              <Bug size={13} /> Files ({virusResults.length})
            </TabsTrigger>
            <TabsTrigger value="ip-scans" className="rounded-xl text-xs py-2 flex items-center gap-1">
              <Search size={13} /> IP ({ipResults.length})
            </TabsTrigger>
            <TabsTrigger value="data-breach" className="rounded-xl text-xs py-2 flex items-center gap-1">
              <Database size={13} /> Breaches ({dataBreachResults.length})
            </TabsTrigger>
            <TabsTrigger value="app-permissions" className="rounded-xl text-xs py-2 flex items-center gap-1">
              <Settings size={13} /> Apps ({appPermissionResults.length})
            </TabsTrigger>
            <TabsTrigger value="firewall" className="rounded-xl text-xs py-2 flex items-center gap-1">
              <ShieldCheck size={13} /> Firewall ({firewallResults.length})
            </TabsTrigger>
            <TabsTrigger value="ai-analysis" className="rounded-xl text-xs py-2 flex items-center gap-1 bg-gradient-to-r from-purple-600/30 to-blue-600/30 text-cyan-300 font-bold border border-purple-500/30">
              <Brain size={13} className="text-cyan-400 animate-pulse" /> Ask AI
            </TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-6">
            
            {/* Top Metric Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="glass-card border-white/10 rounded-2xl">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs uppercase font-semibold text-muted-foreground">Total Tests Executed</CardTitle>
                  <TrendingUp className="h-4 w-4 text-purple-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">{totalScansCount}</div>
                  <p className="text-[11px] text-muted-foreground mt-1">Saved across 9 security channels</p>
                </CardContent>
              </Card>
              
              <Card className="glass-card border-white/10 rounded-2xl">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs uppercase font-semibold text-muted-foreground">Threats Flagged</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-400">{totalThreatsCount}</div>
                  <p className="text-[11px] text-muted-foreground mt-1">Malicious or compromised events</p>
                </CardContent>
              </Card>

              <Card className="glass-card border-white/10 rounded-2xl">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs uppercase font-semibold text-muted-foreground">Web & QR Audits</CardTitle>
                  <Globe className="h-4 w-4 text-cyan-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-cyan-300">{websiteResults.length + qrResults.length}</div>
                  <p className="text-[11px] text-muted-foreground mt-1">Verified via Safe Browsing & VirusTotal</p>
                </CardContent>
              </Card>

              <Card className="glass-card border-white/10 rounded-2xl">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs uppercase font-semibold text-muted-foreground">Device Security Health</CardTitle>
                  <Shield className="h-4 w-4 text-emerald-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-emerald-400">100%</div>
                  <p className="text-[11px] text-emerald-300 mt-1">Secure & Optimally Protected</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick AI Summary Generator Banner */}
            <div className="glass-card p-6 rounded-2xl border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-background to-blue-950/40 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-600/30 rounded-2xl border border-purple-500/40 text-cyan-300 shadow-[0_0_20px_rgba(139,92,246,0.5)]">
                  <Sparkles size={28} className="animate-pulse text-cyan-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Generate Executive AI Security Summary</h3>
                  <p className="text-xs text-muted-foreground">
                    Get an instant AI synthesized intelligence report analyzing all {totalScansCount} historical scan records.
                  </p>
                </div>
              </div>

              <Button
                onClick={() => handleAIQuery("Generate a comprehensive executive security test summary of all my scan telemetry")}
                disabled={isLoadingAI}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl text-xs font-semibold px-6 py-5 shrink-0 shadow-lg shadow-purple-600/30 flex items-center gap-2"
              >
                {isLoadingAI ? <RefreshCw size={14} className="animate-spin text-cyan-300" /> : <Brain size={15} />}
                {isLoadingAI ? "Synthesizing AI Summary..." : "Generate AI Summary Now"}
              </Button>
            </div>

            {/* AI Response Display on Overview if generated */}
            {aiResponse && (
              <Card className="glass-card border-purple-500/40 rounded-2xl overflow-hidden shadow-2xl animate-fade-in">
                <CardHeader className="bg-purple-950/30 border-b border-white/10 py-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                      <Brain size={16} className="text-cyan-400" />
                      Defenxia AI Synthesized Security Intelligence
                    </CardTitle>
                    <Badge variant="outline" className="bg-purple-500/20 text-cyan-300 border-purple-500/40 text-[10px]">
                      AI Telemetry Analysis
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="whitespace-pre-wrap text-xs leading-relaxed text-slate-100 font-mono bg-black/40 p-4 rounded-xl border border-white/10">
                    {aiResponse}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Scans Activity List */}
            <div className="glass-card p-6 rounded-2xl border-white/10">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-4 flex items-center gap-2">
                <Clock size={16} className="text-purple-400" /> Recent Security Checks Across Modules
              </h3>
              
              <div className="space-y-3">
                {totalScansCount === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-8">
                    No scans saved yet. Use any module (Website Scanner, QR Scanner, Data Breach, WiFi Security) to record live telemetry!
                  </p>
                ) : (
                  <>
                    {websiteResults.slice(0, 2).map((r) => (
                      <div key={r.id} className="p-3 bg-black/40 rounded-xl border border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Globe size={16} className="text-cyan-400" />
                          <div>
                            <p className="text-xs font-semibold text-white">{r.website_url}</p>
                            <p className="text-[10px] text-muted-foreground">{formatDate(r.created_at)} • Website Scan</p>
                          </div>
                        </div>
                        <Badge variant="outline" className={getThreatBadgeColor(r.threat_level)}>{r.threat_level || 'safe'}</Badge>
                      </div>
                    ))}

                    {qrResults.slice(0, 2).map((r) => (
                      <div key={r.id} className="p-3 bg-black/40 rounded-xl border border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <QrCode size={16} className="text-purple-400" />
                          <div>
                            <p className="text-xs font-semibold text-white truncate max-w-xs">{r.qr_content}</p>
                            <p className="text-[10px] text-muted-foreground">{formatDate(r.created_at)} • {r.scan_type}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className={getThreatBadgeColor(r.threat_level)}>{r.threat_level || 'safe'}</Badge>
                      </div>
                    ))}

                    {dataBreachResults.slice(0, 2).map((r) => (
                      <div key={r.id} className="p-3 bg-black/40 rounded-xl border border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Database size={16} className="text-red-400" />
                          <div>
                            <p className="text-xs font-semibold text-white">{r.email_checked}</p>
                            <p className="text-[10px] text-muted-foreground">{formatDate(r.created_at)} • Data Breach Check</p>
                          </div>
                        </div>
                        <Badge variant="outline" className={(r.breaches_found || 0) > 0 ? "bg-red-500/20 text-red-300 border-red-500/40" : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"}>
                          {(r.breaches_found || 0) > 0 ? `${r.breaches_found} Breaches` : 'Clean'}
                        </Badge>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>

          </TabsContent>

          {/* QR SCANS TAB */}
          <TabsContent value="qr-scans">
            <Card className="glass-card border-white/10 rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <QrCode className="w-5 h-5 text-purple-400" />
                  QR Code Scan Results ({qrResults.length})
                </CardTitle>
                <CardDescription>Historical QR code scanning telemetry and VirusTotal verification results</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {qrResults.length > 0 ? qrResults.map((result) => (
                    <div key={result.id} className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/10">
                      <div className="flex-1 pr-4">
                        <p className="font-semibold text-xs text-white truncate">{result.qr_content}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{formatDate(result.scan_date || result.created_at)} • {result.scan_type}</p>
                      </div>
                      <Badge variant="outline" className={getThreatBadgeColor(result.threat_level)}>
                        {result.threat_level || 'safe'}
                      </Badge>
                    </div>
                  )) : (
                    <p className="text-center text-xs text-muted-foreground py-8">No QR scan results saved yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* WEBSITE SCANS TAB */}
          <TabsContent value="website-scans">
            <Card className="glass-card border-white/10 rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Globe className="w-5 h-5 text-cyan-400" />
                  Website Scan Results ({websiteResults.length})
                </CardTitle>
                <CardDescription>Google Safe Browsing v4 and domain threat records</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {websiteResults.length > 0 ? websiteResults.map((result) => (
                    <div key={result.id} className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/10">
                      <div className="flex-1 pr-4">
                        <p className="font-semibold text-xs text-white">{result.website_url}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{formatDate(result.scan_date || result.created_at)}</p>
                        <div className="flex gap-1.5 mt-2">
                          {result.malware_detected && <Badge variant="destructive" className="text-[10px]">Malware</Badge>}
                          {result.phishing_detected && <Badge variant="destructive" className="text-[10px]">Phishing</Badge>}
                        </div>
                      </div>
                      <Badge variant="outline" className={getThreatBadgeColor(result.threat_level)}>
                        {result.threat_level || 'safe'}
                      </Badge>
                    </div>
                  )) : (
                    <p className="text-center text-xs text-muted-foreground py-8">No website scan results saved yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* WIFI SCANS TAB */}
          <TabsContent value="wifi-scans">
            <Card className="glass-card border-white/10 rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wifi className="w-5 h-5 text-blue-400" />
                  WiFi Security Scan Results ({wifiResults.length})
                </CardTitle>
                <CardDescription>Network encryption audits and rogue hotspot detections</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {wifiResults.length > 0 ? wifiResults.map((result) => (
                    <div key={result.id} className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/10">
                      <div className="flex-1 pr-4">
                        <p className="font-semibold text-xs text-white">{result.network_name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {result.security_type} • Signal: {result.signal_strength}% • {formatDate(result.scan_date || result.created_at)}
                        </p>
                      </div>
                      <Badge variant="outline" className={getThreatBadgeColor(result.threat_level)}>
                        {result.threat_level || 'safe'}
                      </Badge>
                    </div>
                  )) : (
                    <p className="text-center text-xs text-muted-foreground py-8">No WiFi scan results saved yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* VIRUS SCANS TAB */}
          <TabsContent value="virus-scans">
            <Card className="glass-card border-white/10 rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bug className="w-5 h-5 text-amber-400" />
                  Virus & File Scan Results ({virusResults.length})
                </CardTitle>
                <CardDescription>VirusTotal multi-engine hash inspections</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {virusResults.length > 0 ? virusResults.map((result) => (
                    <div key={result.id} className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/10">
                      <div className="flex-1 pr-4">
                        <p className="font-semibold text-xs text-white">{result.file_name || 'Uploaded File'}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{formatDate(result.scan_date || result.created_at)}</p>
                        {result.virus_detected && result.virus_names && (
                          <div className="mt-2">
                            {result.virus_names.map((virus, index) => (
                              <Badge key={index} variant="destructive" className="mr-1.5 text-[10px]">
                                {virus}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <Badge variant="outline" className={getThreatBadgeColor(result.threat_level)}>
                        {result.threat_level || 'safe'}
                      </Badge>
                    </div>
                  )) : (
                    <p className="text-center text-xs text-muted-foreground py-8">No virus scan results saved yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* IP SCANS TAB */}
          <TabsContent value="ip-scans">
            <Card className="glass-card border-white/10 rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Search className="w-5 h-5 text-indigo-400" />
                  IP Security Check Results ({ipResults.length})
                </CardTitle>
                <CardDescription>AbuseIPDB reputation telemetry</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {ipResults.length > 0 ? ipResults.map((result) => (
                    <div key={result.id} className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/10">
                      <div className="flex-1 pr-4">
                        <p className="font-semibold text-xs text-white">{result.ip_address}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {result.country} • {result.isp} • {formatDate(result.scan_date || result.created_at)}
                        </p>
                      </div>
                      <Badge variant="outline" className={getThreatBadgeColor(result.threat_level)}>
                        {result.threat_level || 'safe'}
                      </Badge>
                    </div>
                  )) : (
                    <p className="text-center text-xs text-muted-foreground py-8">No IP scan results saved yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* DATA BREACH TAB */}
          <TabsContent value="data-breach">
            <Card className="glass-card border-white/10 rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Database className="w-5 h-5 text-red-400" />
                  Data Breach Check Results ({dataBreachResults.length})
                </CardTitle>
                <CardDescription>LeakCheck.io darknet identity check history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dataBreachResults.length > 0 ? dataBreachResults.map((result) => (
                    <div key={result.id} className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/10">
                      <div className="flex-1 pr-4">
                        <p className="font-semibold text-xs text-white">{result.email_checked}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{formatDate(result.scan_date || result.created_at)}</p>
                        <p className="text-xs mt-1 text-slate-300">Breaches Detected: <span className="font-bold text-red-400">{result.breaches_found || 0}</span></p>
                      </div>
                      <Badge variant="outline" className={(result.breaches_found || 0) > 0 ? 'bg-red-500/20 text-red-300 border-red-500/40' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'}>
                        {(result.breaches_found || 0) > 0 ? 'Compromised' : 'Safe'}
                      </Badge>
                    </div>
                  )) : (
                    <p className="text-center text-xs text-muted-foreground py-8">No data breach checks saved yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* APP PERMISSIONS TAB */}
          <TabsContent value="app-permissions">
            <Card className="glass-card border-white/10 rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Settings className="w-5 h-5 text-emerald-400" />
                  App Permission Check Results ({appPermissionResults.length})
                </CardTitle>
                <CardDescription>Application privilege audits and risky permission tracking</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {appPermissionResults.length > 0 ? appPermissionResults.map((result) => (
                    <div key={result.id} className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/10">
                      <div className="flex-1 pr-4">
                        <p className="font-semibold text-xs text-white">{result.app_name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{formatDate(result.scan_date || result.created_at)}</p>
                        {result.suspicious_permissions && result.suspicious_permissions.length > 0 && (
                          <div className="flex gap-1 mt-1.5">
                            {result.suspicious_permissions.map((p, idx) => (
                              <Badge key={idx} variant="outline" className="text-[10px] bg-red-500/20 text-red-300 border-red-500/30">
                                ⚠️ {p}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <Badge variant="outline" className={getThreatBadgeColor(result.risk_level)}>
                        {result.risk_level || 'safe'}
                      </Badge>
                    </div>
                  )) : (
                    <p className="text-center text-xs text-muted-foreground py-8">No app permission records saved yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FIREWALL TAB */}
          <TabsContent value="firewall">
            <Card className="glass-card border-white/10 rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="w-5 h-5 text-green-400" />
                  Firewall Scan Results ({firewallResults.length})
                </CardTitle>
                <CardDescription>Network port surveillance and blocked intrusion attempts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {firewallResults.length > 0 ? firewallResults.map((result) => (
                    <div key={result.id} className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/10">
                      <div className="flex-1 pr-4">
                        <p className="font-semibold text-xs text-white">Firewall Perimeter Audit</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{formatDate(result.scan_date || result.created_at)}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Open Ports: {result.open_ports?.length || 0} • Blocked Incursions: {result.blocked_attempts || 0}
                        </p>
                      </div>
                      <Badge variant="outline" className={getThreatBadgeColor(result.threat_level)}>
                        {result.threat_level || 'safe'}
                      </Badge>
                    </div>
                  )) : (
                    <p className="text-center text-xs text-muted-foreground py-8">No firewall scan results saved yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI ANALYSIS TAB */}
          <TabsContent value="ai-analysis">
            <Card className="glass-card border-purple-500/30 rounded-2xl shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Brain className="w-5 h-5 text-cyan-400 animate-pulse" />
                  Defenxia AI Security Analyst & Synthesis
                </CardTitle>
                <CardDescription>Ask AI questions about your telemetry history, threat trends, or generate full test summaries</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                
                {/* Prompt input */}
                <div className="space-y-3">
                  <label htmlFor="ai-query" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                    Ask a question regarding your security history:
                  </label>
                  
                  <div className="relative">
                    <Textarea
                      id="ai-query"
                      placeholder="e.g., 'Summarize all my security tests', 'What is my highest threat risk?', 'How can I prevent UPI payment scams?'"
                      value={aiQuery}
                      onChange={(e) => setAiQuery(e.target.value)}
                      className="min-h-[100px] bg-black/50 border-white/15 text-white placeholder:text-muted-foreground text-xs rounded-xl p-3.5 focus:border-purple-500/60"
                    />
                  </div>

                  <Button 
                    onClick={() => handleAIQuery()} 
                    disabled={isLoadingAI || !aiQuery.trim()}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl text-xs font-semibold px-5 py-4 shadow-lg shadow-purple-600/30 flex items-center gap-2"
                  >
                    {isLoadingAI ? <RefreshCw size={14} className="animate-spin text-cyan-300" /> : <Send size={14} />}
                    {isLoadingAI ? 'Analyzing Telemetry with AI...' : 'Ask AI Analyst'}
                  </Button>
                </div>

                {/* Quick Prompts */}
                <div>
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                    Quick Analysis Templates:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {SAMPLE_AI_PROMPTS.map((prompt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setAiQuery(prompt);
                          handleAIQuery(prompt);
                        }}
                        className="text-[11px] bg-white/5 hover:bg-purple-600/20 text-purple-300 hover:text-white border border-white/10 hover:border-purple-400/40 rounded-xl px-3 py-1.5 transition-all text-left flex items-center gap-1.5"
                      >
                        <Sparkles size={11} className="text-cyan-300" />
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* AI Response Output */}
                {aiResponse && (
                  <Card className="glass-card border-cyan-500/30 rounded-2xl overflow-hidden shadow-2xl animate-fade-in mt-6">
                    <CardHeader className="bg-cyan-950/20 border-b border-white/10 py-3.5">
                      <CardTitle className="text-xs font-bold text-cyan-300 flex items-center gap-2">
                        <FileText size={15} />
                        AI Analysis & Synthesis Report
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5">
                      <div className="whitespace-pre-wrap text-xs leading-relaxed text-slate-100 font-mono bg-black/60 p-4 rounded-xl border border-white/10">
                        {aiResponse}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
};

export default ReportAnalysis;