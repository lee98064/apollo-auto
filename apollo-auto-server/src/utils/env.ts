import { cleanEnv, str } from 'envalid'

const env = cleanEnv(process.env, {
  JWT_SECRET: str({}),
  JWT_ACCESS_TTL: str({ default: '365d' }),
  CHECK_IN_JOB_SCHEDULE: str({ default: '*/1 * * * * *' }),
  COOKIE_REFRESH_JOB_SCHEDULE: str({ default: '0 0 12 * * *' }),
  APOLLO_BASE_URL: str({ default: 'https://apollo.mayohr.com' }),
})

export default env
