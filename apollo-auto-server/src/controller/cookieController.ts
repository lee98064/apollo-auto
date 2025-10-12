import { BadRequestError, createSuccessResponse } from 'dto/response'
import type { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import type CookieService from 'service/cookieService'

type UpsertCookieRequestBody = {
  value: string
}

export default class CookieController {
  constructor(private readonly cookieService: CookieService) {}

  getCookie = async (req: Request, res: Response) => {
    const user = req.user

    const cookie = await this.cookieService.getCookieByUser(user.id)

    res.json(
      createSuccessResponse({
        value: cookie?.value ?? null,
      })
    )
  }

  upsertCookie = async (
    req: Request<unknown, unknown, UpsertCookieRequestBody>,
    res: Response
  ) => {
    const user = req.user

    const { value } = req.body

    if (typeof value !== 'string' || value.length === 0) {
      throw new BadRequestError('Cookie value is required.')
    }

    const cookie = await this.cookieService.upsertCookie(user.id, value)

    res.status(StatusCodes.OK).json(
      createSuccessResponse({
        value: cookie.value,
      })
    )
  }
}
