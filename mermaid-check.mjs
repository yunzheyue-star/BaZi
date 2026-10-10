/**
 * 图表语法自检脚本（doc/ 下的 Mermaid 图）
 *
 * 用途：CI 或本地改动文档后，用 mermaid 官方解析器真跑一遍，避免只有渲染时才发现语法错。
 *
 * 用法：
 *   npm install mermaid --no-save --no-package-lock
 *   node mermaid-check.mjs
 *
 * 说明：
 * - mermaid 只在解析时需要 DOM（内部走 DOMPurify），Node 下缺 window 会抛
 *   "DOMPurify.addHook is not a function" —— 那是环境问题，不是语法问题，故此处用 jsdom 兜住。
 * - 该脚本不参与构建与测试（不在 vitest 的 include 内），也不需要把 mermaid 写进 package.json。
 */
import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  pretendToBeVisual: true,
  url: 'http://localhost/',
})
const { window } = dom
globalThis.window = window
globalThis.document = window.document
// Node 24 里 globalThis.navigator 是只读访问器，用 defineProperty 覆盖
Object.defineProperty(globalThis, 'navigator', {
  value: window.navigator,
  configurable: true,
  writable: true,
})
globalThis.DOMParser = window.DOMParser
globalThis.Node = window.Node
globalThis.Element = window.Element
globalThis.HTMLElement = window.HTMLElement
globalThis.SVGElement = window.SVGElement
globalThis.NodeFilter = window.NodeFilter

const { default: mermaid } = await import('mermaid')
mermaid.initialize({ startOnLoad: false, securityLevel: 'loose' })

const files = ['doc/bazi-call-graph.md', 'doc/bazi-api.md', 'doc/bazi-algorithm.md']

let total = 0
let failed = 0

for (const file of files) {
  const text = readFileSync(file, 'utf8')
  const blocks = [...text.matchAll(/```mermaid\n([\s\S]*?)```/g)]
  for (let i = 0; i < blocks.length; i += 1) {
    const code = blocks[i][1]
    total += 1
    const head = code.split('\n')[0].trim()
    try {
      await mermaid.parse(code)
      console.log(`OK   ${file} #${i + 1}  [${head}]`)
    } catch (error) {
      failed += 1
      console.log(`FAIL ${file} #${i + 1}  [${head}]`)
      console.log(String(error.message ?? error).split('\n').slice(0, 10).join('\n'))
    }
  }
}

console.log(`\n解析：${total - failed}/${total} 通过`)
process.exit(failed === 0 ? 0 : 1)
