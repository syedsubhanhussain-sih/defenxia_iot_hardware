import { useState, useEffect } from "react";
import { Smartphone, AlertTriangle, CheckCircle, Camera, MapPin, Mic } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AppPermission {
  name: string;
  permissions: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

const AppPermissions = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentApp, setCurrentApp] = useState("");
  const [scanComplete, setScanComplete] = useState(false);
  const [scannedApps, setScannedApps] = useState<AppPermission[]>([]);

  const sampleApps = [
    { name: "Social Media App", permissions: ["Camera", "Location", "Contacts"], riskLevel: "medium" as const },
    { name: "Weather App", permissions: ["Location"], riskLevel: "low" as const },
    { name: "Photo Editor", permissions: ["Camera", "Storage", "Microphone"], riskLevel: "medium" as const },
    { name: "Unknown App", permissions: ["Camera", "Location", "Contacts", "Microphone", "SMS"], riskLevel: "high" as const },
    { name: "Music Player", permissions: ["Storage"], riskLevel: "low" as const },
  ];

  const startScan = () => {
    setIsScanning(true);
    setProgress(0);
    setScanComplete(false);
    setScannedApps([]);

    let appIndex = 0;
    const interval = setInterval(() => {
      if (appIndex < sampleApps.length) {
        setCurrentApp(`Scanning: ${sampleApps[appIndex].name} for unnecessary permissions...`);
        setProgress(((appIndex + 1) / sampleApps.length) * 100);
        appIndex++;
      } else {
        clearInterval(interval);
        setIsScanning(false);
        setScanComplete(true);
        setScannedApps(sampleApps);
      }
    }, 1200);
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return 'text-red-500 bg-red-500/20 border-red-500/30';
      case 'medium': return 'text-yellow-500 bg-yellow-500/20 border-yellow-500/30';
      case 'low': return 'text-green-500 bg-green-500/20 border-green-500/30';
      default: return 'text-gray-500 bg-gray-500/20 border-gray-500/30';
    }
  };

  const getPermissionIcon = (permission: string) => {
    switch (permission.toLowerCase()) {
      case 'camera': return <Camera size={16} />;
      case 'location': return <MapPin size={16} />;
      case 'microphone': return <Mic size={16} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">App Permissions Check</h1>
          <p className="text-muted-foreground">
            Scan your apps for unnecessary or risky permissions
          </p>
        </div>

        <div className="glass-card p-8 rounded-lg">
          {!isScanning && !scanComplete && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <Smartphone size={80} className="text-primary" />
              </div>
              <Button 
                onClick={startScan}
                className="glow-button text-white font-semibold px-8 py-4"
              >
                Start App Permissions Scan
              </Button>
            </div>
          )}

          {isScanning && (
            <div className="space-y-6">
              <div className="text-center">
                <Smartphone size={64} className="text-primary mx-auto mb-4 animate-pulse" />
                <h3 className="text-xl font-semibold mb-4">Scanning Applications...</h3>
              </div>
              
              <Progress value={progress} className="w-full" />
              <div className="text-center">
                <p className="text-sm text-muted-foreground">{currentApp}</p>
                <div className="text-lg font-semibold mt-2">{Math.round(progress)}%</div>
              </div>
            </div>
          )}

          {scanComplete && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-2">Scan Complete</h3>
                <p className="text-muted-foreground">
                  Found {scannedApps.filter(app => app.riskLevel === 'high').length} high-risk apps
                </p>
              </div>

              <div className="space-y-4">
                {scannedApps.map((app, index) => (
                  <div key={index} className="glass-card p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold">{app.name}</h4>
                      <Badge className={getRiskColor(app.riskLevel)}>
                        {app.riskLevel.toUpperCase()} RISK
                      </Badge>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {app.permissions.map((permission, permIndex) => (
                        <div 
                          key={permIndex}
                          className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                            ['Camera', 'Location', 'Microphone'].includes(permission)
                              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                              : 'bg-secondary text-secondary-foreground'
                          }`}
                        >
                          {getPermissionIcon(permission)}
                          {permission}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center">
                <Button 
                  onClick={() => {
                    setScanComplete(false);
                    setProgress(0);
                  }}
                  variant="outline"
                >
                  Scan Again
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppPermissions;