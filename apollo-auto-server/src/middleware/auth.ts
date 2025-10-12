import { UnauthorizedError } from 'dto/response'
import type { NextFunction, Request, Response } from 'express'
import AuthService from 'service/authService'
import jwt from 'utils/jwt'
import prisma from 'utils/prisma'

const authService = new AuthService(prisma)

const isAuthenticated = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization ?? ''
  const [, token] = authHeader.split(' ')

  if (!token) {
    return next(new UnauthorizedError('Unauthorized'))
  }

  try {
    const isLoggedIn = await authService.isLoginIn(token)
    if (!isLoggedIn) {
      return next(new UnauthorizedError('Unauthorized'))
    }

    const payload = jwt.verifyAccessToken(token)

    req.token = token
    req.user = payload.user

    return next()
  } catch (err) {
    console.error(err)
    return next(new UnauthorizedError('Unauthorized'))
  }
}

export { isAuthenticated }
