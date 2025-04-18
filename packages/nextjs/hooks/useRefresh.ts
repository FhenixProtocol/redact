import { useCallback, useEffect, useState } from "react";

export const useRefresh = (intervalMs = 5000) => {
  const [refreshCount, setRefreshCount] = useState(0);

  const forceRefresh = useCallback(() => {
    setRefreshCount(prev => prev + 1);
  }, []);

  useEffect(() => {
    const interval = setInterval(forceRefresh, intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs, forceRefresh]);

  return { refresh: refreshCount, forceRefresh };
};
