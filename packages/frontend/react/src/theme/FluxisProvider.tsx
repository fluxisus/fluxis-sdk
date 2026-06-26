import { useMemo, useState } from 'react';
import type { FluxisProviderProps } from '../types.js';
import { FluxisContext } from './FluxisContext.js';
import { FluxisServerTimeContext } from './FluxisServerTimeContext.js';
import { mergeTheme, themeToCssVariables } from './theme.js';

export function FluxisProvider({
  children,
  theme,
  className,
  style,
}: FluxisProviderProps) {
  const mergedTheme = mergeTheme(theme);
  const cssVars = themeToCssVariables(mergedTheme);

  const [offsetMs, setOffsetMs] = useState(0);
  const serverTimeValue = useMemo(
    () => ({ offsetMs, setOffsetMs }),
    [offsetMs],
  );

  return (
    <FluxisContext.Provider value={mergedTheme}>
      <FluxisServerTimeContext.Provider value={serverTimeValue}>
        <div
          className={className}
          style={{
            ...cssVars,
            fontFamily: 'var(--fluxis-font-family)',
            color: 'var(--fluxis-color-fg)',
            ...style,
          }}
        >
          {children}
        </div>
      </FluxisServerTimeContext.Provider>
    </FluxisContext.Provider>
  );
}
