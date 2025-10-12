import type { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { BadRequestError, createSuccessResponse } from '../dto/response'
import type AuthService from '../service/authService'

export default class AuthController {
  constructor(private readonly authService: AuthService) {}

  login = async (req: Request, res: Response) => {
    const { account, password } = req.body

    const result = await this.authService.login(account, password)

    res.json(createSuccessResponse(result))
  }

  logout = async (req: Request, res: Response) => {
    const token = req.token

    if (!token) {
      throw new BadRequestError('Token is required for logout.')
    }

    const result = await this.authService.logout(token)

    if (!result) {
      throw new BadRequestError('Failed to logout.')
    }

    res.status(StatusCodes.NO_CONTENT).send()
  }

  register = async (req: Request, res: Response) => {
    const { account, password, displayName, timezone } = req.body

    const result = await this.authService.register({
      account,
      password,
      displayName,
      timezone,
    })

    res.json(createSuccessResponse(result))
  }
}
