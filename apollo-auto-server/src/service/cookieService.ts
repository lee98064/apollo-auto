import type { ApolloCookie, PrismaClient } from '@prisma/client'

export default class CookieService {
  constructor(private readonly prisma: PrismaClient) {}

  async getCookieByUser(userId: number): Promise<ApolloCookie | null> {
    return this.prisma.apolloCookie.findUnique({
      where: { userId },
    })
  }

  async upsertCookie(
    userId: number,
    value: string
  ): Promise<ApolloCookie> {
    return this.prisma.apolloCookie.upsert({
      where: { userId },
      create: {
        userId,
        value,
      },
      update: {
        value,
      },
    })
  }
}
