import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickActionButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  className?: string;
}

export const QuickActionButton = ({ icon: Icon, label, onClick, className }: QuickActionButtonProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "glass-card p-4 rounded-lg text-center group",
        "transition-all duration-300 ease-out",
        "hover:scale-105 hover:shadow-lg",
        "hover:shadow-primary/20 hover:border-primary/30",
        "active:scale-95",
        "aspect-square flex flex-col items-center justify-center gap-2",
        "w-full h-full",
        className
      )}
    >
      <Icon 
        size={24} 
        className="text-primary group-hover:text-primary-glow transition-colors duration-300 flex-shrink-0" 
      />
      <span className="text-xs font-medium text-foreground group-hover:text-primary-glow transition-colors duration-300 leading-tight">
        {label}
      </span>
    </button>
  );
};