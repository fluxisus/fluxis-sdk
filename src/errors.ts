export class FluxisError extends Error {
  readonly code: string;
  readonly details?: string;
  readonly statusCode?: number;

  constructor(message: string, code: string, details?: string, statusCode?: number) {
    super(message);
    this.name = 'FluxisError';
    this.code = code;
    this.details = details;
    this.statusCode = statusCode;
  }
}

export class FluxisAuthError extends FluxisError {
  constructor(message: string, code = 'AUTH_ERROR', details?: string) {
    super(message, code, details, 401);
    this.name = 'FluxisAuthError';
  }
}

export class FluxisNetworkError extends FluxisError {
  constructor(message: string, cause?: Error) {
    super(message, 'NETWORK_ERROR', cause?.message);
    this.name = 'FluxisNetworkError';
    if (cause) {
      this.cause = cause;
    }
  }
}
