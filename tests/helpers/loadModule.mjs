import { readFileSync } from 'node:fs'
import ts from 'typescript'

// Evaluate TypeScript modules locally with explicit doubles for external effects.
export function createModuleLoader(dependencies = {}) {
  const modules = new Map()
  function load(path) {
    if (modules.has(path)) return modules.get(path)
    const source = readFileSync(new URL(`../../src/${path}.ts`, import.meta.url), 'utf8')
    const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } })
    const exports = {}
    modules.set(path, exports)
    new Function('require', 'exports', outputText)((id) => {
      if (id in dependencies) return dependencies[id]
      if (id.startsWith('@/')) return load(id.slice(2))
      throw new Error(`Unexpected dependency ${id}`)
    }, exports)
    return exports
  }
  return load
}
