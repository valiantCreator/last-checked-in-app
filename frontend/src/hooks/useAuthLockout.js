import { useState, useEffect } from 'react';

function useAuthLockout() {
  const [timeRemaining, setTimeRemaining] = useState(() => {
    const unlockTime = localStorage.getItem("authUnlockTime");
    if (unlockTime) {
      const remaining = Math.ceil((parseInt(unlockTime, 10) - Date.now()) / 1000);
      return remaining > 0 ? remaining : 0;
    }
    return 0;
  });

  useEffect(() => {
    const updateTime = () => {
      const unlockTime = localStorage.getItem("authUnlockTime");
      if (unlockTime) {
        const remaining = Math.ceil((parseInt(unlockTime, 10) - Date.now()) / 1000);
        if (remaining > 0) {
          setTimeRemaining(remaining);
        } else {
          setTimeRemaining(0);
          localStorage.removeItem("authUnlockTime");
        }
      } else {
        setTimeRemaining(0);
      }
    };

    // Listen for the custom event dispatched by apiConfig.js interceptor
    window.addEventListener("auth_rate_limited", updateTime);

    // Initial check (in case it was set before component mount)
    updateTime();

    const interval = setInterval(() => {
      updateTime();
    }, 1000);

    return () => {
      window.removeEventListener("auth_rate_limited", updateTime);
      clearInterval(interval);
    };
  }, []);

  return timeRemaining;
}

export default useAuthLockout;
