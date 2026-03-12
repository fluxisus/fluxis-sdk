import { describe, expect, it } from 'vitest';
import { FluxisError, FluxisAuthError, FluxisNetworkError } from '../src/errors.js';

describe('FluxisError', () => {
  it('stores code, message, details, and statusCode', () => {
    const err = new FluxisError('Bad request', 'AK0001', 'Invalid field', 400);
    expect(err.message).toBe('Bad request');
    expect(err.code).toBe('AK0001');
    expect(err.details).toBe('Invalid field');
    expect(err.statusCode).toBe(400);
    expect(err.name).toBe('FluxisError');
    expect(err).toBeInstanceOf(Error);
  });
});

describe('FluxisAuthError', () => {
  it('is an instance of FluxisError with 401 status', () => {
    const err = new FluxisAuthError('Invalid credentials');
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('AUTH_ERROR');
    expect(err).toBeInstanceOf(FluxisError);
    expect(err).toBeInstanceOf(FluxisAuthError);
  });
});

describe('FluxisNetworkError', () => {
  it('wraps a cause error', () => {
    const cause = new Error('fetch failed');
    const err = new FluxisNetworkError('Connection error', cause);
    expect(err.code).toBe('NETWORK_ERROR');
    expect(err.details).toBe('fetch failed');
    expect(err.cause).toBe(cause);
  });
});
