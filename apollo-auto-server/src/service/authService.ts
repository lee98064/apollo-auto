import type { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import { ConflictError, UnauthorizedError } from '../dto/response'
import jwt from '../utils/jwt'

type RegisterParams = {
  account: string
  password: string
  displayName: string
  timezone: string
}

export default class AuthService {
  constructor(private readonly prisma: PrismaClient) {}

  async isLoginIn(token: string) {
    const existingToken = await this.prisma.token.findUnique({
      where: { token },
    })

    if (!existingToken) {
      return false
    }

    const isExpired = jwt.isTokenExpired(token)

    return !isExpired
  }

  async login(account: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { account } })
    if (!user) throw new UnauthorizedError('Accoount or password is invalid.')

    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) throw new UnauthorizedError('Account or password is invalid.')

    const token = jwt.signAccessToken({
      sub: user.id.toString(),
      user: {
        id: user.id,
        account: user.account,
        displayName: user.displayName,
        timezone: user.timezone,
      },
    })

    this.prisma.token.create({
      data: {
        userId: user.id,
        token,
      },
    })

    return { user, token }
  }

  async logout(token: string) {
    const result = await this.prisma.token.deleteMany({
      where: { token },
    })

    return result.count > 0
  }

  async register({ account, password, displayName, timezone }: RegisterParams) {
    const existingUser = await this.prisma.user.findUnique({
      where: { account },
    })
    if (existingUser) {
      throw new ConflictError('Account already exists.')
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const newUser = await this.prisma.user.create({
      data: {
        account,
        password: hashedPassword,
        displayName,
        timezone,
      },
    })

    const token = jwt.signAccessToken({
      sub: newUser.id.toString(),
      user: {
        id: newUser.id,
        account: newUser.account,
        displayName: newUser.displayName,
        timezone: newUser.timezone,
      },
    })

    this.prisma.token.create({
      data: {
        userId: newUser.id,
        token,
      },
    })

    return { user: newUser, token }
  }
}
