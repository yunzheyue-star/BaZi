import { describe, expect, it } from 'vitest'

import { dumpShensha } from './shenshaDump.probe'

describe('神煞探针自检', () => {
  it('dumpShensha 可用（真实断言在 shensha.test.ts）', () => {
    const r = dumpShensha('2006-02-27 09:20', 107.1424, 2006)
    expect(r.bazi).toBe('丙戌 庚寅 丁亥 甲辰')
    expect(r.byPillar.day).toContain('十恶大败')
  })
})
