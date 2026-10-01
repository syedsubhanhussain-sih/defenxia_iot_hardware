import { useState } from "react";
import { Shield, ShieldCheck, ShieldX, Globe, AlertTriangle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Firewall = () => {
  const [firewallEnabled, setFirewallEnabled] = useState(true);

  const allowedConnections = [
    "https://www.google.com",
    "https://github.com",
    "https://stackoverflow.com",
    "https://api.openai.com",
    "https://cdn.jsdelivr.net"
  ];

  const blockedConnections = [
    "http://malicious-site.com",
    "192.168.1.255 (Unknown IP)",
    "http://phishing-attempt.net",
    "203.45.67.89 (Suspicious IP)"
  ];

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">Firewall Control</h1>
          <p className="text-muted-foreground">
            Monitor and control network traffic to protect your device
          </p>
        </div>

        {/* Main Firewall Control */}
        <div className="glass-card p-8 rounded-lg mb-8 text-center">
          <div className="flex justify-center mb-6">
            {firewallEnabled ? (
              <ShieldCheck size={100} className="text-green-500" />
            ) : (
              <ShieldX size={100} className="text-red-500" />
            )}
          </div>

          <h2 className="text-2xl font-bold mb-4">Firewall Status</h2>
          
          <div className="flex items-center justify-center gap-4 mb-6">
            <span className={`font-semibold ${firewallEnabled ? 'text-green-500' : 'text-red-500'}`}>
              {firewallEnabled ? 'ENABLED' : 'DISABLED'}
            </span>
            <Switch
              checked={firewallEnabled}
              onCheckedChange={setFirewallEnabled}
              className="scale-150"
            />
          </div>

          {/* Data Flow Animation */}
          <div className="relative h-32 glass-card rounded-lg p-4 mb-6 overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex items-center gap-8">
                <Globe size={32} className="text-blue-400" />
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-full ${
                        firewallEnabled 
                          ? i % 2 === 0 
                            ? 'bg-green-500 animate-pulse' 
                            : 'bg-red-500 animate-bounce'
                          : 'bg-blue-400 animate-pulse'
                      }`}
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </div>
                <Shield size={32} className={firewallEnabled ? "text-green-500" : "text-gray-500"} />
                <div className="flex gap-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-full ${
                        firewallEnabled 
                          ? 'bg-green-500 animate-pulse' 
                          : 'bg-blue-400 animate-pulse'
                      }`}
                      style={{ animationDelay: `${i * 0.3}s` }}
                    />
                  ))}
                </div>
                <div className="w-8 h-8 rounded border-2 border-primary flex items-center justify-center">
                  <div className="w-4 h-4 bg-primary rounded"></div>
                </div>
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {firewallEnabled 
              ? "Firewall is actively filtering network traffic"
              : "All network traffic is allowed through"
            }
          </p>
        </div>

        {/* Connection Status */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-500">
                <ShieldCheck size={20} />
                Allowed Connections
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {allowedConnections.map((connection, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 rounded bg-green-500/10 border border-green-500/20">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-mono break-all">{connection}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-500">
                <AlertTriangle size={20} />
                Blocked Connections
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {blockedConnections.map((connection, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 rounded bg-red-500/10 border border-red-500/20">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-sm font-mono break-all">{connection}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Firewall;