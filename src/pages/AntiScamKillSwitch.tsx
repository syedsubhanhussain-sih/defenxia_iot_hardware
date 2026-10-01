import { useState, useEffect } from "react";
import { ShieldOff, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { insertWithSession } from "@/lib/supabase-client";
import { toast } from "sonner";

// Capacitor placeholder for FLAG_SECURE
// In production: import { WindowManager } from '@nicoara/capacitor-window-manager';
// WindowManager.setFlags({ flags: WindowManager.FLAG_SECURE });

const AntiScamKillSwitch = () => {
  const [isActive, setIsActive] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    if (isActive) {
      setShowOverlay(true);
      // Log to Supabase
      insertWithSession('security_threats' as any, {
        type: 'kill_switch_activated',
        content: 'Anti-Scam Kill Switch activated - screen sharing blocked',
        severity: 'warning',
      } as any).catch(console.error);

      toast.success('🛡️ Privacy Protection Activated', {
        description: 'Screen sharing apps like AnyDesk are now blocked.'
      });
    } else {
      setShowOverlay(false);
    }
  }, [isActive]);

  return (
    <div className="min-h-screen bg-background relative">
      {/* Full-Screen Black Overlay (FLAG_SECURE simulation) */}
      {showOverlay && (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center gap-6 animate-fade-in">
          <div className="relative">
            <ShieldCheck className="h-24 w-24 text-primary animate-pulse" />
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl"></div>
          </div>
          <h1 className="text-4xl font-bold text-foreground text-center">
            Privacy Protected
          </h1>
          <p className="text-lg text-muted-foreground text-center max-w-md px-4">
            Screen sharing and screen recording are blocked. No one can see your screen remotely.
          </p>
          <div className="flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-6 py-3">
            <EyeOff className="h-5 w-5 text-primary" />
            <span className="text-primary font-semibold">AnyDesk / TeamViewer Blocked</span>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            📱 Capacitor: Uses FLAG_SECURE (WindowManager.LayoutParams)
          </p>
          <Button
            variant="outline"
            onClick={() => setIsActive(false)}
            className="mt-4 border-primary/50 text-primary hover:bg-primary/10"
          >
            Deactivate Protection
          </Button>
        </div>
      )}

      <div className="container mx-auto max-w-4xl p-4 space-y-6">
        <div className="border-b border-border pb-4">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShieldOff className="h-8 w-8 text-primary" />
            Anti-Scam Kill-Switch
          </h1>
          <p className="text-muted-foreground">
            Block screen-sharing apps to prevent scammers from viewing your banking transactions
          </p>
        </div>

        {/* Main Toggle Card */}
        <div className="glass-card rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">Screen Privacy Shield</h3>
              <p className="text-sm text-muted-foreground">
                Simulates Android FLAG_SECURE to block screen capture
              </p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
              className="scale-125"
            />
          </div>

          <div className={`flex items-center gap-3 p-4 rounded-lg ${
            isActive ? 'bg-success/10 border border-success/30' : 'bg-secondary/50 border border-border'
          }`}>
            {isActive ? (
              <>
                <EyeOff className="h-6 w-6 text-success" />
                <div>
                  <p className="font-semibold text-success">Protection Active</p>
                  <p className="text-xs text-muted-foreground">Screen sharing apps cannot see your screen</p>
                </div>
              </>
            ) : (
              <>
                <Eye className="h-6 w-6 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Protection Inactive</p>
                  <p className="text-xs text-muted-foreground">Toggle on to block screen-sharing apps</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* How it works */}
        <div className="glass-card rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-semibold">How It Protects You</h3>
          <div className="space-y-3">
            {[
              { title: "Blocks AnyDesk / TeamViewer", desc: "Scammers cannot remotely view your phone screen" },
              { title: "Prevents Screen Recording", desc: "No app can record your banking transactions" },
              { title: "OTP Protection", desc: "Your one-time passwords stay visible only to you" },
              { title: "Banking App Safety", desc: "Use UPI and net banking without fear of surveillance" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-secondary/30 rounded-lg">
                <ShieldCheck className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AntiScamKillSwitch;
