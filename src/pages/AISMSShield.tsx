import { useState } from "react";
import { Send, Bot, User, MessageSquareWarning, ShieldAlert, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { invokeEdgeFunction } from "@/lib/supabase-client";
import { insertWithSession } from "@/lib/supabase-client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface SMSScanResult {
  text: string;
  isFraud: boolean;
  keywords: string[];
  severity: 'safe' | 'warning' | 'critical';
  analysis: string;
}

const FRAUD_KEYWORDS = [
  'kyc', 'otp', 'verify your account', 'link expired', 'update kyc',
  'your account will be blocked', 'share otp', 'click here immediately',
  'pan card', 'aadhar', 'bank account suspended', 'urgent action',
  'lottery', 'prize', 'won', 'claim now', 'act now', 'limited time',
  'pin number', 'cvv', 'card number', 'transfer money', 'upi pin',
  'send money', 'loan approved', 'credit card blocked', 'atm blocked',
  'debit card', 'account deactivated', 'reactivate', 'expire today'
];

export function analyzeIncomingSMS(smsText: string): SMSScanResult {
  const lowerText = smsText.toLowerCase();
  const foundKeywords = FRAUD_KEYWORDS.filter(kw => lowerText.includes(kw));
  const isFraud = foundKeywords.length > 0;

  let severity: 'safe' | 'warning' | 'critical' = 'safe';
  if (foundKeywords.length >= 3) severity = 'critical';
  else if (foundKeywords.length >= 1) severity = 'warning';

  let analysis = '';
  if (severity === 'critical') {
    analysis = '🚨 CRITICAL SCAM DETECTED! This message contains multiple fraud indicators targeting your banking credentials. DO NOT respond or click any links.';
  } else if (severity === 'warning') {
    analysis = '⚠️ Suspicious message detected. This may be a phishing attempt. Verify with your bank directly before taking any action.';
  } else {
    analysis = '✅ Message appears safe. No known fraud patterns detected.';
  }

  return { text: smsText, isFraud, keywords: foundKeywords, severity, analysis };
}

function getIntelligentSecurityAdvice(query: string): string {
  const q = query.toLowerCase();
  if (q.includes('sms') || q.includes('message') || q.includes('text')) {
    return "Never click links in SMS claiming your bank account or electricity is blocked. Official banks will never send short URLs (like bit.ly) or ask for personal details via SMS. You can report spam SMS to 1909 or call 1930 for financial cyber fraud.";
  }
  if (q.includes('upi') || q.includes('qr') || q.includes('pin')) {
    return "Remember: Your UPI PIN is only entered to SEND money, never to RECEIVE money. Do not scan QR codes or approve collect requests from unknown buyers/sellers.";
  }
  if (q.includes('kyc') || q.includes('pan') || q.includes('bank')) {
    return "Banks never ask for OTPs, passwords, or CVV to update your KYC over phone calls or SMS. If in doubt, visit your official branch or use your authentic mobile banking app.";
  }
  return "For any cyber fraud or suspicious banking activity, immediately call the National Cyber Crime Helpline at 1930 (Toll-Free 24/7) or lodge a report on cybercrime.gov.in.";
}

const AISMSShield = () => {
  // AI Chatbot state
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hello! I\'m your AI security analyst for rural banking. I can help you with cybersecurity questions, SMS fraud detection, and banking security best practices. How can I assist you today?',
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // SMS Scanner state
  const [smsText, setSmsText] = useState("");
  const [scanResults, setScanResults] = useState<SMSScanResult[]>([]);
  const [showAlert, setShowAlert] = useState(false);
  const [currentAlert, setCurrentAlert] = useState<SMSScanResult | null>(null);

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    const currentText = inputMessage;
    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const { data, error } = await invokeEdgeFunction('ai-analysis', {
        message: currentText
      });

      let aiResponse = data?.response;
      if (!aiResponse || error) {
        aiResponse = getIntelligentSecurityAdvice(currentText);
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponse,
        sender: 'ai',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: getIntelligentSecurityAdvice(currentText),
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
    }

    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSMSScan = async () => {
    if (!smsText.trim()) return;

    const result = analyzeIncomingSMS(smsText);
    setScanResults(prev => [result, ...prev]);

    if (result.isFraud) {
      setCurrentAlert(result);
      setShowAlert(true);

      // Push to Supabase
      try {
        await insertWithSession('security_threats' as any, {
          type: 'sms_fraud',
          content: smsText,
          severity: result.severity,
        } as any);
      } catch (err) {
        console.error('Failed to log threat:', err);
      }

      toast.error('⚠️ Scam SMS Detected!', {
        description: `Found ${result.keywords.length} fraud keyword(s)`
      });
    } else {
      toast.success('✅ SMS appears safe');
    }

    setSmsText("");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl flex flex-col">
        <div className="p-4 border-b border-border">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageSquareWarning className="h-8 w-8 text-primary" />
            AI SMS Shield
          </h1>
          <p className="text-muted-foreground">AI-powered SMS fraud detection & security chatbot for rural banking</p>
        </div>

        <Tabs defaultValue="sms-scan" className="flex-1 flex flex-col">
          <TabsList className="mx-4 mt-4 grid w-auto grid-cols-2">
            <TabsTrigger value="sms-scan">SMS Scan</TabsTrigger>
            <TabsTrigger value="ai-chat">AI Chatbot</TabsTrigger>
          </TabsList>

          {/* SMS Scan Tab */}
          <TabsContent value="sms-scan" className="flex-1 p-4 space-y-4">
            <div className="glass-card rounded-xl p-4 space-y-3">
              <h3 className="font-semibold text-lg">Paste SMS to Scan</h3>
              <textarea
                value={smsText}
                onChange={(e) => setSmsText(e.target.value)}
                placeholder="Paste a suspicious SMS message here...&#10;&#10;Example: 'Dear Customer, your KYC has expired. Click here to update immediately or your account will be blocked within 24 hours.'"
                className="w-full h-32 bg-input border border-border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <Button onClick={handleSMSScan} disabled={!smsText.trim()} className="w-full glow-button text-white">
                <ShieldAlert className="mr-2 h-4 w-4" />
                Scan for Fraud
              </Button>
              <p className="text-xs text-muted-foreground">
                📱 Capacitor: In production, SMS will be auto-read via READ_SMS permission
              </p>
            </div>

            {/* Scan Results */}
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-3">
                {scanResults.map((result, index) => (
                  <div
                    key={index}
                    className={`glass-card rounded-xl p-4 border-l-4 ${
                      result.severity === 'critical' ? 'border-l-destructive' :
                      result.severity === 'warning' ? 'border-l-warning' :
                      'border-l-success'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${
                        result.severity === 'critical' ? 'bg-destructive/20 text-destructive' :
                        result.severity === 'warning' ? 'bg-warning/20 text-warning' :
                        'bg-success/20 text-success'
                      }`}>
                        {result.severity}
                      </span>
                      {result.isFraud ? (
                        <ShieldAlert className="h-5 w-5 text-destructive" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-success" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">"{result.text}"</p>
                    <p className="text-sm">{result.analysis}</p>
                    {result.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {result.keywords.map((kw, i) => (
                          <span key={i} className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded">
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* AI Chatbot Tab */}
          <TabsContent value="ai-chat" className="flex-1 flex flex-col">
            <ScrollArea className="flex-1 p-4 max-h-[500px]">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-3 max-w-[80%] ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className="flex-shrink-0">
                        {message.sender === 'ai' ? (
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                            <Bot size={16} className="text-primary" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                            <User size={16} className="text-secondary-foreground" />
                          </div>
                        )}
                      </div>
                      <div
                        className={`rounded-lg p-3 ${
                          message.sender === 'ai'
                            ? 'bg-secondary text-secondary-foreground'
                            : 'bg-primary text-primary-foreground'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <Bot size={16} className="text-primary" />
                    </div>
                    <div className="bg-secondary text-secondary-foreground rounded-lg p-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about banking security, SMS fraud..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  className="px-6"
                >
                  <Send size={16} />
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Scam Alert Modal */}
        <Dialog open={showAlert} onOpenChange={setShowAlert}>
          <DialogContent className="border-destructive bg-destructive/10 backdrop-blur-xl">
            <DialogHeader>
              <DialogTitle className="text-destructive flex items-center gap-2 text-xl">
                <ShieldAlert className="h-6 w-6" />
                🚨 SCAM SMS DETECTED!
              </DialogTitle>
              <DialogDescription className="space-y-3 pt-2">
                {currentAlert && (
                  <>
                    <p className="text-foreground font-medium">{currentAlert.analysis}</p>
                    <div className="bg-background/50 rounded-lg p-3">
                      <p className="text-sm text-muted-foreground italic">"{currentAlert.text}"</p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {currentAlert.keywords.map((kw, i) => (
                        <span key={i} className="text-xs bg-destructive/30 text-destructive px-2 py-1 rounded font-mono">
                          {kw}
                        </span>
                      ))}
                    </div>
                    <p className="text-sm text-warning font-semibold">
                      ⚠️ Never share OTP, PIN, or KYC details over SMS or phone calls.
                    </p>
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <Button onClick={() => setShowAlert(false)} variant="destructive" className="w-full">
              I Understand - Dismiss
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AISMSShield;
