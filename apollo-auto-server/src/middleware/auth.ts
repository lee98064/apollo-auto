import type { NextFunction, Request, Response } from 'express'
import AuthService from 'service/authService'
import prisma from 'utils/prisma'
import { UnauthorizedError } from '../dto/response'

const authService: AuthService = new AuthService(prisma) // You might want to inject this

const isAuthenticated = (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization
  if (authHeader) {
    const token = authHeader.split(' ')[1]

    const isLoginIn = authService.isLoginIn(token)

    if (isLoginIn) {
      req.token = token
      return next()
    }
  }

  return next(new UnauthorizedError('Unauthorized'))
}

export { isAuthenticated }
