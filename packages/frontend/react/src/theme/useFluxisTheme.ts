import { useContext } from 'react';
import type { FluxisTheme } from '../types.js';
import { FluxisContext } from './FluxisContext.js';

export function useFluxisTheme(): FluxisTheme {
  return useContext(FluxisContext);
}
