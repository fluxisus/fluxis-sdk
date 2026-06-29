import { useContext } from 'react';
import { FluxisServerTimeContext } from '../theme/FluxisServerTimeContext.js';

/**
 * Internal hook for reading/updating the shared clock-skew offset.
 * Not part of the public API — works with or without a FluxisProvider
 * ancestor (defaults to a no-op offset of 0).
 */
export function useServerTimeOffset() {
  return useContext(FluxisServerTimeContext);
}
