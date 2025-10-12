import jwt, { type SignOptions } from 'jsonwebtoken'
import type { StringValue } from 'ms'
import env from './env'

export interface JwtPayload {
  sub: string
  exp?: number
  user: {
    id: number
    account: string
    displayName: string
    timezone: string
  }
}

const signToken = (
  payload: object,
  secret: string,
  expiresIn: string
): string => {
  const options: SignOptions = { expiresIn: expiresIn as StringValue }
  return jwt.sign(payload, secret, options)
}

export const signAccessToken = (payload: JwtPayload): string => {
  return signToken(
    { sub: payload.sub, user: payload.user },
    env.JWT_SECRET,
    env.JWT_ACCESS_TTL
  )
}

export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload
}

export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload & {
      exp: number
    }
    return decoded.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

export default { signAccessToken, verifyAccessToken, isTokenExpired }
