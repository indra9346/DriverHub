import React, { useId } from 'react';

/*
 * The DriverHub assistant as a steering wheel: stitched leather rim with
 * perforated hand grips, graphite spokes with brushed-metal trim, an amber
 * top marker (so a turn is easy to see) and a hub with the DriverHub badge
 * inside a glowing AI ring. Pure SVG, so it stays sharp at any size.
 *
 * motion: 'idle' sways gently like a car on the road, 'turn' is the hard
 * turn played when the chat opens, 'think' spins slowly while the assistant
 * is typing, 'none' stays still.
 */

type Motion = 'idle' | 'turn' | 'think' | 'none';

interface SteeringWheelAIProps {
  /** Pixel size of the square wheel. */
  size?: number;
  motion?: Motion;
  /** Fewer details for small avatars (under about 32 px). */
  simple?: boolean;
  /**
   * The column stalk (gear/indicator lever with a horn-button tip) coming out
   * from behind the wheel at the lower right. It stays fixed like on a real
   * vehicle: only the wheel turns.
   */
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
        // Behind the wheel; drawn past the wheel's box on the lower right.
        <svg viewBox="0 0 120 120" width={size} height={size} className="absolute inset-0 overflow-visible" style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id={id('stalk')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#6b737e" />
              <stop offset="0.28" stopColor="#2a2f36" />
              <stop offset="0.62" stopColor="#0b0d10" />
              <stop offset="1" stopColor="#30353c" />
            </linearGradient>
            <linearGradient id={id('stalkGrip')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#4c535c" />
              <stop offset="0.35" stopColor="#1c1f24" />
              <stop offset="0.7" stopColor="#07080a" />
              <stop offset="1" stopColor="#262a30" />
            </linearGradient>
            <linearGradient id={id('stalkMetal')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f5f7f9" />
              <stop offset="0.45" stopColor="#8d949d" />
              <stop offset="1" stopColor="#d7dbe0" />
            </linearGradient>
            <radialGradient id={id('horn')} cx="0.4" cy="0.35" r="0.75">
              <stop offset="0" stopColor="#FFE08A" />
              <stop offset="0.55" stopColor="#F5A800" />
              <stop offset="1" stopColor="#9a5b00" />
            </radialGradient>
            <filter id={id('stalkShadow')} x="-20%" y="-60%" width="140%" height="260%">
              <feGaussianBlur stdDeviation="1.6" />
            </filter>
          </defs>
          {/* Leaving the column at about the 4 o'clock position, angled down to the right. */}
          <g transform="rotate(31 60 60)">
            <rect x="66" y="59" width="66" height="7" rx="3.5" fill="#000" opacity="0.35" filter={url('stalkShadow')} />
            <rect x="62" y="56.6" width="58" height="6.8" rx="3.4" fill={url('stalk')} />
            {/* Grip end, chrome collar and the horn button at the tip */}
            <rect x="116.5" y="55.4" width="2.6" height="9.2" rx="1" fill={url('stalkMetal')} />
            <rect x="118.6" y="55.6" width="13.4" height="8.8" rx="4.4" fill={url('stalkGrip')} />
            <path d="M121 56.9 H129.6" stroke="#fff" strokeOpacity="0.22" strokeWidth="0.8" strokeLinecap="round" />
            <circle cx="131.4" cy="60" r="3.9" fill={url('stalkMetal')} />
            <circle cx="131.6" cy="60" r="3" fill={url('horn')} />
            <circle cx="130.6" cy="59" r="0.9" fill="#fff" fillOpacity="0.7" />
          </g>
        </svg>
      )}
      <svg
        viewBox="0 0 120 120"
        width={size}
        height={size}
        className={`relative block ${MOTION_CLASS[motion]}`}
        onAnimationEnd={event => {
          if (motion === 'turn' && event.animationName === 'dhWheelTurn') onTurnEnd?.();
        }}
      >
        <defs>
          <linearGradient id={id('leather')} x1="0" y1="0" x2="0.35" y2="1">
            <stop offset="0" stopColor="#535962" />
            <stop offset="0.42" stopColor="#23272d" />
            <stop offset="1" stopColor="#08090b" />
          </linearGradient>
          {/* Shading across the thickness of the rim: dark inner edge, soft top light, dark outer edge. */}
          <radialGradient id={id('tube')} cx="60" cy="60" r="56" gradientUnits="userSpaceOnUse">
            <stop offset="0.745" stopColor="#000" stopOpacity="0.6" />
            <stop offset="0.8" stopColor="#fff" stopOpacity="0.16" />
            <stop offset="0.86" stopColor="#fff" stopOpacity="0.04" />
            <stop offset="0.93" stopColor="#000" stopOpacity="0.32" />
            <stop offset="0.965" stopColor="#000" stopOpacity="0.62" />
          </radialGradient>
          <linearGradient id={id('metal')} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f7f8fa" />
            <stop offset="0.32" stopColor="#b9c0c8" />
            <stop offset="0.55" stopColor="#626a74" />
            <stop offset="0.78" stopColor="#dde1e6" />
            <stop offset="1" stopColor="#7d848e" />
          </linearGradient>
          <linearGradient id={id('graphite')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#40464f" />
            <stop offset="1" stopColor="#121417" />
          </linearGradient>
          <radialGradient id={id('hub')} cx="0.38" cy="0.32" r="0.8">
            <stop offset="0" stopColor="#3f4650" />
            <stop offset="0.6" stopColor="#181b20" />
            <stop offset="1" stopColor="#0a0b0d" />
          </radialGradient>
          <linearGradient id={id('ai')} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FFB51B" />
            <stop offset="0.5" stopColor="#22d3ee" />
            <stop offset="1" stopColor="#a78bfa" />
          </linearGradient>
          <pattern id={id('perf')} width="2.6" height="2.6" patternUnits="userSpaceOnUse">
            <rect width="2.6" height="2.6" fill="#15181c" />
            <circle cx="1.3" cy="1.3" r="0.55" fill="#000" />
            <circle cx="1.05" cy="1.05" r="0.32" fill="#fff" fillOpacity="0.12" />
          </pattern>
          <filter id={id('shadow')} x="-20%" y="-20%" width="140%" height="150%">
            <feDropShadow dx="0" dy="3" stdDeviation="2.6" floodColor="#000" floodOpacity="0.45" />
          </filter>
          <filter id={id('soft')} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1.2" />
          </filter>
          <filter id={id('glow')} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <clipPath id={id('badge')}>
            <circle cx="60" cy="60" r="9.4" />
          </clipPath>
        </defs>

        <g filter={simple ? undefined : url('shadow')}>
          {/* Spokes (under the rim) */}
          <path d="M44 53.5 C36 53.5 27 55 13.5 57.5 L13.5 69 C27 70.5 36 72.5 44 72.5 Z" fill={url('graphite')} />
          <path d="M76 53.5 C84 53.5 93 55 106.5 57.5 L106.5 69 C93 70.5 84 72.5 76 72.5 Z" fill={url('graphite')} />
          <path d="M51.5 76 C51.5 88 50.5 97 49.5 107 L70.5 107 C69.5 97 68.5 88 68.5 76 Z" fill={url('graphite')} />
          {!simple && (
            <>
              <path d="M44 60.6 C34 60.6 25.5 61.6 15 63 L15 65.2 C25.5 65.8 34 66.6 44 66.6 Z" fill={url('metal')} />
              <path d="M76 60.6 C86 60.6 94.5 61.6 105 63 L105 65.2 C94.5 65.8 86 66.6 76 66.6 Z" fill={url('metal')} />
              <path d="M57.6 77 C57.4 88 57 97 56.6 106 L63.4 106 C63 97 62.6 88 62.4 77 Z" fill={url('metal')} opacity="0.9" />
              <text x="60" y="95.5" textAnchor="middle" fontSize="6.4" fontWeight="800" letterSpacing="0.6"
                fill="#FFB51B" fontFamily="Inter, Arial, sans-serif">AI</text>
            </>
          )}

          {/* Rim: leather, shading, perforated grips, stitching, top marker, light */}
          <circle cx="60" cy="60" r="48" fill="none" stroke={url('leather')} strokeWidth="12" />
          {!simple && (
            <>
              <path d="M18.43 84 A48 48 0 0 1 18.43 36" fill="none" stroke={url('perf')} strokeWidth="12" />
              <path d="M101.57 36 A48 48 0 0 1 101.57 84" fill="none" stroke={url('perf')} strokeWidth="12" />
            </>
          )}
          <circle cx="60" cy="60" r="48" fill="none" stroke={url('tube')} strokeWidth="12" />
          {!simple && (
            <>
              <circle cx="60" cy="60" r="52.6" fill="none" stroke="#caa66b" strokeOpacity="0.5" strokeWidth="0.7" strokeDasharray="1.5 2.2" />
              <circle cx="60" cy="60" r="43.4" fill="none" stroke="#caa66b" strokeOpacity="0.45" strokeWidth="0.7" strokeDasharray="1.5 2.2" />
            </>
          )}
          <path d="M54.98 12.26 A48 48 0 0 1 65.02 12.26" fill="none" stroke="#F5A800" strokeWidth="12" />
          <path d="M54.98 12.26 A48 48 0 0 1 65.02 12.26" fill="none" stroke={url('tube')} strokeWidth="12" opacity="0.7" />
          <path d="M12.08 42.56 A51 51 0 0 1 85.5 15.83" fill="none" stroke="#fff" strokeOpacity="0.32" strokeWidth="2.4"
            strokeLinecap="round" filter={simple ? undefined : url('soft')} />

          {/* Hub with the DriverHub badge inside the AI ring */}
          <circle cx="60" cy="60" r="20" fill={url('hub')} stroke={url('metal')} strokeWidth="1.6" />
          <circle cx="60" cy="60" r="15.6" fill="#0a0c0f" stroke="#fff" strokeOpacity="0.07" />
          <g className="dh-ai-ring" filter={simple ? undefined : url('glow')}>
            <circle cx="60" cy="60" r="12.8" fill="none" stroke={url('ai')} strokeWidth="1.7"
              strokeDasharray={simple ? undefined : '7 3.2'} strokeLinecap="round" />
          </g>
          {simple ? (
            <circle cx="60" cy="60" r="6" fill="#FFB51B" />
          ) : (
            <>
              <circle cx="60" cy="60" r="10.2" fill="#fff" />
              <image href="/logo-icon.png" x="50.4" y="50.4" width="19.2" height="19.2" clipPath={url('badge')} preserveAspectRatio="xMidYMid slice" />
              <circle cx="60" cy="60" r="10.2" fill="none" stroke={url('metal')} strokeWidth="0.9" />
              <ellipse cx="56.5" cy="54.5" rx="5" ry="2.6" fill="#fff" fillOpacity="0.28" transform="rotate(-28 56.5 54.5)" />
            </>
          )}
        </g>
      </svg>
    </span>
  );
};
