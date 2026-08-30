import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
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
  FileText
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
  const [aiQuery, setAiQuery] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
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

      setQrResults(qrData.data as QRScanResult[] || []);
      setWebsiteResults(websiteData.data as WebsiteScanResult[] || []);
      setWifiResults(wifiData.data as WiFiScanResult[] || []);
      setVirusResults(virusData.data as VirusScanResult[] || []);
      setIpResults(ipData.data as IPScanResult[] || []);
      setDataBreachResults(dataBreachData.data as DataBreachResult[] || []);
      setAppPermissionResults(appPermissionData.data as AppPermissionResult[] || []);
      setFirewallResults(firewallData.data as FirewallScanResult[] || []);
      setAntivirusResults(antivirusData.data as AntivirusScanResult[] || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch scan results');
    }
  };

  const handleAIQuery = async () => {
    if (!aiQuery.trim()) return;
    
    setIsLoadingAI(true);
    try {
      // Compile all scan data for AI analysis
      const allScanData = {
        qr_scans: qrResults,
        website_scans: websiteResults,
        wifi_scans: wifiResults,
        virus_scans: virusResults,
        ip_scans: ipResults,
        data_breach_checks: dataBreachResults,
        app_permission_checks: appPermissionResults,
        firewall_scans: firewallResults,
        antivirus_scans: antivirusResults,
        summary: {
          total_scans: qrResults.length + websiteResults.length + wifiResults.length + virusResults.length + ipResults.length + dataBreachResults.length + appPermissionResults.length + firewallResults.length + antivirusResults.length,
          threats_detected: [
            ...websiteResults.filter(r => r.malware_detected || r.phishing_detected),
            ...virusResults.filter(r => r.virus_detected),
            ...ipResults.filter(r => r.is_malicious),
            ...qrResults.filter(r => r.threat_level !== 'safe'),
            ...wifiResults.filter(r => r.threat_level !== 'safe')
          ].length
        }
      };

      const { data, error } = await supabase.functions.invoke('ai-analysis', {
        body: { 
          message: `Analyze this security scan data and answer the following question: "${aiQuery}"\n\nScan Data: ${JSON.stringify(allScanData)}\n\nProvide a detailed analysis focusing on vulnerabilities, threats, and security recommendations based on the historical data.`
        }
      });

      if (error) {
        console.error('AI Analysis error:', error);
        toast.error('Failed to get AI analysis');
      } else {
        setAiResponse(data.response || 'No response received');
      }
    } catch (err) {
      console.error('AI Query error:', err);
      toast.error('Error processing AI query');
    } finally {
      setIsLoadingAI(false);
    }
  };

  const getThreatBadgeColor = (threatLevel: string) => {
    switch (threatLevel) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-green-500';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Report & Analysis Dashboard</h1>
          <p className="text-muted-foreground">Comprehensive security analysis and historical scan results</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:grid-cols-10">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="qr-scans"><QrCode className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="website-scans"><Globe className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="wifi-scans"><Wifi className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="virus-scans"><Bug className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="ip-scans"><Search className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="data-breach"><Database className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="app-permissions"><Settings className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="firewall"><ShieldCheck className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="ai-analysis"><Brain className="w-4 h-4" /></TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Scans</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {qrResults.length + websiteResults.length + wifiResults.length + virusResults.length + ipResults.length + dataBreachResults.length + appPermissionResults.length + firewallResults.length + antivirusResults.length}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Threats Detected</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-500">
                    {[
                      ...websiteResults.filter(r => r.malware_detected || r.phishing_detected),
                      ...virusResults.filter(r => r.virus_detected),
                      ...ipResults.filter(r => r.is_malicious)
                    ].length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Website Scans</CardTitle>
                  <Globe className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{websiteResults.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Security Score</CardTitle>
                  <Shield className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-500">94%</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="qr-scans">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="w-5 h-5" />
                  QR Code Scan Results
                </CardTitle>
                <CardDescription>Historical QR code scanning activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {qrResults.length > 0 ? qrResults.map((result) => (
                    <div key={result.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium truncate">{result.qr_content}</p>
                        <p className="text-sm text-muted-foreground">{formatDate(result.scan_date)}</p>
                      </div>
                      <Badge className={getThreatBadgeColor(result.threat_level)}>
                        {result.threat_level}
                      </Badge>
                    </div>
                  )) : (
                    <p className="text-center text-muted-foreground py-8">No QR scan results found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="website-scans">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Website Scan Results
                </CardTitle>
                <CardDescription>Website security scanning history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {websiteResults.length > 0 ? websiteResults.map((result) => (
                    <div key={result.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{result.website_url}</p>
                        <p className="text-sm text-muted-foreground">{formatDate(result.scan_date)}</p>
                        <div className="flex gap-2 mt-2">
                          {result.malware_detected && <Badge variant="destructive">Malware</Badge>}
                          {result.phishing_detected && <Badge variant="destructive">Phishing</Badge>}
                        </div>
                      </div>
                      <Badge className={getThreatBadgeColor(result.threat_level)}>
                        {result.threat_level}
                      </Badge>
                    </div>
                  )) : (
                    <p className="text-center text-muted-foreground py-8">No website scan results found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wifi-scans">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wifi className="w-5 h-5" />
                  WiFi Security Scan Results
                </CardTitle>
                <CardDescription>WiFi network security analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {wifiResults.length > 0 ? wifiResults.map((result) => (
                    <div key={result.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{result.network_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {result.security_type} • Signal: {result.signal_strength}%
                        </p>
                        <p className="text-sm text-muted-foreground">{formatDate(result.scan_date)}</p>
                      </div>
                      <Badge className={getThreatBadgeColor(result.threat_level)}>
                        {result.threat_level}
                      </Badge>
                    </div>
                  )) : (
                    <p className="text-center text-muted-foreground py-8">No WiFi scan results found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="virus-scans">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bug className="w-5 h-5" />
                  Virus Scan Results
                </CardTitle>
                <CardDescription>File virus scanning history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {virusResults.length > 0 ? virusResults.map((result) => (
                    <div key={result.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{result.file_name || 'Unknown file'}</p>
                        <p className="text-sm text-muted-foreground">{formatDate(result.scan_date)}</p>
                        {result.virus_detected && result.virus_names && (
                          <div className="mt-2">
                            {result.virus_names.map((virus, index) => (
                              <Badge key={index} variant="destructive" className="mr-2">
                                {virus}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <Badge className={getThreatBadgeColor(result.threat_level)}>
                        {result.threat_level}
                      </Badge>
                    </div>
                  )) : (
                    <p className="text-center text-muted-foreground py-8">No virus scan results found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ip-scans">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  IP Security Check Results
                </CardTitle>
                <CardDescription>IP address security analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {ipResults.length > 0 ? ipResults.map((result) => (
                    <div key={result.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{result.ip_address}</p>
                        <p className="text-sm text-muted-foreground">
                          {result.country} • {result.isp}
                        </p>
                        <p className="text-sm text-muted-foreground">{formatDate(result.scan_date)}</p>
                        {result.is_malicious && (
                          <Badge variant="destructive" className="mt-2">Malicious IP</Badge>
                        )}
                      </div>
                      <Badge className={getThreatBadgeColor(result.threat_level)}>
                        {result.threat_level}
                      </Badge>
                    </div>
                  )) : (
                    <p className="text-center text-muted-foreground py-8">No IP scan results found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data-breach">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Data Breach Check Results
                </CardTitle>
                <CardDescription>Email data breach monitoring</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dataBreachResults.length > 0 ? dataBreachResults.map((result) => (
                    <div key={result.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{result.email_checked}</p>
                        <p className="text-sm text-muted-foreground">{formatDate(result.scan_date)}</p>
                        <p className="text-sm">Breaches found: {result.breaches_found}</p>
                      </div>
                      <Badge className={result.breaches_found > 0 ? 'bg-red-500' : 'bg-green-500'}>
                        {result.breaches_found > 0 ? 'Compromised' : 'Safe'}
                      </Badge>
                    </div>
                  )) : (
                    <p className="text-center text-muted-foreground py-8">No data breach check results found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="app-permissions">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  App Permission Check Results
                </CardTitle>
                <CardDescription>Application permission analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {appPermissionResults.length > 0 ? appPermissionResults.map((result) => (
                    <div key={result.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{result.app_name}</p>
                        <p className="text-sm text-muted-foreground">{formatDate(result.scan_date)}</p>
                        {result.suspicious_permissions && result.suspicious_permissions.length > 0 && (
                          <div className="mt-2">
                            {result.suspicious_permissions.map((permission, index) => (
                              <Badge key={index} variant="outline" className="mr-2">
                                {permission}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <Badge className={getThreatBadgeColor(result.risk_level)}>
                        {result.risk_level}
                      </Badge>
                    </div>
                  )) : (
                    <p className="text-center text-muted-foreground py-8">No app permission check results found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="firewall">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5" />
                  Firewall Scan Results
                </CardTitle>
                <CardDescription>Network firewall monitoring</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {firewallResults.length > 0 ? firewallResults.map((result) => (
                    <div key={result.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">Firewall Scan</p>
                        <p className="text-sm text-muted-foreground">{formatDate(result.scan_date)}</p>
                        <p className="text-sm">
                          Open Ports: {result.open_ports?.length || 0} • 
                          Blocked Attempts: {result.blocked_attempts}
                        </p>
                      </div>
                      <Badge className={getThreatBadgeColor(result.threat_level)}>
                        {result.threat_level}
                      </Badge>
                    </div>
                  )) : (
                    <p className="text-center text-muted-foreground py-8">No firewall scan results found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai-analysis">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  AI Report & Analysis
                </CardTitle>
                <CardDescription>Ask AI about your security history and vulnerabilities</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="ai-query" className="text-sm font-medium">Ask about your security data:</label>
                  <Textarea
                    id="ai-query"
                    placeholder="e.g., 'What are the most common threats detected?', 'Analyze my vulnerability patterns', 'What security improvements should I make?'"
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                    className="min-h-[100px]"
                  />
                  <Button onClick={handleAIQuery} disabled={isLoadingAI || !aiQuery.trim()}>
                    {isLoadingAI ? 'Analyzing...' : 'Get AI Analysis'}
                  </Button>
                </div>
                
                {aiResponse && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        AI Analysis Report
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="whitespace-pre-wrap text-sm">
                        {aiResponse}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Sample Questions:</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• "What security trends do you see in my scan history?"</li>
                    <li>• "Which threats pose the highest risk to my system?"</li>
                    <li>• "How can I improve my overall security posture?"</li>
                    <li>• "What patterns do you notice in my vulnerability data?"</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ReportAnalysis;