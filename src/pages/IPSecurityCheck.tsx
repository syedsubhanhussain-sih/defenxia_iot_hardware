import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { invokeEdgeFunction } from "@/lib/supabase-client";
import { toast } from "sonner";
import { Shield, AlertTriangle, CheckCircle, Globe, MapPin } from "lucide-react";

interface IPSecurityResult {
  service: string;
  ipAddress: string;
  isPublic: boolean;
  abuseConfidencePercentage: number;
  countryCode: string;
  usageType: string;
  isp: string;
  domain: string;
  totalReports: number;
  numDistinctUsers: number;
  lastReportedAt: string;
  status: string;
}

const IPSecurityCheck = () => {
  const [ipAddress, setIpAddress] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<IPSecurityResult | null>(null);

  const handleCheck = async () => {
    if (!ipAddress.trim()) {
      toast.error('Please enter an IP address');
      return;
    }

    setIsChecking(true);
    try {
      const { data, error } = await invokeEdgeFunction('ip-security-check', {
        ipAddress: ipAddress.trim()
      });

      if (error) {
        console.error('IP security check error:', error);
        toast.error('Failed to check IP address');
      } else {
        setResult(data);
        toast.success('IP security check completed');
      }
    } catch (err) {
      console.error('Check error:', err);
      toast.error('Error performing IP check');
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'clean': return 'text-green-500';
      case 'suspicious': return 'text-red-500';
      case 'warning': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'clean': return CheckCircle;
      case 'suspicious': return AlertTriangle;
      default: return Shield;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'clean': return 'Clean';
      case 'suspicious': return 'Suspicious';
      case 'warning': return 'Warning';
      default: return 'Unknown';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Globe className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">IP Security Check</h1>
          </div>
          <p className="text-muted-foreground">
            Check IP addresses for malicious activities using AbuseIPDB
          </p>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              AbuseIPDB Checker
            </CardTitle>
            <CardDescription>
              Enter an IP address to check for reported malicious activities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter IP address (e.g., 192.168.1.1)"
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isChecking && handleCheck()}
              />
              <Button onClick={handleCheck} disabled={isChecking}>
                {isChecking ? 'Checking...' : 'Check IP'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {result && (
          <Card className="glass-card mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {(() => {
                  const Icon = getStatusIcon(result.status);
                  return <Icon className={`h-5 w-5 ${getStatusColor(result.status)}`} />;
                })()}
                Security Analysis Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">IP Address</h4>
                  <p className="text-sm text-muted-foreground">{result.ipAddress}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Status</h4>
                  <Badge variant={result.status === 'clean' ? 'default' : 'destructive'}>
                    {getStatusText(result.status)}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Abuse Confidence</h4>
                  <p className="text-sm">
                    <span className={result.abuseConfidencePercentage > 25 ? 'text-red-500' : 'text-green-500'}>
                      {result.abuseConfidencePercentage}%
                    </span>
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Total Reports</h4>
                  <p className="text-sm text-muted-foreground">{result.totalReports}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    Location
                  </h4>
                  <p className="text-sm text-muted-foreground">{result.countryCode}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">ISP</h4>
                  <p className="text-sm text-muted-foreground">{result.isp}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Usage Type</h4>
                  <p className="text-sm text-muted-foreground">{result.usageType}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Domain</h4>
                  <p className="text-sm text-muted-foreground">{result.domain || 'N/A'}</p>
                </div>
              </div>

              {result.lastReportedAt && (
                <div>
                  <h4 className="font-semibold mb-2">Last Reported</h4>
                  <p className="text-sm text-muted-foreground">{result.lastReportedAt}</p>
                </div>
              )}

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Report Summary</h4>
                <p className="text-sm text-muted-foreground">
                  {result.numDistinctUsers > 0 
                    ? `Reported by ${result.numDistinctUsers} distinct users` 
                    : 'No abuse reports found'}
                </p>
              </div>

              <Button 
                onClick={() => setResult(null)} 
                variant="ghost" 
                className="w-full"
              >
                Check Another IP
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="glass-card mt-6">
          <CardHeader>
            <CardTitle>About AbuseIPDB</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• AbuseIPDB is a collaborative database of IP addresses used for malicious activities</li>
              <li>• Confidence percentage indicates likelihood of malicious behavior</li>
              <li>• Higher confidence (&gt;25%) suggests suspicious or malicious activity</li>
              <li>• Used by security professionals to identify threats and block malicious IPs</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default IPSecurityCheck;