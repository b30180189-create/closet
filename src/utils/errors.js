export class HttpError extends Error {
  constructor(statusCode, message, details = {}) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const asHttpError = (error, fallbackStatus = 500) => {
  if (error instanceof HttpError) return error;
  const httpError = new HttpError(fallbackStatus, error.message ?? "Unexpected error");
  httpError.stack = error.stack;
  return httpError;
};
