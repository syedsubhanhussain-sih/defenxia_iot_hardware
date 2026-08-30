import { useState } from "react";
import { Key, Shield, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const OTPSecurity = () => {
  const [generatedOTP, setGeneratedOTP] = useState("");
  const [enteredOTP, setEnteredOTP] = useState("");
  const [verificationResult, setVerificationResult] = useState<string | null>(null);

  const generateOTP = () => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOTP(otp);
    setVerificationResult(null);
  };

  const verifyOTP = () => {
    if (enteredOTP === generatedOTP) {
      setVerificationResult("success");
    } else {
      setVerificationResult("error");
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">OTP Security</h1>
          <p className="text-muted-foreground">
            Generate and verify one-time passwords for enhanced security
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Generate OTP Section */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="text-primary" size={24} />
                Generate New OTP
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <Button 
                  onClick={generateOTP} 
                  className="glow-button text-white font-semibold px-8 py-4"
                >
                  <RefreshCw className="mr-2" size={20} />
                  Generate New OTP
                </Button>
              </div>
              
              {generatedOTP && (
                <div className="text-center p-6 glass-card rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Your OTP Code:</p>
                  <div className="text-4xl font-mono font-bold text-primary tracking-wider">
                    {generatedOTP}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    This code expires in 5 minutes
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Verify OTP Section */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="text-primary" size={24} />
                Verify OTP
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={enteredOTP}
                  onChange={(e) => setEnteredOTP(e.target.value)}
                  maxLength={6}
                  className="text-center text-lg font-mono"
                />
                <Button 
                  onClick={verifyOTP} 
                  className="w-full"
                  disabled={enteredOTP.length !== 6}
                >
                  Verify OTP
                </Button>
              </div>

              {verificationResult && (
                <div className={`p-4 rounded-lg text-center ${
                  verificationResult === "success" 
                    ? "bg-green-500/20 text-green-400 border border-green-500/30" 
                    : "bg-red-500/20 text-red-400 border border-red-500/30"
                }`}>
                  {verificationResult === "success" 
                    ? "✓ OTP Verified Successfully!" 
                    : "✗ Invalid OTP. Please try again."
                  }
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OTPSecurity;