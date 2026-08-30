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
  KeyRound
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const AuthModal: React.FC = () => {
  const { 
    isAuthModalOpen, 
    closeAuthModal, 
    activeTab, 
    setActiveTab, 
    signIn, 
    signUp 
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setIsSubmitting(true);
    if (activeTab === 'login') {
      await signIn(email, password);
    } else {
      await signUp(email, password);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md" 
        onClick={closeAuthModal} 
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-slate-950/95 border border-purple-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(139,92,246,0.25)] z-10">
        
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
          <p className="text-xs text-muted-foreground mt-1">
            {activeTab === 'login' 
              ? 'Sign in to access your protected banking and device dashboard' 
              : 'Sign up for military-grade device & banking protection'
            }
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-black/50 border border-white/10 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('login')}
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
            onClick={() => setActiveTab('signup')}
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
                placeholder="name@example.com"
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
                  onClick={() => setActiveTab('signup')}
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
                  onClick={() => setActiveTab('login')}
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
