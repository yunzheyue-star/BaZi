import { describe, expect, it } from 'vitest'

import { dumpClocks } from './dump.probe'

describe('时钟探针自检', () => {
  it('dumpClocks 可用（真实断言在其它测试文件）', () => {
    expect(dumpClocks({}).bazi).toBe('戊子 己未 丁巳 乙巳')
  })
})
