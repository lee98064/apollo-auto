import type { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import {
  BadRequestError,
  createErrorResponse,
  ForbiddenError,
  MethodNotAllowedError,
  NotFoundError,
  UnauthorizedError,
  UnprocessableEntityError,
} from '../dto/response'

type ValidationErrorDetail = {
  path?: string | (string | number)[]
  message?: string
}

type OpenApiValidationError = Error & {
  status?: number
  errors?: ValidationErrorDetail[]
}

function isOpenApiValidationError(err: Error): err is OpenApiValidationError {
  if (typeof (err as OpenApiValidationError).status !== 'number') {
    return false
  }

  if ((err as OpenApiValidationError).status !== StatusCodes.BAD_REQUEST) {
    return false
  }

  return Array.isArray((err as OpenApiValidationError).errors)
}

function formatValidationMessage(
  errors: ValidationErrorDetail[] | undefined
): string {
  if (!errors || errors.length === 0) {
    return 'Request validation failed.'
  }

  return errors
    .map((error) => {
      const path = Array.isArray(error.path)
        ? error.path.join('.')
        : (error.path ?? 'request')
      const message = error.message ?? 'is invalid'
      return `${path}: ${message}`
    })
    .join(', ')
}

type ErrorHandlerConfig = {
  check: (err: Error) => boolean
  status: StatusCodes
  errorCode: StatusCodes
  message: (err: Error) => string
}

const errorHandlers: ErrorHandlerConfig[] = [
  {
    check: (err) => err instanceof BadRequestError,
    status: StatusCodes.BAD_REQUEST,
    errorCode: StatusCodes.BAD_REQUEST,
    message: (err) => `Bad request, message: ${err.message}`,
  },
  {
    check: (err) => err instanceof UnauthorizedError,
    status: StatusCodes.UNAUTHORIZED,
    errorCode: StatusCodes.UNAUTHORIZED,
    message: (err) => `Unauthorized, message: ${err.message}`,
  },
  {
    check: (err) => err instanceof ForbiddenError,
    status: StatusCodes.FORBIDDEN,
    errorCode: StatusCodes.FORBIDDEN,
    message: (err) => `Forbidden, message: ${err.message}`,
  },
  {
    check: (err) => err instanceof NotFoundError,
    status: StatusCodes.NOT_FOUND,
    errorCode: StatusCodes.NOT_FOUND,
    message: (err) => `Not found, message: ${err.message}`,
  },
  {
    check: (err) => err instanceof MethodNotAllowedError,
    status: StatusCodes.METHOD_NOT_ALLOWED,
    errorCode: StatusCodes.METHOD_NOT_ALLOWED,
    message: (err) => `Method not allowed, message: ${err.message}`,
  },
  {
    check: (err) => err instanceof UnprocessableEntityError,
    status: StatusCodes.UNPROCESSABLE_ENTITY,
    errorCode: StatusCodes.UNPROCESSABLE_ENTITY,
    message: (err) => `Unprocessable entity, message: ${err.message}`,
  },
]

class GlobalErrorHandler {
  handleError = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    if (isOpenApiValidationError(err)) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .send(
          createErrorResponse(
            StatusCodes.BAD_REQUEST,
            formatValidationMessage(err.errors)
          )
        )
      return
    }

    for (const handler of errorHandlers) {
      if (handler.check(err)) {
        res
          .status(handler.status)
          .send(createErrorResponse(handler.errorCode, handler.message(err)))
        return
      }
    }

    console.error('Unhandled error:', {
      message: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
    })

    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .send(
        createErrorResponse(
          StatusCodes.INTERNAL_SERVER_ERROR,
          'Internal server error'
        )
      )
    next()
  }
}

export const errorHandler = new GlobalErrorHandler()

export function handleExpressHandlerError<
  P = unknown,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = unknown,
>(
  handler: (
    req: Request<P, ResBody, ReqBody, ReqQuery>,
    res: Response
  ) => Promise<void>
) {
  return async (
    req: Request<P, ResBody, ReqBody, ReqQuery>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      await handler(req, res)
    } catch (err) {
      next(err)
    }
  }
}
