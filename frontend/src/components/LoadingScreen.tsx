import React from 'react';
import './LoadingScreen.css';

interface LoadingScreenProps {
  message?: string;
  submessage?: string;
  fullScreen?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Authenticating...',
  submessage = 'Connecting to TESDA DCDO Portal',
  fullScreen = true,
}) => {
  return (
    <div className={`loading-screen-overlay ${fullScreen ? 'fullscreen' : ''}`}>
      <div className="loading-spinner-container">
        <div className="rotating-logo-wrapper">
          <img src="/tesda-logo.png" alt="TESDA Logo" className="rotating-logo" />
          <div className="loading-pulse-ring"></div>
        </div>
        {message && <div className="loading-text">{message}</div>}
        {submessage && <div className="loading-subtext">{submessage}</div>}
      </div>
    </div>
  );
};
