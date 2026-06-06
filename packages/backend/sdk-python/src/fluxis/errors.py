"""Fluxis SDK exception types."""


class FluxisError(Exception):
    """Base error for Fluxis API failures."""

    def __init__(
        self,
        message: str,
        code: str,
        details: str | None = None,
        status_code: int | None = None,
        method: str | None = None,
        path: str | None = None,
    ) -> None:
        prefix = f"{method} {path}: " if method and path else ""
        super().__init__(f"{prefix}{message}")
        self.code = code
        self.details = details
        self.status_code = status_code
        self.method = method
        self.path = path


class FluxisAuthError(FluxisError):
    """Authentication failed."""

    def __init__(
        self,
        message: str,
        code: str = "AUTH_ERROR",
        details: str | None = None,
    ) -> None:
        super().__init__(message, code, details, 401)
        self.name = "FluxisAuthError"


class FluxisNetworkError(FluxisError):
    """Network or transport failure."""

    def __init__(self, message: str, cause: Exception | None = None) -> None:
        super().__init__(message, "NETWORK_ERROR", str(cause) if cause else None)
        self.name = "FluxisNetworkError"
        self.__cause__ = cause


class FluxisResponseParseError(FluxisError):
    """Response body could not be parsed as JSON."""

    def __init__(
        self,
        message: str,
        raw_body: str,
        status_code: int | None = None,
        method: str | None = None,
        path: str | None = None,
    ) -> None:
        super().__init__(message, "RESPONSE_PARSE_ERROR", raw_body, status_code, method, path)
        self.name = "FluxisResponseParseError"
        self.raw_body = raw_body
