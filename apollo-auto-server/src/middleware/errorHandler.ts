import type { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { BaseError, createErrorResponse } from '../dto/response'

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

class GlobalErrorHandler {
  handleError = (
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction
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

    if (err instanceof BaseError) {
      res
        .status(err.code)
        .send(createErrorResponse(err.code, err.message))
      return
    }

    const anyErr = err as { status?: number; statusCode?: number; message?: string }

    const fallbackStatus =
      typeof anyErr.status === 'number'
        ? anyErr.status
        : typeof anyErr.statusCode === 'number'
          ? anyErr.statusCode
          : undefined

    if (fallbackStatus && fallbackStatus >= 400 && fallbackStatus <= 599) {
      res
        .status(fallbackStatus)
        .send(
          createErrorResponse(
            fallbackStatus as StatusCodes,
            anyErr.message || 'Request failed'
          )
        )
      return
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
  }
}

export const errorHandler = new GlobalErrorHandler()
