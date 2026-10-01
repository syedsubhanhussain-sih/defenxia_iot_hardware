import { useState, useEffect } from "react";
import { Shield, Bug, CheckCircle, AlertTriangle, File } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

const Antivirus = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [filesScanned, setFilesScanned] = useState(0);
  const [threatsFound, setThreatsFound] = useState(0);
  const [currentFile, setCurrentFile] = useState("");
  const [scanComplete, setScanComplete] = useState(false);

  const sampleFiles = [
    "C:\\Windows\\System32\\drivers\\etc\\hosts",
    "C:\\Program Files\\Browser\\chrome.exe",
    "C:\\Users\\Documents\\report.pdf",
    "C:\\Windows\\Temp\\installer.tmp",
    "C:\\Program Files\\Antivirus\\scanner.dll",
    "C:\\Users\\Downloads\\software.exe",
    "C:\\Windows\\System32\\kernel32.dll",
    "C:\\Program Files\\Office\\winword.exe",
    "C:\\Users\\Pictures\\vacation.jpg",
    "C:\\Windows\\System32\\ntdll.dll"
  ];

  const startScan = () => {
    setIsScanning(true);
    setProgress(0);
    setFilesScanned(0);
    setThreatsFound(0);
    setScanComplete(false);
    
    let fileIndex = 0;
    const totalFiles = 1247; // Simulated total
    
    const interval = setInterval(() => {
      if (fileIndex < sampleFiles.length) {
        setCurrentFile(sampleFiles[fileIndex]);
        const newProgress = ((fileIndex + 1) / sampleFiles.length) * 100;
        setProgress(newProgress);
        setFilesScanned(Math.floor((newProgress / 100) * totalFiles));
        
        // Randomly find threats
        if (Math.random() > 0.8) {
          setThreatsFound(prev => prev + 1);
        }
        
        fileIndex++;
      } else {
        clearInterval(interval);
        setIsScanning(false);
        setScanComplete(true);
        setProgress(100);
        setFilesScanned(totalFiles);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-3xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">Antivirus Scanner</h1>
          <p className="text-muted-foreground">
            Full system scan to detect and eliminate malware threats
          </p>
        </div>

        <div className="glass-card p-8 rounded-lg">
          {!isScanning && !scanComplete && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <Shield size={100} className="text-primary" />
              </div>
              <h2 className="text-2xl font-bold">System Protection Ready</h2>
              <p className="text-muted-foreground">
                Run a comprehensive system scan to detect malware and threats
              </p>
              <Button 
                onClick={startScan}
                className="glow-button text-white font-semibold px-8 py-4 text-lg"
              >
                Start Full System Scan
              </Button>
            </div>
          )}

          {isScanning && (
            <div className="space-y-6">
              <div className="text-center">
                <Bug size={64} className="text-primary mx-auto mb-4 animate-pulse" />
                <h2 className="text-2xl font-bold mb-2">Scanning System...</h2>
                <div className="text-4xl font-bold text-primary mb-4">{Math.round(progress)}%</div>
              </div>

              <Progress value={progress} className="w-full h-3" />

              <div className="grid md:grid-cols-2 gap-6">
                <div className="text-center p-4 glass-card rounded-lg">
                  <File className="mx-auto mb-2 text-blue-400" size={32} />
                  <div className="text-2xl font-bold">{filesScanned.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Files Scanned</div>
                </div>
                
                <div className="text-center p-4 glass-card rounded-lg">
                  <AlertTriangle className="mx-auto mb-2 text-red-400" size={32} />
                  <div className="text-2xl font-bold">{threatsFound}</div>
                  <div className="text-sm text-muted-foreground">Threats Found</div>
                </div>
              </div>

              <div className="p-4 glass-card rounded-lg">
                <h3 className="font-semibold mb-2">Currently Scanning:</h3>
                <p className="text-sm font-mono text-muted-foreground break-all">
                  {currentFile}
                </p>
              </div>
            </div>
          )}

          {scanComplete && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                {threatsFound === 0 ? (
                  <CheckCircle size={100} className="text-green-500" />
                ) : (
                  <AlertTriangle size={100} className="text-red-500" />
                )}
              </div>

              <div>
                <h2 className={`text-3xl font-bold mb-2 ${
                  threatsFound === 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  Scan Complete
                </h2>
                <div className={`text-xl mb-4 ${
                  threatsFound === 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {threatsFound === 0 
                    ? '0 Threats Found' 
                    : `${threatsFound} Threat${threatsFound > 1 ? 's' : ''} Found`
                  }
                </div>
                <p className="text-muted-foreground">
                  Scanned {filesScanned.toLocaleString()} files in total
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-4 text-center">
                <div className="p-4 glass-card rounded-lg">
                  <div className="text-lg font-bold">{filesScanned.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Files Scanned</div>
                </div>
                <div className="p-4 glass-card rounded-lg">
                  <div className="text-lg font-bold">0</div>
                  <div className="text-sm text-muted-foreground">Files Quarantined</div>
                </div>
                <div className="p-4 glass-card rounded-lg">
                  <div className="text-lg font-bold">{threatsFound}</div>
                  <div className="text-sm text-muted-foreground">Threats Detected</div>
                </div>
              </div>

              {threatsFound > 0 && (
                <div className="p-4 glass-card rounded-lg text-left">
                  <h3 className="font-semibold mb-2 text-red-400">Threats Detected:</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Trojan.Generic.KD.12345</span>
                      <span className="text-red-400">Quarantined</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Adware.Tracking.Cookie</span>
                      <span className="text-red-400">Removed</span>
                    </div>
                  </div>
                </div>
              )}

              <Button 
                onClick={() => {
                  setScanComplete(false);
                  setProgress(0);
                  setFilesScanned(0);
                  setThreatsFound(0);
                }}
                variant="outline"
                className="w-full"
              >
                Run New Scan
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Antivirus;