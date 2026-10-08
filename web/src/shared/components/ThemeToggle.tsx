import React, { useRef, useEffect, useCallback } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import type { DotLottie } from '@lottiefiles/dotlottie-web';
import { useTheme, type ThemeMode } from '../hooks/useTheme';

export interface ThemeToggleProps {
  theme?: ThemeMode;
  onToggle?: (newTheme: ThemeMode) => void;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  theme: controlledTheme,
  onToggle: controlledOnToggle,
  size = 54,
  className,
  style,
}) => {
  const { theme: hookTheme, toggleTheme: hookToggle } = useTheme();

  const isControlled = controlledTheme !== undefined;
  const currentTheme: ThemeMode = isControlled ? controlledTheme : hookTheme;

  const dotLottieRef = useRef<DotLottie | null>(null);
  const isAnimatingRef = useRef(false);

  const applyFrameForTheme = useCallback((instance: DotLottie, mode: ThemeMode) => {
    try {
      instance.setSpeed(2.5);
      instance.setLoop(false);
      if (mode === 'dark') {
        instance.setFrame(142);
      } else {
        instance.setFrame(0);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleDotLottieRef = useCallback((instance: DotLottie | null) => {
    dotLottieRef.current = instance;
    if (instance) {
      const onReady = () => {
        applyFrameForTheme(instance, currentTheme);
      };
      const onComplete = () => {
        isAnimatingRef.current = false;
      };

      instance.addEventListener('ready', onReady);
      instance.addEventListener('complete', onComplete);

      if (instance.isReady) {
        applyFrameForTheme(instance, currentTheme);
      }
    }
  }, [applyFrameForTheme, currentTheme]);

  // Synchronize when theme changes externally without user clicking this button
  useEffect(() => {
    const instance = dotLottieRef.current;
    if (instance && instance.isReady && !isAnimatingRef.current) {
      applyFrameForTheme(instance, currentTheme);
    }
  }, [currentTheme, applyFrameForTheme]);

  const handleClick = () => {
    const nextTheme: ThemeMode = currentTheme === 'light' ? 'dark' : 'light';

    if (dotLottieRef.current) {
      try {
        isAnimatingRef.current = true;
        dotLottieRef.current.setLoop(false);
        dotLottieRef.current.setSpeed(2.5);
        if (nextTheme === 'dark') {
          dotLottieRef.current.setSegment(30, 142);
        } else {
          dotLottieRef.current.setSegment(281, 435);
        }
        dotLottieRef.current.play();
      } catch {
        isAnimatingRef.current = false;
      }
    }

    if (isControlled) {
      controlledOnToggle?.(nextTheme);
    } else {
      hookToggle(nextTheme);
    }
  };

  const height = Math.round(size * (1080 / 1920));

  return (
    <button
      type="button"
      role="switch"
      aria-checked={currentTheme === 'dark'}
      aria-label={currentTheme === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
      title={currentTheme === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
      data-testid="theme-toggle"
      className={className}
      onClick={handleClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${size}px`,
        height: `${height}px`,
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        borderRadius: '9999px',
        position: 'relative',
        overflow: 'hidden',
        outline: 'none',
        transition: 'transform 0.15s ease',
        flexShrink: 0,
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
          src="/theme-toggle.json"
          autoplay={false}
          loop={false}
          dotLottieRefCallback={handleDotLottieRef}
        />
      </div>
    </button>
  );
};
