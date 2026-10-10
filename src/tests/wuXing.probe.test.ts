/**
 * 此文件是误建的重名探针（带 .test 后缀会被 vitest 收集）。
 * 实际探针见同目录的 wuXing.probe.ts。
 *
 * 保留一个最小可运行的用例，避免 vitest 报「No test suite found」。
 */
import { describe, expect, it } from 'vitest'

import { dumpWuXing } from './wuXing.probe'

describe('五行探针自检', () => {
  it('dumpWuXing 可用（真实断言在 wuXing.test.ts）', () => {
    const result = dumpWuXing('2008-07-16 10:33', 'true_solar')
    expect(result.bazi).toBe('戊子 己未 丁巳 乙巳')
    expect(result.major).toEqual({ 木: 1, 火: 3, 土: 3, 金: 0, 水: 1 })
  })
})
