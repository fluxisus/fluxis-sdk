export class FluxisError extends Error {
  readonly code: string;
  readonly details?: string;
  readonly statusCode?: number;
  readonly method?: string;
  readonly path?: string;

  constructor(
    message: string,
    code: string,
    details?: string,
    statusCode?: number,
    method?: string,
    path?: string,
  ) {
    const prefix = method && path ? `${method} ${path}: ` : '';
    super(`${prefix}${message}`);
    this.name = 'FluxisError';
    this.code = code;
    this.details = details;
    this.statusCode = statusCode;
    this.method = method;
    this.path = path;
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

export class FluxisResponseParseError extends FluxisError {
  readonly rawBody: string;

  constructor(message: string, rawBody: string, statusCode?: number, method?: string, path?: string) {
    super(message, 'RESPONSE_PARSE_ERROR', rawBody, statusCode, method, path);
    this.name = 'FluxisResponseParseError';
    this.rawBody = rawBody;
  }
}
