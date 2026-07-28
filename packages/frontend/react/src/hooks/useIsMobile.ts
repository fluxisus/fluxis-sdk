import { useEffect, useState } from 'react';

const MOBILE_USER_AGENT_PATTERN =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

const MOBILE_BREAKPOINT = 768;

function detectIsMobile(): boolean {
  const hasMobileUA =
    typeof navigator !== 'undefined' &&
    MOBILE_USER_AGENT_PATTERN.test(navigator.userAgent);
  const hasNarrowViewport =
    typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT;
  return hasMobileUA || hasNarrowViewport;
}

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const update = () => setIsMobile(detectIsMobile());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return isMobile;
}
