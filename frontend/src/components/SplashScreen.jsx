import React, { useEffect, useState } from 'react';

export function SplashScreen({ onComplete }) {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // Start fading out the splash background to reveal the dashboard seamlessly
    const fadeTimer = setTimeout(() => {
      setIsClosing(true);
    }, 1800); // 1.8s mark starts the fade

    // Unmount completely
    const unmountTimer = setTimeout(() => {
      onComplete();
    }, 2500); // 2.5s total animation

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(unmountTimer);
    };
  }, [onComplete]);

  return (
    <div className={`splash-container ${isClosing ? 'closing' : ''}`}>
      <div className="splash-logo-wrapper">
        <svg
          className="splash-shield-icon"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M12 8v4" />
          <path d="M12 16h.01" />
        </svg>
      </div>
    </div>
  );
}
