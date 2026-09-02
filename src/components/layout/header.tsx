import { Shield, Menu, LogIn, LogOut, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, openAuthModal, signOut } = useAuth();
  
  const isHomePage = location.pathname === "/";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 glass-card pt-[env(safe-area-inset-top,0px)]">
      <div className="container flex h-16 items-center justify-between px-4">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Defenxia
          </h1>
        </button>
        
        <div className="flex items-center gap-3">
          {!isHomePage && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              ← Back
            </Button>
          )}

          {/* Supabase Authentication Button */}
          {user ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-600/20 border border-purple-500/30 text-xs font-mono text-cyan-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="max-w-[120px] truncate">{user.email?.split('@')[0]}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={signOut}
                className="border-white/15 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-xl flex items-center gap-1.5 px-3 py-1.5"
                title="Sign Out"
              >
                <LogOut size={13} />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={() => openAuthModal('login')}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 px-3.5 py-1.5 shadow-md shadow-purple-600/20"
            >
              <LogIn size={13} />
              <span>Sign In / Sign Up</span>
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/settings")}
            className="text-muted-foreground hover:text-foreground rounded-xl"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};