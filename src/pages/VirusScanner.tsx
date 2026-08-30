import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { invokeEdgeFunction } from "@/lib/supabase-client";
import { toast } from "sonner";
import { Shield, AlertTriangle, CheckCircle, Upload, FileCheck, X } from "lucide-react";
import CryptoJS from "crypto-js";

interface ScanResult {
  service: string;
  resource: string;
  positives: number;
  total: number;
  status: string;
  scanDate: string;
  permalink?: string;
  verbose_msg?: string;
  scans?: any;
}

const VirusScanner = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const calculateFileHash = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wordArray = CryptoJS.lib.WordArray.create(e.target?.result as ArrayBuffer);
          const hash = CryptoJS.SHA256(wordArray).toString();
          resolve(hash);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 32MB for VirusTotal API)
      if (file.size > 32 * 1024 * 1024) {
        toast.error('File size must be less than 32MB');
        return;
      }
      setSelectedFile(file);
      setScanResult(null);
    }
  };

  const handleScan = async () => {
    if (!selectedFile) {
      toast.error('Please select a file to scan');
      return;
    }

    setIsScanning(true);
    try {
      // Convert file to base64
      toast.info('Preparing file for upload...');
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(selectedFile);
      });
      
      // Upload and scan using VirusTotal API
      toast.info('Uploading file to VirusTotal...');
      const { data, error } = await invokeEdgeFunction('virus-scan', {
        fileContent: fileBase64,
        fileName: selectedFile.name
      });

      if (error) {
        console.error('VirusTotal scan error:', error);
        toast.error('Failed to scan file with VirusTotal');
      } else {
        setScanResult(data);
        if (data.status === 'clean') {
          toast.success('File is clean! No threats detected.');
        } else if (data.status === 'malicious') {
          toast.error(`Threat detected! ${data.positives} out of ${data.total} engines flagged this file.`);
        } else {
          toast.info('Scan completed');
        }
      }
    } catch (err) {
      console.error('Scan error:', err);
      toast.error('Error performing scan');
    } finally {
      setIsScanning(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setScanResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'clean': return 'text-green-500';
      case 'malicious': return 'text-red-500';
      default: return 'text-yellow-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'clean': return CheckCircle;
      case 'malicious': return AlertTriangle;
      default: return Shield;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Scan Files</h1>
          </div>
          <p className="text-muted-foreground">
            Upload files to scan for viruses and malware using VirusTotal's comprehensive antivirus engines
          </p>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              File Scanner
            </CardTitle>
            <CardDescription>
              Upload a file to check for malware (Max size: 32MB)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">
                  {selectedFile ? 'File Selected' : 'Choose a file to scan'}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Click to browse or drag and drop
                </p>
              </label>
              
              {selectedFile && (
                <div className="mt-4 p-4 bg-secondary/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileCheck className="h-8 w-8 text-primary" />
                      <div className="text-left">
                        <p className="font-medium">{selectedFile.name}</p>
                        <p className="text-sm text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleRemoveFile}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <Button 
              onClick={handleScan} 
              disabled={isScanning || !selectedFile}
              className="w-full"
              size="lg"
            >
              {isScanning ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Scanning...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Scan File
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {scanResult && (
          <Card className="mt-6 glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {(() => {
                  const Icon = getStatusIcon(scanResult.status);
                  return <Icon className={`h-5 w-5 ${getStatusColor(scanResult.status)}`} />;
                })()}
                Scan Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                  <span className="text-sm font-medium">Status</span>
                  <Badge variant={scanResult.status === 'clean' ? 'default' : 'destructive'}>
                    {scanResult.status.toUpperCase()}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                  <span className="text-sm font-medium">Detection Ratio</span>
                  <span className={`font-bold ${getStatusColor(scanResult.status)}`}>
                    {scanResult.positives} / {scanResult.total}
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                  <span className="text-sm font-medium">File Hash</span>
                  <span className="text-xs font-mono truncate max-w-[200px]">{scanResult.resource}</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                  <span className="text-sm font-medium">Scan Date</span>
                  <span className="text-sm">{new Date(scanResult.scanDate).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex gap-2">
                {scanResult.permalink && (
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => window.open(scanResult.permalink, '_blank')}
                  >
                    View Detailed Report
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={handleRemoveFile}
                >
                  Scan Another File
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mt-6 glass-card">
          <CardHeader>
            <CardTitle>About VirusTotal File Scanning</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• VirusTotal analyzes files with 60+ antivirus engines</p>
            <p>• File scanning verifies known malware signatures</p>
            <p>• Results show detection ratio across multiple security vendors</p>
            <p>• Maximum file size: 32MB per scan</p>
            <p>• Files are analyzed using SHA-256 hash for privacy</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VirusScanner;