import { useEffect, useState, useRef } from "react";

export function useCountUp(end: number, duration: number = 1500, enabled: boolean = true) {
  const [count, setCount] = useState(0);
  const frameRef = useRef<number>();
  const startTimeRef = useRef<number>();

  useEffect(() => {
    if (!enabled) {
      setCount(end);
      return;
    }

    const animate = (currentTime: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = currentTime;
      }

      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (easeOutQuart)
      const eased = 1 - Math.pow(1 - progress, 4);
      const current = Math.floor(eased * end);

      setCount(current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [end, duration, enabled]);

  return count;
}
