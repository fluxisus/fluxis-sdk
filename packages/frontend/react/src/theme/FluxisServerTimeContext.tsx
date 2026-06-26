import { createContext } from 'react';

export interface FluxisServerTimeContextValue {
  offsetMs: number;
  setOffsetMs: (offsetMs: number) => void;
}

export const FluxisServerTimeContext = createContext<FluxisServerTimeContextValue>({
  offsetMs: 0,
  setOffsetMs: () => {},
});
