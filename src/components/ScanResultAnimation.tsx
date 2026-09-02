import React from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, Sparkles, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ScanResultAnimationProps {
  status: 'safe' | 'malicious' | 'warning';
  title: string;
  subtitle?: string;
  positives?: number;
  totalEngines?: number;
  score?: number;
}

export const ScanResultAnimation: React.FC<ScanResultAnimationProps> = ({
  status,
  title,
  subtitle,
  positives = 0,
  totalEngines = 72,
  score
}) => {
  const isSafe = status === 'safe';
  const isMalicious = status === 'malicious';

  return (
    <div className="relative py-6 flex flex-col items-center justify-center text-center overflow-hidden">
      
      {/* Dynamic Background Radial Aurora Waves */}
      <div 
        className={`absolute inset-0 blur-3xl opacity-30 pointer-events-none rounded-full transition-all duration-700 ${
          isSafe ? 'bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500' :
          isMalicious ? 'bg-gradient-to-tr from-red-600 via-rose-600 to-amber-600' :
          'bg-gradient-to-tr from-amber-500 via-yellow-500 to-orange-500'
        }`} 
      />

      {/* 3D Perspective Floating Shield Target */}
      <div className="relative w-44 h-44 mb-5 flex items-center justify-center [perspective:1000px]">
        
        {/* Outer Orbiting Animated Energy Ring Waves */}
        <div 
          className={`absolute inset-[-12px] rounded-full border-2 border-dashed animate-spin opacity-40 ${
            isSafe ? 'border-emerald-400' : isMalicious ? 'border-red-500' : 'border-amber-400'
          }`}
          style={{ animationDuration: '18s' }}
        />

        <div 
          className={`absolute inset-[-4px] rounded-full border border-current animate-ping opacity-25 ${
            isSafe ? 'text-emerald-400' : isMalicious ? 'text-red-500' : 'text-amber-400'
          }`}
          style={{ animationDuration: '3s' }}
        />

        {/* 3D Holographic Core Shield */}
        <div 
          className={`w-32 h-32 rounded-3xl border-2 flex flex-col items-center justify-center transition-all duration-500 shadow-2xl relative backdrop-blur-xl ${
            isSafe
              ? 'border-emerald-400/80 bg-gradient-to-br from-emerald-950/70 to-black/80 text-emerald-400 shadow-[0_0_50px_rgba(16,185,129,0.5)]'
              : isMalicious
              ? 'border-red-500/80 bg-gradient-to-br from-red-950/70 to-black/80 text-red-400 shadow-[0_0_50px_rgba(239,68,68,0.55)] animate-pulse'
              : 'border-amber-400/80 bg-gradient-to-br from-amber-950/70 to-black/80 text-amber-300 shadow-[0_0_50px_rgba(245,158,11,0.5)]'
          }`}
          style={{
            transform: 'perspective(600px) rotateX(6deg) rotateY(-4deg) translateZ(10px)',
            transition: 'transform 0.4s ease'
          }}
        >
          {/* Top Corner 3D Sparkle */}
          <div className="absolute top-2 right-2">
            <Sparkles size={14} className={isSafe ? 'text-emerald-300 animate-pulse' : 'text-red-400'} />
          </div>

          {isSafe ? (
            <ShieldCheck size={56} className="animate-in zoom-in-75 text-emerald-400 drop-shadow-[0_0_20px_rgba(16,185,129,0.8)]" />
          ) : isMalicious ? (
            <ShieldAlert size={56} className="animate-in zoom-in-75 text-red-400 drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]" />
          ) : (
            <AlertTriangle size={56} className="animate-in zoom-in-75 text-amber-400 drop-shadow-[0_0_20px_rgba(245,158,11,0.8)]" />
          )}

          <span className="text-[10px] font-mono mt-1 font-bold uppercase tracking-wider">
            {isSafe ? 'Secure' : isMalicious ? 'Threat' : 'Warning'}
          </span>
        </div>
      </div>

      {/* Result Status & Announcement Header */}
      <div className="space-y-2 max-w-lg z-10">
        
        {/* Status Badge */}
        <div className="flex items-center justify-center gap-2">
          {isSafe ? (
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-xs px-3.5 py-1 shadow-[0_0_20px_rgba(16,185,129,0.3)] font-semibold">
              <CheckCircle2 size={13} className="mr-1.5" />
              0 / {totalEngines} Detections • Safe
            </Badge>
          ) : (
            <Badge className="bg-red-500/20 text-red-300 border-red-500/40 text-xs px-3.5 py-1 shadow-[0_0_20px_rgba(239,68,68,0.3)] font-semibold">
              <XCircle size={13} className="mr-1.5" />
              {positives} / {totalEngines} Security Engines Flagged Threat
            </Badge>
          )}

          {typeof score === 'number' && (
            <Badge variant="outline" className={`text-xs px-2.5 py-1 font-mono ${
              score >= 80 ? 'text-emerald-400 border-emerald-500/30' :
              score >= 50 ? 'text-amber-400 border-amber-500/30' :
              'text-red-400 border-red-500/30'
            }`}>
              Trust Score: {score}/100
            </Badge>
          )}
        </div>

        <h3 className={`text-2xl sm:text-3xl font-bold tracking-tight ${
          isSafe ? 'text-emerald-400' : isMalicious ? 'text-red-400' : 'text-amber-300'
        }`}>
          {title}
        </h3>

        {subtitle && (
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

    </div>
  );
};
