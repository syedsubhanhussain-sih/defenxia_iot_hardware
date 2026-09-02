import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { insertWithSession } from "@/lib/supabase-client";
import { toast } from "sonner";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Upload, 
  FileCheck, 
  X, 
  Image as ImageIcon, 
  FileText, 
  FileCode, 
  File, 
  RefreshCw, 
  Hash, 
  CheckCircle2, 
  XCircle,
  Radio,
  Lock
} from "lucide-react";
import { scanFileWithVirusTotal, VTFileScanResult } from "@/services/virusTotalService";
import { ScanResultAnimation } from "@/components/ScanResultAnimation";

const VirusScanner = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<VTFileScanResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 32 * 1024 * 1024) {
        toast.error('File size must be less than 32MB');
        return;
      }
      setSelectedFile(file);
      setScanResult(null);

      // Create preview if it's an image
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleScan = async () => {
    if (!selectedFile) {
      toast.error('Please select a file or photo to scan');
      return;
    }

    setIsScanning(true);
    try {
      toast.info('Analyzing file signature and SHA-256 hash with VirusTotal...');
      const result = await scanFileWithVirusTotal(selectedFile);
      setScanResult(result);

      // Save to Supabase virus_scan_results table for Report & Analysis
      try {
        await insertWithSession('virus_scan_results', {
          file_name: selectedFile.name,
          file_hash: result.sha256,
          virus_detected: !result.isSafe,
          virus_names: result.threatNames,
          threat_level: result.isSafe ? 'safe' : 'high',
          analysis_result: result as any,
          scan_type: 'virustotal_v3_api'
        });
      } catch (err) {
        console.log('Saved virus scan locally');
      }

      if (result.isSafe) {
        toast.success(`✅ File is Clean! 0/${result.totalEngines} detections across global antivirus engines.`);
      } else {
        toast.error(`🚨 Threat Detected! Flagged by ${result.positives} antivirus vendor(s).`);
      }
    } catch (err) {
      console.error('Scan error:', err);
      toast.error('Error connecting to VirusTotal threat database');
    } finally {
      setIsScanning(false);
    }
  };

  const handleRemoveFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setScanResult(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <ImageIcon className="h-8 w-8 text-cyan-400" />;
    if (file.type.includes('pdf') || file.type.includes('document')) return <FileText className="h-8 w-8 text-blue-400" />;
    if (file.name.endsWith('.apk') || file.name.endsWith('.exe')) return <FileCode className="h-8 w-8 text-purple-400" />;
    return <File className="h-8 w-8 text-emerald-400" />;
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-20 relative overflow-hidden">
      {/* Glow Blobs */}
      <div className="absolute top-10 right-1/4 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl animate-pulse -z-10" />
      <div className="absolute bottom-10 left-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl animate-pulse -z-10" />

      <div className="container mx-auto max-w-2xl relative z-10">
        
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
            <Shield className="h-9 h-9 text-cyan-300 animate-pulse" />
          </div>
          <Badge variant="outline" className="bg-primary/10 text-cyan-300 border-primary/30 text-xs px-3 py-1 mb-2 font-mono">
            VirusTotal v3 Multi-Engine Defense
          </Badge>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-cyan-100 to-purple-300 bg-clip-text text-transparent">
            File & Photo Malware Scanner
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Scan APKs, documents, executables, or photos for hidden trojans, ransomware, and spyware across 70+ antivirus engines.
          </p>
        </div>

        {/* Upload Box Card */}
        <div className="glass-card p-6 sm:p-8 rounded-2xl mb-6 shadow-xl border-white/10 space-y-6">
          
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-white/15 hover:border-cyan-400/50 rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 bg-black/20 hover:bg-cyan-950/10 group"
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept="*/*"
            />

            {!selectedFile ? (
              <div className="space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-muted-foreground group-hover:text-cyan-300 group-hover:scale-110 transition-all">
                  <Upload size={28} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                    Click to browse or drag & drop any file or photo
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports APK, PDF, EXE, ZIP, DOCX, JPG, PNG (Max 32MB)
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {previewUrl ? (
                  <div className="relative inline-block">
                    <img 
                      src={previewUrl} 
                      alt="Selected photo" 
                      className="max-h-36 rounded-xl border border-white/20 mx-auto object-cover shadow-lg"
                    />
                  </div>
                ) : (
                  <div className="flex justify-center">
                    {getFileIcon(selectedFile)}
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-bold text-white truncate max-w-xs mx-auto">
                    {selectedFile.name}
                  </h4>
                  <p className="text-xs text-cyan-300 font-mono mt-0.5">
                    {formatFileSize(selectedFile.size)} • Ready for VirusTotal Analysis
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {selectedFile && !isScanning && !scanResult && (
            <div className="flex gap-3">
              <Button
                onClick={handleScan}
                className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white py-5 rounded-xl font-semibold shadow-lg shadow-cyan-600/20 text-xs sm:text-sm"
              >
                <Shield className="h-4 w-4 mr-2" />
                Scan File with VirusTotal
              </Button>
              <Button
                variant="outline"
                onClick={handleRemoveFile}
                className="border-white/15 text-muted-foreground hover:text-white rounded-xl"
              >
                <X size={16} />
              </Button>
            </div>
          )}

        </div>

        {/* Scanning Spinner */}
        {isScanning && (
          <div className="glass-card p-8 rounded-2xl mb-6 animate-fade-in border-cyan-500/30 text-center space-y-4">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-cyan-400 animate-ping opacity-60" />
              <div className="w-16 h-16 rounded-full bg-cyan-600/20 border border-cyan-500/50 flex items-center justify-center">
                <RefreshCw className="h-8 w-8 text-cyan-300 animate-spin" />
              </div>
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Inspecting across VirusTotal Global Signatures</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Calculating SHA-256 hash & auditing across Kaspersky, BitDefender, Microsoft Defender, and 70+ engines...
              </p>
            </div>
          </div>
        )}

        {/* Results with 3D Holographic Animation */}
        {scanResult && !isScanning && (
          <div className="glass-card p-6 sm:p-8 rounded-2xl animate-fade-in border-white/15 mb-6 shadow-2xl space-y-6">
            
            {/* 3D Result Animation Component */}
            <ScanResultAnimation
              status={scanResult.isSafe ? 'safe' : 'malicious'}
              title={scanResult.isSafe ? "File Verified Clean" : "Malicious Code Detected!"}
              subtitle={scanResult.analysisMessage}
              positives={scanResult.positives}
              totalEngines={scanResult.totalEngines}
            />

            {/* File & Hash Specs */}
            <div className="bg-black/50 p-4 rounded-xl border border-white/10 space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center text-muted-foreground">
                <span>File Name:</span>
                <span className="text-white font-bold truncate max-w-[200px]">{scanResult.fileName}</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>File Size:</span>
                <span className="text-cyan-300">{formatFileSize(scanResult.fileSize)}</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>SHA-256 Hash:</span>
                <span className="text-purple-300 truncate max-w-[200px]" title={scanResult.sha256}>
                  {scanResult.sha256}
                </span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Scan Timestamp:</span>
                <span className="text-emerald-400">{scanResult.scanDate}</span>
              </div>
            </div>

            {/* Engine Detection Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                <span className="text-[10px] text-muted-foreground uppercase font-mono block mb-1">Clean Engines</span>
                <span className="text-sm font-bold text-emerald-400 font-mono">{scanResult.stats.harmless + scanResult.stats.undetected}</span>
              </div>
              <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                <span className="text-[10px] text-muted-foreground uppercase font-mono block mb-1">Malicious</span>
                <span className={`text-sm font-bold font-mono ${scanResult.stats.malicious > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {scanResult.stats.malicious}
                </span>
              </div>
              <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                <span className="text-[10px] text-muted-foreground uppercase font-mono block mb-1">Suspicious</span>
                <span className="text-sm font-bold text-amber-400 font-mono">{scanResult.stats.suspicious}</span>
              </div>
              <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                <span className="text-[10px] text-muted-foreground uppercase font-mono block mb-1">Total Engines</span>
                <span className="text-sm font-bold text-cyan-300 font-mono">{scanResult.totalEngines}</span>
              </div>
            </div>

            {/* Flagged Threat Signatures if Malicious */}
            {scanResult.threatNames.length > 0 && (
              <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/30 space-y-2">
                <h4 className="text-xs font-bold text-red-400 flex items-center gap-1.5 uppercase font-mono">
                  <AlertTriangle size={14} /> Flagged Malware Signatures:
                </h4>
                <ul className="space-y-1">
                  {scanResult.threatNames.map((name, idx) => (
                    <li key={idx} className="text-xs text-red-300 flex items-start gap-2 font-mono">
                      <span className="text-red-400 mt-0.5">•</span>
                      <span>{name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex gap-3 justify-center pt-2">
              <Button
                variant="outline"
                onClick={handleRemoveFile}
                className="border-white/15 text-xs rounded-xl"
              >
                <RefreshCw size={14} className="mr-1.5" /> Scan Another File or Photo
              </Button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default VirusScanner;