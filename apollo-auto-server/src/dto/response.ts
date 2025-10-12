import { StatusCodes } from 'http-status-codes'

interface ResponseError {
  code: StatusCodes
  message: string
}

interface Response<T> {
  success: boolean
  result?: T
  error?: ResponseError
}

export class BaseError extends Error {
  constructor(
    public code: StatusCodes,
    message: string
  ) {
    super(message)
    this.name = new.target.name
    Object.setPrototypeOf(this, new.target.prototype)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, new.target)
    }
  }
}

export class InternalServerError extends BaseError {
  constructor(message: string) {
    super(StatusCodes.INTERNAL_SERVER_ERROR, message)
  }
}

export class BadRequestError extends BaseError {
  constructor(message: string) {
    super(StatusCodes.BAD_REQUEST, message)
  }
}

export class UnauthorizedError extends BaseError {
  constructor(message: string) {
    super(StatusCodes.UNAUTHORIZED, message)
  }
}

export class ForbiddenError extends BaseError {
  constructor(message: string) {
    super(StatusCodes.FORBIDDEN, message)
  }
}

export class NotFoundError extends BaseError {
  constructor(message: string) {
    super(StatusCodes.NOT_FOUND, message)
  }
}

export class MethodNotAllowedError extends BaseError {
  constructor(message: string) {
    super(StatusCodes.METHOD_NOT_ALLOWED, message)
  }
}

export class UnprocessableEntityError extends BaseError {
  constructor(message: string) {
    super(StatusCodes.UNPROCESSABLE_ENTITY, message)
  }
}

export function createSuccessResponse<T>(result?: T): Response<T> {
  return {
    success: true,
    result,
  }
}

export function createErrorResponse(
  code: StatusCodes,
  message: string
): Response<never> {
  return {
    success: false,
    error: {
      code,
      message,
    },
  }
}
