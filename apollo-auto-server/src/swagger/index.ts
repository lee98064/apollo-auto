import fs from "node:fs"
import path from "node:path"
import YAML from "yaml"

const OPEN_API_SPEC_PATH = path.join(__dirname, "openapi.yaml")

export function getOpenApiSpecPath(): string {
  return OPEN_API_SPEC_PATH
}

export function loadOpenApiDocument(): unknown {
  const fileContents = fs.readFileSync(OPEN_API_SPEC_PATH, "utf-8")
  return YAML.parse(fileContents)
}
