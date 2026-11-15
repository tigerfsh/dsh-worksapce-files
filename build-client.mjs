/**
 * Build the browser artifact from src/plugin.js plus the Rust→WASM fuzzy
 * module. The output is the plain `window.__ModuleLoader__.load` envelope the
 * DSH Web client expects; no runtime dependency is added to the profile.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const manifest = JSON.parse(readFileSync(join(here, 'package.json'), 'utf8'))
if (typeof manifest.name !== 'string' || manifest.name.length === 0) throw new Error('package.json has no package name')
const body = readFileSync(join(here, 'src/plugin.js'), 'utf8')
const fuzzy = readFileSync(join(here, 'rust/fuzzy/fuzzy.js'), 'utf8')
if (!body.includes('/* __FUZZY_MODULE__ */')) throw new Error('fuzzy marker is missing from src/plugin.js')
const withFuzzy = body.replace('/* __FUZZY_MODULE__ */', fuzzy)
const artifact = `/* Built by build-client.mjs. Source: src/plugin.js + rust/fuzzy/fuzzy.js. */
window.__ModuleLoader__.load({
  id: ${JSON.stringify(manifest.name)},
  factory(require) {
${withFuzzy}
  },
});
`
writeFileSync(join(here, 'client.js'), artifact)
console.log(`wrote client.js (${artifact.length} bytes) for ${manifest.name}`)
