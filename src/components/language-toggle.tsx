'use client';

import { Languages } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/lib/translations';

interface LanguageToggleProps {
  isFrench: boolean;
  onLanguageChange: (isFrench: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LanguageToggle({ 
  isFrench, 
  onLanguageChange, 
  size = 'md',
  className = '' 
}: LanguageToggleProps) {
  const t = useTranslation(isFrench ? 'fr' : 'en');
  
  const sizeClasses = {
    sm: 'p-1.5 gap-1.5',
    md: 'p-2 gap-2',
    lg: 'p-3 gap-3'
  };
  
  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-xs',
    lg: 'text-sm'
  };
  
  const iconSizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };
  
  const switchScaleClasses = {
    sm: 'scale-75',
    md: 'scale-75',
    lg: 'scale-100'
  };

  return (
    <div className={`flex items-center ${sizeClasses[size]} rounded-lg bg-muted/20 backdrop-blur-sm border border-muted/30 ${className}`}>
      <Languages className={`${iconSizeClasses[size]} text-muted-foreground`} />
      <Label htmlFor="language-toggle" className={`${textSizeClasses[size]} font-medium sr-only`}>
        {t.language}
      </Label>
      <div className="flex items-center gap-1.5">
        <span className={`${textSizeClasses[size]} ${!isFrench ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
          {t.english}
        </span>
        <Switch
          id="language-toggle"
          checked={isFrench}
          onCheckedChange={onLanguageChange}
          className={switchScaleClasses[size]}
        />
        <span className={`${textSizeClasses[size]} ${isFrench ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
          {t.french}
        </span>
      </div>
    </div>
  );
}
