import JobManager from 'jobManager'
import cors from 'cors'
import express from 'express'
import { middleware as openApiValidator } from 'express-openapi-validator'
import swaggerUi from 'swagger-ui-express'
import { errorHandler } from './middleware/errorHandler'
import routes from './routes'
import { getOpenApiSpecPath, loadOpenApiDocument } from './swagger'

const app = express()

app.use(
  cors({
    origin: '*',
    credentials: true,
  })
)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const openApiDocument = loadOpenApiDocument()

app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument))

app.use(
  openApiValidator({
    apiSpec: getOpenApiSpecPath(),
    validateRequests: true,
    validateResponses: false,
  })
)

Object.values(routes).forEach((route) => {
  app.use('/api', route)
})

app.use(errorHandler.handleError)

new JobManager()
app.listen(process.env.PORT || 5566)

console.log(
  `[Apollo-Server] Server is running on port ${process.env.PORT || 5566}`
)
console.log(`[Apollo-Server] http://localhost:${process.env.PORT || 5566}/api`)
console.log(`[Apollo-Server] http://localhost:${process.env.PORT || 5566}/docs`)
