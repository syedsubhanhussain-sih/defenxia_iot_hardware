import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: (tab?: 'login' | 'signup') => void;
  closeAuthModal: () => void;
  activeTab: 'login' | 'signup';
  setActiveTab: (tab: 'login' | 'signup') => void;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // 2. Listen to real-time auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);

      if (event === 'SIGNED_IN' && session?.user) {
        toast.success(`Welcome, ${session.user.email || 'User'}!`);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const openAuthModal = (tab: 'login' | 'signup' = 'login') => {
    setActiveTab(tab);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) {
        toast.error(error.message || 'Failed to sign in. Please check your credentials.');
        return { error };
      }

      toast.success(`Welcome back, ${data.user?.email || 'User'}!`);
      closeAuthModal();
      return { error: null };
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred during sign in');
      return { error: err };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password
      });

      if (error) {
        toast.error(error.message || 'Failed to register account');
        return { error };
      }

      toast.success(`Account created! Logged in as ${data.user?.email || 'User'}`);
      closeAuthModal();
      return { error: null };
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred during sign up');
      return { error: err };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });

      if (error) {
        if (error.message?.includes('provider is not enabled') || (error as any).code === 'validation_failed') {
          toast.error("Google provider is not enabled in your Supabase Dashboard yet. Please use Email & Password below.");
        } else {
          toast.error(error.message || 'Failed to initialize Google Sign In');
        }
        return { error };
      }

      return { error: null };
    } catch (err: any) {
      toast.error('Google provider is not enabled in Supabase yet. Please sign up with email below.');
      return { error: err };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.info('Signed out successfully');
    } catch (err: any) {
      toast.error('Error signing out');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        activeTab,
        setActiveTab,
        signIn,
        signUp,
        signInWithGoogle,
        signOut
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
