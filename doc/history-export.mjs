/**
 * 导出会话历史：DSH 会话记录 → doc/history-archive.md
 *
 * 用途：把用户每一次需求的**原文**落盘到仓库，避免「上下文只活在对话里」。
 *
 * 用法：
 *     node doc/history-export.mjs
 *
 * 输入（DSH 会话记录，位于用户目录，不在仓库内）：
 *     ~/.dsh/sessions/--<工作区名>--/<session-id>/session.v4.jsonl.zstd
 *
 * 【格式踩坑记录】该文件是「约 3600 个独立 zstd 帧顺序拼接」，每帧一条 JSON 记录。
 *   - zstdDecompressSync(整个文件) 只解**首帧**，于是只能拿到 1 条记录；
 *   - 流式 createZstdDecompress 会在帧边界抛 ZSTD_error_prefix_unknown；
 *   - 正确做法：逐帧推进 —— 从帧魔数 28 B5 2F FD 开始，
 *     用**输出长度是否等于首帧长度**做判据二分收敛出帧尾
 *     （注意「能解码」不等于「只含一帧」，zstd 会忽略尾部多余字节）。
 *
 * 过滤规则：会话里混有非人类输入，需剔除——
 *   Current runtime context… / <system-reminder>… / The approval policy changed… /
 *   background job … finished …
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { zstdDecompressSync } from 'node:zlib'

/* ------------------------------------------------------------------ *
 * 1. 找到会话文件
 * ------------------------------------------------------------------ */

const sessionsRoot = join(homedir(), '.dsh', 'sessions')

/** 工作区名会把路径里的分隔符与冒号替换成中划线，这里按需匹配 */
function findSessionFile() {
  if (!existsSync(sessionsRoot)) return null
  const dirs = readdirSync(sessionsRoot, { withFileTypes: true }).filter((d) => d.isDirectory())
  for (const dir of dirs) {
    const subs = readdirSync(join(sessionsRoot, dir.name), { withFileTypes: true }).filter((d) =>
      d.isDirectory(),
    )
    for (const sub of subs) {
      const candidate = join(sessionsRoot, dir.name, sub.name, 'session.v4.jsonl.zstd')
      if (existsSync(candidate)) return candidate
    }
  }
  return null
}

const sessionFile = process.argv[2] ?? findSessionFile()
if (!sessionFile || !existsSync(sessionFile)) {
  console.error('未找到会话文件。用法：node doc/history-export.mjs [session.v4.jsonl.zstd]')
  process.exit(1)
}
console.log('会话文件:', sessionFile)

/* ------------------------------------------------------------------ *
 * 2. 逐帧解码
 * ------------------------------------------------------------------ */

const buf = readFileSync(sessionFile)
const MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd])
const MAX_OUT = 64 * 1024 * 1024

function tryDecode(start, end) {
  if (end <= start) return null
  try {
    return zstdDecompressSync(buf.subarray(start, end), { maxOutputLength: MAX_OUT }).toString('utf8')
  } catch {
    return null
  }
}

/** 二分找帧尾：判据是「输出长度等于该帧应有的长度」 */
function findFrameEnd(start) {
  const baseline = tryDecode(start, buf.length)
  if (baseline === null) return null
  const wantLen = Buffer.byteLength(baseline, 'utf8')

  let lo = start + 4
  let hi = buf.length
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1
    const out = tryDecode(start, mid)
    if (out !== null && Buffer.byteLength(out, 'utf8') === wantLen) hi = mid
    else lo = mid
  }
  const text = tryDecode(start, hi)
  if (text === null || Buffer.byteLength(text, 'utf8') !== wantLen) return null
  return { end: hi, text }
}

const records = []
let offset = 0
let frames = 0
while (offset < buf.length) {
  const at = buf.indexOf(MAGIC, offset)
  if (at === -1) break
  const res = findFrameEnd(at)
  if (!res) {
    offset = at + 4
    continue
  }
  frames += 1
  for (const line of res.text.split('\n')) {
    const t = line.trim()
    if (!t) continue
    try {
      records.push(JSON.parse(t))
    } catch {
      /* 跳过坏行 */
    }
  }
  offset = res.end
}
records.sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))
console.log(`解码 ${frames} 帧 → ${records.length} 条记录`)

/* ------------------------------------------------------------------ *
 * 3. 提取人类消息并写出归档
 * ------------------------------------------------------------------ */

const SYSTEM_PREFIXES = [
  'Current runtime context',
  '<system-reminder>',
  'The approval policy changed',
  'background job ',
]

function renderContent(content) {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  const parts = []
  for (const c of content) {
    if (typeof c === 'string') parts.push(c)
    else if (c?.type === 'text' && c.text) parts.push(c.text)
    else if (c?.type) parts.push(`〔附件: ${c.type}〕`)
  }
  return parts.join('\n')
}

const isSystem = (t) => SYSTEM_PREFIXES.some((p) => t.trim().startsWith(p))
const fmt = (ms) => (ms ? new Date(ms).toISOString().replace('T', ' ').slice(0, 19) : '?')

const humans = []
for (const r of records) {
  if (r.type !== 'user/message') continue
  const text = renderContent(r.data?.content).replace(/\r\n/g, '\n').trim()
  if (!text || isSystem(text)) continue
  humans.push({ seq: r.seq, time: r.time, text })
}

const out = []
out.push('# 需求原始记录（全文归档）')
out.push('')
out.push('> 本文件由 `doc/history-export.mjs` 自动生成，保留用户每一次需求的**原文**，')
out.push('> 作为设计决策的最终依据。整理后的解读见 [history.md](./history.md)。')
out.push('>')
out.push('> 已过滤：运行时快照、技能目录、审批策略变更、后台任务通知等非人类输入。')
out.push('')
out.push(`共 ${humans.length} 条，时间为 UTC（会话时区 Asia/Shanghai）。`)
out.push('')

humans.forEach((h, i) => {
  out.push(`## 第 ${i + 1} 条 · ${fmt(h.time)} · seq ${h.seq}`)
  out.push('')
  out.push('```text')
  out.push(h.text)
  out.push('```')
  out.push('')
})

const outFile = 'doc/history-archive.md'
writeFileSync(outFile, out.join('\n'), 'utf8')
console.log(`已写出 ${outFile}（${humans.length} 条人类消息）`)
humans.forEach((h, i) => {
  const first = h.text.split('\n').filter((l) => l.trim())[0] ?? ''
  console.log(`  ${String(i + 1).padStart(2)}. ${first.slice(0, 62)}`)
})
