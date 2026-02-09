import { useState, useEffect } from 'react';
import { differenceInSeconds } from 'date-fns';

export const useCountdown = (targetDate: string | null) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (!targetDate) {
      setTimeLeft(0);
      return;
    }

    const calculateTimeLeft = () => {
      const now = new Date();
      const target = new Date(targetDate);
      const seconds = differenceInSeconds(target, now);
      return seconds > 0 ? seconds : 0;
    };

    setTimeLeft(calculateTimeLeft());

    const interval = setInterval(() => {
      const seconds = calculateTimeLeft();
      setTimeLeft(seconds);
      
      if (seconds <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  
  return {
    timeLeft,
    minutes,
    seconds,
    formatted: `${minutes}:${seconds.toString().padStart(2, '0')}`,
    isExpired: timeLeft === 0
  };
};
