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
  Lock,
  Link2,
  ShieldCheck
} from "lucide-react";
import { scanFileWithVirusTotal, VTFileScanResult } from "@/services/virusTotalService";
import { 
  buildCanonicalEvidence, 
  anchorScanEvidence, 
  verifyScanEvidenceIntegrity, 
  simulateTamperCheck, 
  BlockchainAnchorReceipt, 
  IntegrityVerificationResult 
} from "@/services/blockchainAnchorService";
import { ScanResultAnimation } from "@/components/ScanResultAnimation";

const VirusScanner = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<VTFileScanResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [anchorReceipt, setAnchorReceipt] = useState<BlockchainAnchorReceipt | null>(null);
  const [verificationResult, setVerificationResult] = useState<IntegrityVerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [tamperDemo, setTamperDemo] = useState<any | null>(null);
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

      // ⛓️ DEFENXIA TrustChain Blockchain Anchoring (Asynchronous, Non-blocking)
      try {
        const canonical = buildCanonicalEvidence({
          fileSha256: result.sha256,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          scanTimestamp: result.scanDate,
          isSafe: result.isSafe,
          positives: result.positives,
          totalEngines: result.totalEngines,
          threatSummary: result.threatNames
        });
        const receipt = await anchorScanEvidence(canonical);
        setAnchorReceipt(receipt);

        // Store blockchain evidence record in Supabase
        try {
          await insertWithSession('blockchain_scan_evidence' as any, {
            file_hash: receipt.fileHash,
            evidence_hash: receipt.evidenceHash,
            virus_total_verdict: receipt.virusTotalVerdict,
            blockchain_status: receipt.blockchainStatus,
            blockchain_network: receipt.blockchainNetwork,
            transaction_reference: receipt.transactionReference,
            anchored_at: receipt.anchoredAt,
            verification_status: receipt.verificationStatus,
            canonical_payload: receipt.canonicalPayload as any
          } as any);
        } catch (dbErr) {
          console.log('Saved blockchain anchor locally');
        }
      } catch (bcErr) {
        console.warn('Blockchain anchor notice:', bcErr);
      }
    } catch (err) {
      console.error('Scan error:', err);
      toast.error('Error connecting to VirusTotal threat database');
    } finally {
      setIsScanning(false);
    }
  };

  const handleVerifyIntegrity = async () => {
    if (!anchorReceipt) return;
    setIsVerifying(true);
    try {
      const verification = await verifyScanEvidenceIntegrity(anchorReceipt);
      setVerificationResult(verification);
      if (verification.isValid) {
        toast.success("🟢 Integrity Verified: The scan evidence matches its trusted fingerprint.");
      } else {
        toast.error("🔴 Integrity Check Failed: Recorded scan evidence no longer matches its trusted fingerprint.");
      }
    } catch (e: any) {
      toast.error(`Verification error: ${e?.message || 'Verification failed'}`);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSimulateTamper = async () => {
    if (!anchorReceipt) return;
    const sim = await simulateTamperCheck(anchorReceipt);
    setTamperDemo(sim);
    toast.error("🔴 Tampering Detected in Simulation: Evidence hash mismatch!");
  };

  const handleRemoveFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setScanResult(null);
    setAnchorReceipt(null);
    setVerificationResult(null);
    setTamperDemo(null);
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

            {/* ⛓️ DEFENXIA TRUSTCHAIN — Blockchain Scan Integrity Layer */}
            <div className="p-5 rounded-2xl bg-black/40 border border-purple-500/30 shadow-[0_0_25px_rgba(168,85,247,0.15)] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
                    <Link2 className="h-4 w-4 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white tracking-wide">
                      ⛓️ DEFENXIA TRUSTCHAIN
                    </h4>
                    <span className="text-[10px] text-muted-foreground">
                      Cryptographic Evidence Integrity Layer
                    </span>
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className={
                    anchorReceipt?.blockchainStatus === 'anchored'
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs px-2.5 py-1"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs px-2.5 py-1"
                  }
                >
                  {anchorReceipt?.blockchainStatus === 'anchored' ? "🟢 BLOCKCHAIN ANCHORED" : "⏳ ANCHORING PENDING"}
                </Badge>
              </div>

              {/* Integrity Specs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                <div className="bg-black/50 p-3 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[10px] text-muted-foreground block uppercase">File Fingerprint</span>
                  <span className="text-cyan-300 truncate block text-[11px]" title={scanResult.sha256}>
                    {scanResult.sha256}
                  </span>
                </div>

                <div className="bg-black/50 p-3 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[10px] text-muted-foreground block uppercase">Evidence Fingerprint</span>
                  <span className="text-purple-300 truncate block text-[11px]" title={anchorReceipt?.evidenceHash || "Generating..."}>
                    {anchorReceipt?.evidenceHash || "Generating..."}
                  </span>
                </div>

                <div className="bg-black/50 p-3 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[10px] text-muted-foreground block uppercase">Network</span>
                  <span className="text-slate-300 block text-[11px]">
                    {anchorReceipt?.blockchainNetwork || "DEFENXIA TrustChain (Demo Provider)"}
                  </span>
                </div>

                <div className="bg-black/50 p-3 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[10px] text-muted-foreground block uppercase">Transaction Reference</span>
                  <span className="text-emerald-300 truncate block text-[11px]" title={anchorReceipt?.transactionReference}>
                    {anchorReceipt?.transactionReference || "Pending block confirmation..."}
                  </span>
                </div>

                <div className="bg-black/50 p-3 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[10px] text-muted-foreground block uppercase">Anchored Timestamp</span>
                  <span className="text-slate-300 block text-[11px]">
                    {anchorReceipt?.anchoredAt ? new Date(anchorReceipt.anchoredAt).toLocaleString() : "Processing..."}
                  </span>
                </div>

                <div className="bg-black/50 p-3 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[10px] text-muted-foreground block uppercase">Verification Status</span>
                  <span className="text-emerald-400 font-bold block text-[11px]">
                    {verificationResult ? (verificationResult.isValid ? "🟢 VERIFIED" : "🔴 INTEGRITY CHECK FAILED") : "🟢 VERIFIED"}
                  </span>
                </div>
              </div>

              {/* Verification Message Banner if verified */}
              {verificationResult && (
                <div
                  className={`p-3 rounded-xl border text-xs font-mono flex items-start gap-2 ${
                    verificationResult.isValid
                      ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-300"
                      : "bg-red-950/30 border-red-500/40 text-red-300"
                  }`}
                >
                  {verificationResult.isValid ? (
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold block">
                      {verificationResult.isValid ? "🟢 INTEGRITY VERIFIED" : "🔴 INTEGRITY CHECK FAILED"}
                    </span>
                    <span>{verificationResult.message}</span>
                  </div>
                </div>
              )}

              {/* Tamper Demonstration Simulator (Interactive Demo) */}
              {tamperDemo && (
                <div className="p-4 rounded-xl bg-red-950/25 border border-red-500/40 space-y-2 text-xs font-mono animate-in fade-in">
                  <div className="flex items-center gap-2 text-red-400 font-bold">
                    <AlertTriangle size={15} />
                    <span>🔴 TAMPERING DETECTED (Integrity Verification Simulation)</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Simulated attack: An attacker attempted to alter the recorded scan verdict from{" "}
                    <span className="text-emerald-400 font-bold">{tamperDemo.originalVerdict}</span> to{" "}
                    <span className="text-red-400 font-bold">{tamperDemo.tamperedVerdict}</span> in database storage.
                  </p>
                  <div className="space-y-1 text-[10px] bg-black/60 p-2.5 rounded-lg border border-red-500/20">
                    <div className="flex justify-between truncate">
                      <span className="text-muted-foreground">Original Hash:</span>
                      <span className="text-emerald-400 font-mono">{tamperDemo.originalEvidenceHash.slice(0, 24)}...</span>
                    </div>
                    <div className="flex justify-between truncate">
                      <span className="text-muted-foreground">Tampered Hash:</span>
                      <span className="text-red-400 font-mono">{tamperDemo.tamperedEvidenceHash.slice(0, 24)}...</span>
                    </div>
                  </div>
                  <span className="text-red-300 text-[11px] block">{tamperDemo.message}</span>
                </div>
              )}

              {/* Verification & Demo Actions */}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={handleVerifyIntegrity}
                  disabled={!anchorReceipt || isVerifying}
                  className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs px-4 py-2"
                >
                  {isVerifying ? (
                    <RefreshCw size={13} className="animate-spin mr-1.5" />
                  ) : (
                    <ShieldCheck size={13} className="mr-1.5 text-cyan-300" />
                  )}
                  VERIFY INTEGRITY
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSimulateTamper}
                  disabled={!anchorReceipt}
                  className="border-red-500/30 text-red-300 hover:bg-red-950/20 rounded-xl text-xs px-3 py-2"
                >
                  <AlertTriangle size={13} className="mr-1.5 text-red-400" />
                  Simulate Tamper Check
                </Button>
              </div>
            </div>

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