import React from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

export interface MicrosoftLottieLogoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  autoplay?: boolean;
  loop?: boolean;
  speed?: number;
}

export const MicrosoftLottieLogo: React.FC<MicrosoftLottieLogoProps> = ({
  size = 22,
  className,
  style,
  autoplay = true,
  loop = true,
  speed = 1,
}) => {
  return (
    <div
      data-testid="microsoft-lottie-logo"
      className={className}
      aria-hidden="true"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <DotLottieReact
          src="/microsoft-start.json"
          autoplay={autoplay}
          loop={loop}
          speed={speed}
        />
      </div>
    </div>
  );
};
