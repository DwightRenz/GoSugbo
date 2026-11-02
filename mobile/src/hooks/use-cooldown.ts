import { useCallback, useEffect, useState } from "react";

export function useCooldown(initialSeconds = 60) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  const start = useCallback(
    (value?: number) => setSeconds(value ?? initialSeconds),
    [initialSeconds],
  );

  return { seconds, start };
}
