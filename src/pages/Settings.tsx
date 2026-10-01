import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, Bell, Moon, Globe, Shield, Smartphone, Volume2, Zap } from "lucide-react";
import { useSimulation } from "@/contexts/SimulationContext";

interface SettingItem {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  enabled: boolean;
}

const Settings = () => {
  const { isSimulating, setIsSimulating } = useSimulation();
  const [settings, setSettings] = useState<SettingItem[]>([
    {
      id: "notifications",
      label: "Enable Notifications",
      description: "Receive alerts about security threats and scan results",
      icon: Bell,
      enabled: true
    },
    {
      id: "darkMode",
      label: "Dark Mode",
      description: "Use dark theme for better viewing in low light",
      icon: Moon,
      enabled: true
    },
    {
      id: "autoScan",
      label: "Auto Security Scan",
      description: "Automatically run security scans daily",
      icon: Shield,
      enabled: false
    },
    {
      id: "soundAlerts",
      label: "Sound Alerts",
      description: "Play sound notifications for security alerts",
      icon: Volume2,
      enabled: true
    },
    {
      id: "realTimeProtection",
      label: "Real-time Protection",
      description: "Monitor system activity continuously",
      icon: Smartphone,
      enabled: true
    },
    {
      id: "language",
      label: "Language",
      description: "English (US)",
      icon: Globe,
      enabled: true
    }
  ]);

  const toggleSetting = (id: string) => {
    setSettings(prev => prev.map(setting => 
      setting.id === id 
        ? { ...setting, enabled: !setting.enabled }
        : setting
    ));
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-2xl">
        <div className="text-center mb-8 animate-fade-in">
          <SettingsIcon className="h-16 w-16 text-primary mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Customize your Defenxia security preferences
          </p>
        </div>

        {/* Simulate Attack */}
        <div className="glass-card p-6 rounded-2xl mb-6 animate-fade-in border border-warning/30">
          <div className="flex items-center justify-between p-4 rounded-lg bg-warning/10">
            <div className="flex items-center gap-4 flex-1">
              <Zap className="h-5 w-5 text-warning" />
              <div className="flex-1">
                <h3 className="font-medium text-foreground">Simulate Attack</h3>
                <p className="text-sm text-muted-foreground">Trigger fake Scam SMS & Screen Share alert for demo</p>
              </div>
            </div>
            <Switch
              checked={isSimulating}
              onCheckedChange={setIsSimulating}
              className="data-[state=checked]:bg-warning"
            />
          </div>
        </div>

        {/* Settings List */}
        <div className="glass-card p-6 rounded-2xl mb-6 animate-fade-in">
          <div className="space-y-6">
            {settings.map((setting, index) => (
              <div
                key={setting.id}
                className="flex items-center justify-between p-4 rounded-lg hover:bg-secondary/30 transition-colors duration-200"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-center gap-4 flex-1">
                  <setting.icon className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground">{setting.label}</h3>
                    <p className="text-sm text-muted-foreground">{setting.description}</p>
                  </div>
                </div>
                
                {setting.id !== "language" ? (
                  <Switch
                    checked={setting.enabled}
                    onCheckedChange={() => toggleSetting(setting.id)}
                    className="data-[state=checked]:bg-primary"
                  />
                ) : (
                  <Button variant="outline" size="sm" className="ml-4">
                    Change
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* App Information */}
        <div className="glass-card p-6 rounded-2xl animate-fade-in">
          <h3 className="font-semibold mb-4">App Information</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Version</span>
              <span>2.1.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Update</span>
              <span>Dec 22, 2024</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Database Version</span>
              <span>1.8.3</span>
            </div>
          </div>
          
          <div className="flex gap-3 mt-6">
            <Button variant="outline" className="flex-1">
              Check for Updates
            </Button>
            <Button variant="outline" className="flex-1">
              Privacy Policy
            </Button>
          </div>
        </div>

        {/* Reset Section */}
        <div className="glass-card p-6 rounded-2xl mt-6 animate-fade-in">
          <h3 className="font-semibold mb-4 text-destructive">Danger Zone</h3>
          <p className="text-sm text-muted-foreground mb-4">
            These actions cannot be undone. Please proceed with caution.
          </p>
          <div className="flex gap-3">
            <Button variant="destructive" className="flex-1">
              Reset All Settings
            </Button>
            <Button variant="outline" className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground">
              Clear All Data
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;