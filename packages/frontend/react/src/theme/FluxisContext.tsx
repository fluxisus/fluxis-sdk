import { createContext } from 'react';
import type { FluxisTheme } from '../types.js';
import { defaultTheme } from './theme.js';

export const FluxisContext = createContext<FluxisTheme>(defaultTheme);
