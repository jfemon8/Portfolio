/** Operational error with an HTTP status code, handled by the error middleware. */
export class ApiError extends Error {
  statusCode: number;
  details?: unknown;
  isOperational = true;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace?.(this, this.constructor);
  }

  static badRequest(msg = 'Bad request', details?: unknown): ApiError {
    return new ApiError(400, msg, details);
  }
  static unauthorized(msg = 'Unauthorized'): ApiError {
    return new ApiError(401, msg);
  }
  static forbidden(msg = 'Forbidden'): ApiError {
    return new ApiError(403, msg);
  }
  static notFound(msg = 'Resource not found'): ApiError {
    return new ApiError(404, msg);
  }
  static conflict(msg = 'Conflict'): ApiError {
    return new ApiError(409, msg);
  }
}

export default ApiError;
