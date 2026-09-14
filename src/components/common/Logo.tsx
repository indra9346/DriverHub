import React from 'react';
import { Link } from 'react-router-dom';

interface LogoProps {
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  clickable?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  variant = 'light',
  size = 'md',
  showTagline = true,
  clickable = true,
  className = '',
}) => {
  const sizeMap = {
    sm: { icon: 'w-7 h-7 rounded-lg', text: 'text-lg', tag: 'text-[9px]' },
    md: { icon: 'w-10 h-10 rounded-xl', text: 'text-xl', tag: 'text-[10px]' },
    lg: { icon: 'w-12 h-12 rounded-2xl', text: 'text-2xl', tag: 'text-xs' },
    xl: { icon: 'w-16 h-16 rounded-3xl', text: 'text-3xl', tag: 'text-sm' },
  };

  const currentSize = sizeMap[size];

  const content = (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* 4-Side Curved Clean Logo Icon (trimmed corner white background, curved edges) */}
      <div className={`relative overflow-hidden shrink-0 shadow-sm border border-slate-200/40 ${currentSize.icon} transition-transform hover:scale-105 duration-200`}>
        <img
          src="/logo-icon.png"
          alt="Driver Hub"
          className="w-full h-full object-cover rounded-[inherit]"
          onError={(e) => {
            // Fallback inline stylized icon if image fails to load
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      </div>

      {/* Typography */}
      <div className="flex flex-col leading-none">
        <div className="flex items-center tracking-tight font-extrabold font-display">
          <span className={variant === 'dark' ? 'text-white' : 'text-[#08233F]'}>
            DRIVER
          </span>
          <span className="text-amber-500 ml-1">
            HUB
          </span>
        </div>
        {showTagline && (
          <span className={`font-semibold tracking-wide mt-0.5 ${variant === 'dark' ? 'text-slate-300' : 'text-slate-500'} ${currentSize.tag}`}>
            Professional Recruitment Network
          </span>
        )}
      </div>
    </div>
  );

  if (clickable) {
    return (
      <Link to="/" className="inline-block hover:opacity-95 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
};
