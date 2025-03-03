import React, { useState, useEffect } from 'react';
import './Loading.css';

const GameStartingLoading = ({ onCountdownEnd }) => {
  const [count, setCount] = useState(5);

  useEffect(() => {
    // Start a countdown from 5 to 0 (showing "Go!" when complete)
    const timer = setInterval(() => {
      setCount(prevCount => {
        if (prevCount <= 1) {
          clearInterval(timer);
          if (onCountdownEnd) onCountdownEnd();
          return 0;
        }
        return prevCount - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onCountdownEnd]);

  return (
    <div className="loading-container overlay">
      <div className="joy-emoji-top">😂</div>
      <p className="loading-message">Game is Starting!</p>
      <div className="countdown-container">
        {count > 0 ? (
          <div className="countdown-circle">{count}</div>
        ) : (
          <div className="countdown-circle">Go!</div>
        )}
      </div>
    </div>
  );
};

export default GameStartingLoading; 