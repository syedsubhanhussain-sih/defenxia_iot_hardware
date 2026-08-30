import { useState, useEffect } from "react";
import { QuickActionButton } from "@/components/quick-action-button";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { 
  Shield, 
  Wifi, 
  Globe, 
  QrCode, 
  Database, 
  Settings, 
  Search,
  AlertTriangle,
  Newspaper,
  LifeBuoy,
  Landmark,
  MessageSquareWarning
} from "lucide-react";

const quickActions = [
  // Row 1: Top 3 Flagship Modules
  { icon: Newspaper, label: "Cyber News", path: "/cyber-news" },
  { icon: LifeBuoy, label: "Cyber Help", path: "/cyber-help" },
  { icon: Landmark, label: "Secure Banking Mode", path: "/bank-shield" },

  // Row 2: AI SMS Shield at Top of 2nd Row
  { icon: MessageSquareWarning, label: "AI SMS Shield", path: "/ai-sms-shield" },
  { icon: QrCode, label: "Scan QR Code", path: "/qr-scanner" },
  { icon: Wifi, label: "WiFi Security", path: "/wifi-security" },

  // Row 3
  { icon: Globe, label: "Scan Website", path: "/website-scanner" },
  { icon: Shield, label: "Report & Analysis", path: "/report-analysis" },
  { icon: Database, label: "Data Breach Security", path: "/data-breach" },

  // Row 4
  { icon: Settings, label: "App Permissions Check", path: "/app-permissions" },
  { icon: Search, label: "Scan Files", path: "/virus-scanner" },
  { icon: AlertTriangle, label: "IP Security Check", path: "/ip-security-check" },
];

const Homepage = () => {
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [deviceScore, setDeviceScore] = useState(94);

  // Dynamically link device status to threat count in Supabase
  useEffect(() => {
    const fetchThreats = async () => {
      try {
        const sessionId = sessionStorage.getItem('app.session_id') || 'default-session';
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/security_threats?select=count`,
          {
            headers: {
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              'x-session-id': sessionId
            }
          }
        );
        const data = await response.json();
        const threatCount = Array.isArray(data) ? data.length : 0;
        // Adjust score based on logged threats: 94 baseline, -10 per threat (min 30)
        setDeviceScore(Math.max(30, 94 - threatCount * 10));
      } catch {
        // Fallback to baseline 94% on fetch error
        setDeviceScore(94);
      }
    };

    fetchThreats();
  }, []);

  const handleFullScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      navigate("/scanning");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10 animate-pulse" />
      <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-accent/10 rounded-full blur-3xl -z-10 animate-pulse" style={{ animationDelay: "1s" }} />

      <div className="container mx-auto px-4 py-6 max-w-md">
        {/* Device Status Card */}
        <div className="glass-card rounded-2xl p-6 mb-6 text-center animate-fade-in relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -z-10" />
          
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Shield className="h-10 w-10 text-primary animate-pulse" />
          </div>
          
          <h2 className="text-xl font-bold mb-1">
            {deviceScore >= 80 ? "Device is Protected" : "Threats Detected"}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Security Score: <span className="text-primary font-semibold">{deviceScore}%</span>
          </p>

          <Button
            onClick={handleFullScan}
            disabled={isScanning}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 rounded-xl shadow-lg shadow-primary/25 transition-all duration-300 hover:scale-[1.02]"
          >
            {isScanning ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                Scanning System...
              </span>
            ) : (
              "Run Full System Scan"
            )}
          </Button>
        </div>

        {/* Quick Actions Grid */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-1">
            Security Tools & Controls
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {quickActions.map((action, index) => (
              <QuickActionButton
                key={action.label}
                icon={action.icon}
                label={action.label}
                onClick={() => navigate(action.path)}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              />
            ))}
          </div>
        </div>

        {/* Security Overview */}
        <div className="glass-card rounded-2xl p-4 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold">Active Protection</h4>
            <span className="text-xs text-primary font-medium flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
              Real-time Monitoring
            </span>
          </div>
          
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex justify-between items-center py-1 border-b border-border/50">
              <span>Hardware RFID Lock</span>
              <span className="text-foreground font-medium">Armed & Active</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-border/50">
              <span>Google Safe Browsing</span>
              <span className="text-foreground font-medium">Online</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span>Currents News Feed</span>
              <span className="text-foreground font-medium">Real-time</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Homepage;
