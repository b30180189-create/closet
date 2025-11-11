import { HttpError, asHttpError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

export const notFoundHandler = (req, res, next) => {
  next(new HttpError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

export const errorHandler = (err, req, res, _next) => {
  const httpError = asHttpError(err, err.statusCode ?? 500);

  if (httpError.statusCode >= 500) {
    logger.error(
      {
        path: req.path,
        method: req.method,
        statusCode: httpError.statusCode,
        details: httpError.details
      },
      httpError.message
    );
  } else {
    logger.warn(
      {
        path: req.path,
        method: req.method,
        statusCode: httpError.statusCode,
        details: httpError.details
      },
      httpError.message
    );
  }

  res.status(httpError.statusCode).json({
    error: httpError.message,
    details: httpError.details
  });
};
