import { useEffect, useState } from 'react';

const MOBILE_USER_AGENT_PATTERN =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

function detectIsMobile(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }

  return MOBILE_USER_AGENT_PATTERN.test(navigator.userAgent);
}

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(detectIsMobile());
  }, []);

  return isMobile;
}
