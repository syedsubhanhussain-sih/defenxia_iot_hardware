import { useNavigate } from "react-router-dom";
import { ProgressCircle } from "@/components/ui/progress-circle";
import { QuickActionButton } from "@/components/quick-action-button";
import { Button } from "@/components/ui/button";
import { invokeEdgeFunction } from "@/lib/supabase-client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { queryWithSession } from "@/lib/supabase-client";
import { 
  QrCode, 
  Wifi, 
  Globe, 
  Shield, 
  Database, 
  Settings, 
  Search,
  AlertTriangle,
  Newspaper,
  LifeBuoy,
  Landmark
} from "lucide-react";

const quickActions = [
  { icon: Newspaper, label: "Cyber News", path: "/cyber-news" },
  { icon: LifeBuoy, label: "Cyber Help", path: "/cyber-help" },
  { icon: Landmark, label: "Secure Banking Mode", path: "/bank-shield" },
  { icon: QrCode, label: "Scan QR Code", path: "/qr-scanner" },
  { icon: Wifi, label: "WiFi Security", path: "/wifi-security" },
  { icon: Globe, label: "Scan Website", path: "/website-scanner" },
  { icon: Shield, label: "Report & Analysis", path: "/report-analysis" },
  { icon: Database, label: "Data Breach Security", path: "/data-breach" },
  { icon: Settings, label: "App Permissions Check", path: "/app-permissions" },
  { icon: Search, label: "Scan Files", path: "/virus-scanner" },
  { icon: AlertTriangle, label: "IP Security Check", path: "/ip-security-check" },
  { icon: Shield, label: "Settings", path: "/settings" },
];

const Homepage = () => {
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [deviceScore, setDeviceScore] = useState(94);

  // Dynamically link device status to threat count in Supabase
  useEffect(() => {
    const fetchThreats = async () => {
      try {
        const result = await queryWithSession('security_threats' as any);
        if (result?.data) {
          const threats = result.data as any[];
          const criticalCount = threats.filter((t: any) => t.severity === 'critical').length;
          const warningCount = threats.filter((t: any) => t.severity === 'warning').length;
          const penalty = criticalCount * 10 + warningCount * 5;
          setDeviceScore(Math.max(0, 100 - penalty));
        }
      } catch {
        // Keep default score
      }
    };
    fetchThreats();
  }, []);

  const handleComprehensiveScan = async () => {
    setIsScanning(true);
    try {
      const { data, error } = await invokeEdgeFunction('comprehensive-scan', {
        target: window.location.hostname || 'current-device',
        scanType: 'device'
      });

      if (error) {
        console.error('Comprehensive scan error:', error);
        toast.error('Failed to perform comprehensive scan');
      } else {
        console.log('Comprehensive scan results:', data);
        toast.success('Comprehensive scan completed successfully');
        navigate('/scanning', { state: { scanResults: data } });
      }
    } catch (err) {
      console.error('Scan error:', err);
      toast.error('Error performing comprehensive scan');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-gradient-to-r from-purple-500/30 to-blue-500/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-gradient-to-r from-indigo-500/25 to-purple-500/25 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="gradient-wave"></div>
        <div className="floating-particles">
          <div className="particle particle-1"></div>
          <div className="particle particle-2"></div>
          <div className="particle particle-3"></div>
          <div className="particle particle-4"></div>
          <div className="particle particle-5"></div>
        </div>
        <div className="absolute top-1/2 left-10 w-2 h-2 bg-purple-400 rounded-full animate-bounce opacity-60" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute top-1/4 right-20 w-3 h-3 bg-blue-400 rounded-full animate-bounce opacity-70" style={{ animationDelay: '1.5s' }}></div>
        <div className="absolute bottom-1/3 right-1/2 w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce opacity-50" style={{ animationDelay: '2.5s' }}></div>
      </div>
      
      <div className="container mx-auto px-4 py-8 max-w-6xl relative z-10">
        {/* Header Section */}
        <div className="text-center mb-8 animate-fade-in">
          <p className="text-muted-foreground text-lg mb-8">
            Rural Banking Security — Your device's ultimate protector
          </p>
        </div>

        {/* Device Status Section */}
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-3xl font-bold mb-4">Your Device Status</h2>
          <p className="text-muted-foreground mb-8">Secure and optimized</p>
          
          <div className="flex justify-center mb-8">
            <ProgressCircle percentage={deviceScore} />
          </div>

          <Button
            onClick={handleComprehensiveScan}
            disabled={isScanning}
            className="glow-button text-white font-semibold px-8 py-4 text-lg rounded-full min-w-[280px]"
          >
            {isScanning ? 'Scanning...' : 'Initiate Comprehensive Scan'}
          </Button>
        </div>

        {/* Quick Actions Section - 3-Column Grid */}
        <div className="animate-fade-in">
          <h3 className="text-2xl font-semibold mb-6 text-center">Quick Actions</h3>
          <div className="grid grid-cols-3 gap-4 max-w-4xl mx-auto">
            {quickActions.map((action, index) => (
              <div
                key={action.label}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <QuickActionButton
                  icon={action.icon}
                  label={action.label}
                  onClick={() => navigate(action.path)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Homepage;
