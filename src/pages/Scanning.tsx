import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, Shield, File, Network, Database, Settings } from "lucide-react";

const scanItems = [
  { label: "Initializing security scan...", icon: Shield },
  { label: "Checking system files...", icon: File },
  { label: "Analyzing network connections...", icon: Network },
  { label: "Scanning for malware...", icon: AlertCircle },
  { label: "Checking data integrity...", icon: Database },
  { label: "Verifying system settings...", icon: Settings },
  { label: "Finalizing security report...", icon: CheckCircle },
];

const Scanning = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [currentScanIndex, setCurrentScanIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + 2;
        
        // Update current scan item based on progress
        const itemIndex = Math.floor((newProgress / 100) * scanItems.length);
        setCurrentScanIndex(Math.min(itemIndex, scanItems.length - 1));
        
        if (newProgress >= 100) {
          setIsComplete(true);
          clearInterval(interval);
          return 100;
        }
        return newProgress;
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl mx-auto">
        <div className="glass-card p-8 rounded-2xl text-center animate-fade-in">
          {/* Header */}
          <div className="mb-8">
            <Shield className="h-16 w-16 text-primary mx-auto mb-4 animate-pulse" />
            <h1 className="text-3xl font-bold mb-2">Security Scan in Progress</h1>
            <p className="text-muted-foreground">
              Please wait while we analyze your device security
            </p>
          </div>

          {/* Progress Section */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm font-medium">{progress}%</span>
            </div>
            <Progress 
              value={progress} 
              className="h-3 mb-4"
            />
          </div>

          {/* Current Scan Item */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-3 mb-6">
              {React.createElement(scanItems[currentScanIndex]?.icon || Shield, {
                className: "h-6 w-6 text-primary animate-pulse"
              })}
              <span className="text-lg font-medium animate-slide-in">
                {scanItems[currentScanIndex]?.label || "Scanning..."}
              </span>
            </div>

            {/* Scan Items List */}
            <div className="space-y-3 text-left max-w-md mx-auto">
              {scanItems.map((item, index) => {
                const isCompleted = index < currentScanIndex;
                const isCurrent = index === currentScanIndex;
                
                return (
                  <div
                    key={item.label}
                    className={`flex items-center gap-3 p-2 rounded transition-all duration-300 ${
                      isCompleted 
                        ? "text-success" 
                        : isCurrent 
                        ? "text-primary bg-primary/10" 
                        : "text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      React.createElement(item.icon, { className: "h-4 w-4" })
                    )}
                    <span className="text-sm">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Completion State */}
          {isComplete && (
            <div className="animate-fade-in">
              <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-4 text-success">
                Scan Complete!
              </h3>
              <p className="text-muted-foreground mb-6">
                Your device security has been analyzed successfully.
              </p>
              <Button
                onClick={() => navigate("/")}
                className="glow-button text-white px-6 py-2"
              >
                View Results
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Scanning;