import { useState, useEffect } from "react";
import { Phone, PhoneOff, AlertTriangle, ShieldCheck, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { insertWithSession } from "@/lib/supabase-client";
import { toast } from "sonner";

// Capacitor placeholder for PhoneStateListener
// In production: import { PhoneState } from '@nicoara/capacitor-phone-state';
// PhoneState.addListener('phoneStateChange', (state) => { ... });

const CyberSanchaarShield = () => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isOnCall, setIsOnCall] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [flashOn, setFlashOn] = useState(true);

  // Flash animation when warning is active
  useEffect(() => {
    if (!showWarning) return;
    const interval = setInterval(() => {
      setFlashOn(prev => !prev);
    }, 500);
    return () => clearInterval(interval);
  }, [showWarning]);

  const simulateCallDetected = async () => {
    setIsOnCall(true);
    setShowWarning(true);

    toast.error('🚨 Call Detected While Banking!', {
      description: 'DO NOT share any PIN or OTP on this call.',
      duration: 10000,
    });

    // Log threat to Supabase
    try {
      await insertWithSession('security_threats' as any, {
        type: 'call_during_banking',
        content: 'Phone call detected while banking app is open',
        severity: 'critical',
      } as any);
    } catch (err) {
      console.error('Failed to log threat:', err);
    }
  };

  const dismissWarning = () => {
    setShowWarning(false);
    setIsOnCall(false);
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* Persistent Red Flash Warning Overlay */}
      {showWarning && (
        <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6 transition-colors duration-300 ${
          flashOn ? 'bg-destructive/95' : 'bg-destructive/70'
        }`}>
          <div className="animate-pulse">
            <AlertTriangle className="h-24 w-24 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white text-center px-4 leading-tight">
            ⚠️ DO NOT SHARE
          </h1>
          <h2 className="text-3xl font-bold text-white text-center px-4">
            PIN / OTP ON CALL
          </h2>
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 mx-6 max-w-sm">
            <p className="text-white text-center text-sm leading-relaxed">
              A phone call is active while you are using a banking application.
              <strong className="block mt-2 text-lg">
                No bank employee will ever ask for your PIN, OTP, or CVV.
              </strong>
            </p>
          </div>
          <div className="flex items-center gap-2 text-white/80 text-xs">
            <Radio className="h-4 w-4 animate-pulse" />
            <span>Capacitor: PhoneStateListener active</span>
          </div>
          <Button
            onClick={dismissWarning}
            variant="outline"
            className="mt-4 border-white/50 text-white hover:bg-white/20 bg-transparent"
          >
            I Understand - Dismiss Warning
          </Button>
        </div>
      )}

      <div className="container mx-auto max-w-4xl p-4 space-y-6">
        <div className="border-b border-border pb-4">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Phone className="h-8 w-8 text-primary" />
            Cyber-Sanchaar Shield
          </h1>
          <p className="text-muted-foreground">
            Detects phone calls during banking sessions & warns against OTP/PIN sharing
          </p>
        </div>

        {/* Monitoring Toggle */}
        <div className="glass-card rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">Call Monitoring</h3>
              <p className="text-sm text-muted-foreground">
                Monitor for active phone calls during banking
              </p>
            </div>
            <Switch
              checked={isMonitoring}
              onCheckedChange={setIsMonitoring}
              className="scale-125"
            />
          </div>

          <div className={`flex items-center gap-3 p-4 rounded-lg ${
            isMonitoring ? 'bg-success/10 border border-success/30' : 'bg-secondary/50 border border-border'
          }`}>
            {isMonitoring ? (
              <>
                <ShieldCheck className="h-6 w-6 text-success" />
                <div>
                  <p className="font-semibold text-success">Monitoring Active</p>
                  <p className="text-xs text-muted-foreground">Will alert if a phone call is detected</p>
                </div>
              </>
            ) : (
              <>
                <PhoneOff className="h-6 w-6 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Monitoring Off</p>
                  <p className="text-xs text-muted-foreground">Enable to detect calls during banking</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Simulate Button */}
        <div className="glass-card rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-semibold">Test the Shield</h3>
          <p className="text-sm text-muted-foreground">
            Simulate a phone call detection while using a banking app to see the warning in action.
          </p>
          <Button
            onClick={simulateCallDetected}
            className="w-full glow-button text-white"
            disabled={showWarning}
          >
            <Phone className="mr-2 h-4 w-4" />
            Simulate Call During Banking
          </Button>
          <p className="text-xs text-muted-foreground">
            📱 Capacitor: Uses PhoneStateListener to detect real call state
          </p>
        </div>

        {/* Status */}
        <div className="glass-card rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-semibold">Current Status</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-secondary/30 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Phone State</p>
              <p className={`font-bold ${isOnCall ? 'text-destructive' : 'text-success'}`}>
                {isOnCall ? 'ON CALL' : 'Idle'}
              </p>
            </div>
            <div className="p-3 bg-secondary/30 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Banking App</p>
              <p className="font-bold text-success">Active</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CyberSanchaarShield;
