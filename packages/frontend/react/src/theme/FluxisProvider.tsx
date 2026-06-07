import type { FluxisProviderProps } from '../types.js';
import { FluxisContext } from './FluxisContext.js';
import { mergeTheme, themeToCssVariables } from './theme.js';

export function FluxisProvider({
  children,
  theme,
  className,
  style,
}: FluxisProviderProps) {
  const mergedTheme = mergeTheme(theme);
  const cssVars = themeToCssVariables(mergedTheme);

  return (
    <FluxisContext.Provider value={mergedTheme}>
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
    </FluxisContext.Provider>
  );
}
