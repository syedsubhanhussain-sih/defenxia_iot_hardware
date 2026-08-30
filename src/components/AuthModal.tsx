import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  X, 
  Mail, 
  Lock, 
  ShieldCheck, 
  LogIn, 
  UserPlus, 
  Eye, 
  EyeOff, 
  RefreshCw,
  Sparkles,
  Radio,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export const AuthModal: React.FC = () => {
  const { 
    isAuthModalOpen, 
    closeAuthModal, 
    activeTab, 
    setActiveTab, 
    signIn, 
    signUp,
    signInWithGoogle 
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [googleNotice, setGoogleNotice] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setIsSubmitting(true);
    setGoogleNotice(null);
    if (activeTab === 'login') {
      await signIn(email, password);
    } else {
      await signUp(email, password);
    }
    setIsSubmitting(false);
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleSubmitting(true);
    const result = await signInWithGoogle();
    if (result.error) {
      setGoogleNotice(
        "Google Provider is currently disabled in your Supabase Project Settings. Please use instant Email & Password sign-up below, or enable Google OAuth in your Supabase dashboard."
      );
    }
    setIsGoogleSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md" 
        onClick={closeAuthModal} 
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-slate-950/95 border border-purple-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(139,92,246,0.25)] z-10 max-h-[95vh] overflow-y-auto">
        
        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={closeAuthModal}
          className="absolute top-4 right-4 text-muted-foreground hover:text-white rounded-full bg-white/5 hover:bg-white/10"
        >
          <X size={18} />
        </Button>

        {/* Brand Icon & Title */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center mx-auto mb-3 shadow-[0_0_20px_rgba(139,92,246,0.3)]">
            <ShieldCheck className="h-7 w-7 text-cyan-400 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-white via-purple-100 to-cyan-300 bg-clip-text text-transparent">
            {activeTab === 'login' ? 'Welcome Back to Defenxia' : 'Create Defenxia Account'}
          </h2>
          
          <div className="flex items-center justify-center gap-2 mt-1.5">
            <p className="text-xs text-muted-foreground">
              {activeTab === 'login' ? 'Sign in to access your secure dashboard' : 'Register for banking & device protection'}
            </p>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[9px] py-0 px-1.5 flex items-center gap-1">
              <Radio size={8} className="animate-pulse text-emerald-400" /> Supabase Live
            </Badge>
          </div>
        </div>

        {/* Google OAuth Notice Banner if clicked */}
        {googleNotice && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl mb-4 text-[11px] text-amber-300 flex items-start gap-2 animate-fade-in">
            <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-400" />
            <span>{googleNotice}</span>
          </div>
        )}

        {/* Google OAuth Button */}
        <Button
          type="button"
          variant="outline"
          onClick={handleGoogleSignIn}
          disabled={isGoogleSubmitting}
          className="w-full bg-white/5 hover:bg-white/10 border-white/15 text-white font-medium py-5 rounded-2xl text-xs flex items-center justify-center gap-3 transition-all mb-4"
        >
          {isGoogleSubmitting ? (
            <RefreshCw size={15} className="animate-spin text-cyan-300" />
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span>Continue with Google</span>
        </Button>

        {/* Divider */}
        <div className="relative flex py-2 items-center mb-4">
          <div className="flex-grow border-t border-white/10"></div>
          <span className="flex-shrink mx-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Or with email & password (Instant)
          </span>
          <div className="flex-grow border-t border-white/10"></div>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-black/50 border border-white/10 rounded-2xl mb-5">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setGoogleNotice(null);
            }}
            className={`py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'login'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-muted-foreground hover:text-white'
            }`}
          >
            <LogIn size={14} />
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('signup');
              setGoogleNotice(null);
            }}
            className={`py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'signup'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-muted-foreground hover:text-white'
            }`}
          >
            <UserPlus size={14} />
            Sign Up
          </button>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <Input
                type="email"
                placeholder="e.g. user@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-black/60 border-white/15 text-white placeholder:text-muted-foreground rounded-xl py-5 pl-10 text-xs focus:border-purple-500/60"
              />
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder={activeTab === 'signup' ? 'Min 6 characters' : 'Enter your password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-black/60 border-white/15 text-white placeholder:text-muted-foreground rounded-xl py-5 pl-10 pr-10 text-xs focus:border-purple-500/60"
              />
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || !email.trim() || !password}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold py-5 rounded-xl text-xs shadow-lg shadow-purple-600/30 transition-all mt-2"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <RefreshCw size={15} className="animate-spin text-cyan-300" />
                {activeTab === 'login' ? 'Signing In...' : 'Creating Account...'}
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                {activeTab === 'login' ? <LogIn size={15} /> : <Sparkles size={15} />}
                {activeTab === 'login' ? 'Sign In to Defenxia' : 'Create Free Account'}
              </span>
            )}
          </Button>
        </form>

        {/* Footer info */}
        <div className="mt-6 pt-4 border-t border-white/10 text-center">
          <p className="text-[11px] text-muted-foreground">
            {activeTab === 'login' ? (
              <>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('signup');
                    setGoogleNotice(null);
                  }}
                  className="text-purple-400 hover:text-purple-300 font-semibold underline underline-offset-2 ml-1"
                >
                  Sign up here
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('login');
                    setGoogleNotice(null);
                  }}
                  className="text-purple-400 hover:text-purple-300 font-semibold underline underline-offset-2 ml-1"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>

      </div>
    </div>
  );
};
