import { cleanEnv, str } from 'envalid'

const env = cleanEnv(process.env, {
  JWT_SECRET: str({}),
  JWT_ACCESS_TTL: str({ default: '365d' }),
  CHECK_IN_JOB_SCHEDULE: str({ default: '*/1 * * * * *' }),
})

export default env
