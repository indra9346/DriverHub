import React, { useId } from 'react';

/*
 * The DriverHub assistant as a steering wheel: grained, stitched leather rim
 * with perforated hand grips, graphite spokes with chrome inserts and
 * screws, an amber top marker (so a turn is easy to see) and a chrome hub
 * carrying the DriverHub logo inside a glowing AI ring. Optional column
 * stalk with a horn-button tip, fixed like on a real vehicle (only the wheel
 * turns). Pure SVG, so it stays sharp on any screen.
 *
 * motion: 'idle' sways gently like small corrections on the road, 'turn'
 * steers left, right and back to straight (played before the chat opens),
 * 'think' steers left-right while the assistant is typing, 'none' is still.
 */

type Motion = 'idle' | 'turn' | 'think' | 'none';

interface SteeringWheelAIProps {
  /** Pixel size of the square wheel. */
  size?: number;
  motion?: Motion;
  /** Fewer details for small avatars (under about 32 px). */
  simple?: boolean;
  /** The column stalk coming out from behind the wheel at the lower right. */
  stalk?: boolean;
  className?: string;
  onTurnEnd?: () => void;
}

const MOTION_CLASS: Record<Motion, string> = {
  idle: 'dh-wheel-idle',
  turn: 'dh-wheel-turn',
  think: 'dh-wheel-think',
  none: ''
};

const LOGO = '/logo-icon-1024.png';

export const SteeringWheelAI: React.FC<SteeringWheelAIProps> = ({
  size = 56, motion = 'none', simple = false, stalk = false, className = '', onTurnEnd
}) => {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const id = (name: string) => `${name}-${uid}`;
  const url = (name: string) => `url(#${id(name)})`;

  return (
    <span
      className={`dh-wheel relative inline-block shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {stalk && (
        <svg viewBox="0 0 120 120" width={size} height={size} className="absolute inset-0" style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id={id('stalk')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#7d858f" />
              <stop offset="0.22" stopColor="#353a41" />
              <stop offset="0.6" stopColor="#0a0b0d" />
              <stop offset="1" stopColor="#3a3f46" />
            </linearGradient>
            <linearGradient id={id('stalkGrip')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#5a616b" />
              <stop offset="0.3" stopColor="#1f2227" />
              <stop offset="0.72" stopColor="#060708" />
              <stop offset="1" stopColor="#2c3037" />
            </linearGradient>
            <linearGradient id={id('stalkChrome')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="0.35" stopColor="#aab1ba" />
              <stop offset="0.55" stopColor="#5d646e" />
              <stop offset="1" stopColor="#e7eaee" />
            </linearGradient>
            <radialGradient id={id('horn')} cx="0.38" cy="0.32" r="0.78">
              <stop offset="0" stopColor="#FFF1C2" />
              <stop offset="0.45" stopColor="#FFB51B" />
              <stop offset="1" stopColor="#8a5200" />
            </radialGradient>
            <filter id={id('stalkShadow')} x="-20%" y="-80%" width="140%" height="300%">
              <feGaussianBlur stdDeviation="1.7" />
            </filter>
          </defs>
          <g transform="rotate(31 60 60)">
            <rect x="66" y="59.5" width="70" height="8" rx="4" fill="#000" opacity="0.4" filter={url('stalkShadow')} />
            <rect x="62" y="56.2" width="57" height="7.6" rx="3.8" fill={url('stalk')} />
            <path d="M64 57.6 H117" stroke="#fff" strokeOpacity="0.28" strokeWidth="0.7" strokeLinecap="round" />
            <rect x="115.8" y="54.8" width="3" height="10.4" rx="1.1" fill={url('stalkChrome')} />
            <rect x="118.2" y="55" width="14.6" height="10" rx="5" fill={url('stalkGrip')} />
            <path d="M120.6 56.5 H130.6" stroke="#fff" strokeOpacity="0.26" strokeWidth="0.8" strokeLinecap="round" />
            <circle cx="132.6" cy="60" r="4.5" fill={url('stalkChrome')} />
            <circle cx="132.8" cy="60" r="3.5" fill={url('horn')} />
            <circle cx="131.7" cy="58.9" r="1" fill="#fff" fillOpacity="0.8" />
          </g>
        </svg>
      )}

      <svg
        viewBox="0 0 120 120"
        width={size}
        height={size}
        className={`relative block ${MOTION_CLASS[motion]}`}
        shapeRendering="geometricPrecision"
        onAnimationEnd={event => {
          if (motion === 'turn' && event.animationName === 'dhWheelTurn') onTurnEnd?.();
        }}
      >
        <defs>
          <linearGradient id={id('leather')} x1="0.1" y1="0" x2="0.55" y2="1">
            <stop offset="0" stopColor="#7a818b" />
            <stop offset="0.3" stopColor="#3b4047" />
            <stop offset="0.66" stopColor="#15181c" />
            <stop offset="1" stopColor="#040506" />
          </linearGradient>
          {/* Shading across the round rim: dark inner edge, light ridge, dark outer edge. */}
          <radialGradient id={id('tube')} cx="60" cy="60" r="55" gradientUnits="userSpaceOnUse">
            <stop offset="0.755" stopColor="#000" stopOpacity="0.7" />
            <stop offset="0.79" stopColor="#fff" stopOpacity="0.24" />
            <stop offset="0.84" stopColor="#fff" stopOpacity="0.06" />
            <stop offset="0.9" stopColor="#000" stopOpacity="0.16" />
            <stop offset="0.955" stopColor="#000" stopOpacity="0.75" />
          </radialGradient>
          <linearGradient id={id('chrome')} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.18" stopColor="#c8ced5" />
            <stop offset="0.38" stopColor="#737b85" />
            <stop offset="0.52" stopColor="#f0f2f5" />
            <stop offset="0.7" stopColor="#8f97a1" />
            <stop offset="0.86" stopColor="#e1e5ea" />
            <stop offset="1" stopColor="#666d77" />
          </linearGradient>
          <linearGradient id={id('spoke')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#555c66" />
            <stop offset="0.45" stopColor="#1e2126" />
            <stop offset="1" stopColor="#090a0c" />
          </linearGradient>
          <radialGradient id={id('hub')} cx="0.36" cy="0.3" r="0.85">
            <stop offset="0" stopColor="#4a515b" />
            <stop offset="0.55" stopColor="#1a1d22" />
            <stop offset="1" stopColor="#08090b" />
          </radialGradient>
          <linearGradient id={id('ai')} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FFB51B" />
            <stop offset="0.5" stopColor="#22d3ee" />
            <stop offset="1" stopColor="#a78bfa" />
          </linearGradient>
          <pattern id={id('perf')} width="2.4" height="2.4" patternUnits="userSpaceOnUse">
            <rect width="2.4" height="2.4" fill="#191c20" />
            <circle cx="1.2" cy="1.2" r="0.52" fill="#000" />
            <circle cx="0.98" cy="0.98" r="0.28" fill="#fff" fillOpacity="0.16" />
          </pattern>
          {/* Leather grain: fine noise kept inside the rim. */}
          <filter id={id('grain')} x="-15%" y="-15%" width="130%" height="130%">
            <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed="7" result="noise" />
            <feColorMatrix in="noise" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.9 -0.35" result="specks" />
            <feComposite in="specks" in2="SourceAlpha" operator="in" />
          </filter>
          <filter id={id('shadow')} x="-20%" y="-20%" width="140%" height="150%">
            <feDropShadow dx="0" dy="3.2" stdDeviation="2.6" floodColor="#000" floodOpacity="0.5" />
          </filter>
          <filter id={id('soft')} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1.3" />
          </filter>
          <filter id={id('glow')} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <clipPath id={id('badge')}>
            <circle cx="60" cy="60" r={simple ? 16 : 15.2} />
          </clipPath>
        </defs>

        <g filter={simple ? undefined : url('shadow')}>
          {/* Spokes, under the rim */}
          <path d="M37 52 C30 52.5 22 54.5 13 57.4 L13 69.2 C22 70.2 30 72 37 73 Z" fill={url('spoke')} />
          <path d="M83 52 C90 52.5 98 54.5 107 57.4 L107 69.2 C98 70.2 90 72 83 73 Z" fill={url('spoke')} />
          <path d="M50 82 C50 90 49.5 98 48.4 107.6 L71.6 107.6 C70.5 98 70 90 70 82 Z" fill={url('spoke')} />
          {!simple && (
            <>
              <path d="M37 53.2 C30 53.7 22 55.6 13.5 58.4" fill="none" stroke="#fff" strokeOpacity="0.22" strokeWidth="0.7" />
              <path d="M83 53.2 C90 53.7 98 55.6 106.5 58.4" fill="none" stroke="#fff" strokeOpacity="0.22" strokeWidth="0.7" />
              <path d="M37 59.4 C29 59.9 21.5 61 14 62.6 L14 65.8 C21.5 66.4 29 66.9 37 67.2 Z" fill={url('chrome')} />
              <path d="M83 59.4 C91 59.9 98.5 61 106 62.6 L106 65.8 C98.5 66.4 91 66.9 83 67.2 Z" fill={url('chrome')} />
              <path d="M56.6 83 L55.9 107 L64.1 107 L63.4 83 Z" fill={url('chrome')} />
              <circle cx="39.6" cy="56.2" r="1.05" fill={url('chrome')} stroke="#000" strokeOpacity="0.5" strokeWidth="0.3" />
              <circle cx="39.6" cy="70" r="1.05" fill={url('chrome')} stroke="#000" strokeOpacity="0.5" strokeWidth="0.3" />
              <circle cx="80.4" cy="56.2" r="1.05" fill={url('chrome')} stroke="#000" strokeOpacity="0.5" strokeWidth="0.3" />
              <circle cx="80.4" cy="70" r="1.05" fill={url('chrome')} stroke="#000" strokeOpacity="0.5" strokeWidth="0.3" />
              <rect x="52.8" y="92.6" width="14.4" height="8.6" rx="2.3" fill="#0b0d10" stroke="#F5A800" strokeWidth="0.7" />
              <text x="60" y="99.1" textAnchor="middle" fontSize="6.6" fontWeight="900" letterSpacing="0.5"
                fill="#FFB51B" fontFamily="Inter, Arial, sans-serif">AI</text>
            </>
          )}

          {/* Rim */}
          <circle cx="60" cy="60" r="47" fill="none" stroke={url('leather')} strokeWidth="11" />
          {!simple && (
            <>
              <path d="M19.3 83.5 A47 47 0 0 1 19.3 36.5" fill="none" stroke={url('perf')} strokeWidth="11" />
              <path d="M100.7 36.5 A47 47 0 0 1 100.7 83.5" fill="none" stroke={url('perf')} strokeWidth="11" />
              <circle cx="60" cy="60" r="47" fill="none" stroke="#fff" strokeWidth="11" opacity="0.38" filter={url('grain')} />
            </>
          )}
          <circle cx="60" cy="60" r="47" fill="none" stroke={url('tube')} strokeWidth="11" />
          {!simple && (
            <>
              <circle cx="60" cy="60" r="51.7" fill="none" stroke="#000" strokeOpacity="0.4" strokeWidth="1.5" />
              <circle cx="60" cy="60" r="51.7" fill="none" stroke="#e6c896" strokeOpacity="0.85" strokeWidth="0.8" strokeDasharray="1.9 1.5" />
              <circle cx="60" cy="60" r="42.3" fill="none" stroke="#000" strokeOpacity="0.4" strokeWidth="1.5" />
              <circle cx="60" cy="60" r="42.3" fill="none" stroke="#e6c896" strokeOpacity="0.8" strokeWidth="0.8" strokeDasharray="1.9 1.5" />
            </>
          )}
          {/* Amber top marker */}
          <path d="M55.08 13.26 A47 47 0 0 1 64.92 13.26" fill="none" stroke="#F5A800" strokeWidth="11" />
          <path d="M55.08 13.26 A47 47 0 0 1 64.92 13.26" fill="none" stroke={url('tube')} strokeWidth="11" opacity="0.65" />
          {/* Light on the leather */}
          <path d="M14.6 44 A49.5 49.5 0 0 1 86 18" fill="none" stroke="#fff" strokeOpacity="0.22" strokeWidth="4"
            strokeLinecap="round" filter={simple ? undefined : url('soft')} />
          {!simple && (
            <path d="M13.6 47 A50.4 50.4 0 0 1 80.5 14.3" fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="0.9" strokeLinecap="round" />
          )}

          {/* Hub: chrome bezel, AI ring, DriverHub logo */}
          <circle cx="60" cy="60" r="24" fill={url('hub')} stroke={url('chrome')} strokeWidth="2.4" />
          <circle cx="60" cy="60" r="21.2" fill="#07080a" stroke="#fff" strokeOpacity="0.07" strokeWidth="0.6" />
          {!simple && (
            <g className="dh-ai-ring" filter={url('glow')}>
              <circle cx="60" cy="60" r="18.5" fill="none" stroke={url('ai')} strokeWidth="1.4" strokeDasharray="9 3.4" strokeLinecap="round" />
            </g>
          )}
          <circle cx="60" cy="60" r={simple ? 16 : 15.2} fill="#022e6d" />
          {/* The whole rounded-square logo fits inside the round navy badge (same navy, so it looks seamless). */}
          <image href={LOGO} x={simple ? 47.2 : 47.8} y={simple ? 47.2 : 47.8} width={simple ? 25.6 : 24.4} height={simple ? 25.6 : 24.4}
            clipPath={url('badge')} preserveAspectRatio="xMidYMid meet" />
          <circle cx="60" cy="60" r={simple ? 16 : 15.2} fill="none" stroke={url('chrome')} strokeWidth={simple ? 1.6 : 1.2} />
          {!simple && (
            <ellipse cx="54.5" cy="52.5" rx="8" ry="3.6" fill="#fff" fillOpacity="0.2" transform="rotate(-32 54.5 52.5)" />
          )}
        </g>
      </svg>
    </span>
  );
};
