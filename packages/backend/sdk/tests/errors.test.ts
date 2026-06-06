import { describe, expect, it } from 'vitest';
import { FluxisError, FluxisAuthError, FluxisNetworkError, FluxisResponseParseError } from '../src/errors.js';

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

  it('prefixes message with method and path when provided', () => {
    const err = new FluxisError('Not found', 'NOT_FOUND', undefined, 404, 'GET', '/account/123');
    expect(err.message).toBe('GET /account/123: Not found');
    expect(err.method).toBe('GET');
    expect(err.path).toBe('/account/123');
  });

  it('omits prefix when method/path are not provided', () => {
    const err = new FluxisError('Bad request', 'AK0001');
    expect(err.message).toBe('Bad request');
    expect(err.method).toBeUndefined();
    expect(err.path).toBeUndefined();
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

describe('FluxisResponseParseError', () => {
  it('stores raw body and request context', () => {
    const err = new FluxisResponseParseError(
      'Response is not valid JSON',
      '<html>Bad Gateway</html>',
      502,
      'POST',
      '/pos/123/payment-request',
    );
    expect(err.name).toBe('FluxisResponseParseError');
    expect(err.code).toBe('RESPONSE_PARSE_ERROR');
    expect(err.rawBody).toBe('<html>Bad Gateway</html>');
    expect(err.statusCode).toBe(502);
    expect(err.method).toBe('POST');
    expect(err.path).toBe('/pos/123/payment-request');
    expect(err.message).toContain('POST /pos/123/payment-request');
    expect(err).toBeInstanceOf(FluxisError);
  });
});
