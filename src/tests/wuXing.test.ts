import { describe, expect, it } from 'vitest'

import { countWuXingAll, countWuXingMajor } from '../core/wuXing'
import type { CountWuXing } from '../core/wuXing'
import { buildChart } from '../core/chart'
import { makePillar } from '../core/ganzhi'
import type { GanIndex, Pillars, ZhiIndex } from '../types/bazi'

/**
 * 五行计数测试
 *
 * 回归背景：早期实现只统计四柱**天干**，漏掉地支，导致「丙戌 庚寅 丁亥 甲辰」
 * 这类天干不含土、水的命盘显示 0 土、0 水。本文件把该场景固定下来。
 *
 * 注意：makePillar 会拒绝「乙子」「甲丑」这类干支奇偶不一致的组合（六十甲子里不存在），
 * 所以按单干/单支遍历时只取「甲」「子」这类阳干阳支，保证组合合法。
 */

const GAN_NAMES = '甲乙丙丁戊己庚辛壬癸'
const ZHI_NAMES = '子丑寅卯辰巳午未申酉戌亥'

/** 按汉字干支直接构造 Pillars，便于用命盘原文写用例 */
function pillarsOf(...ganzhi: [string, string][]): Pillars {
  const keys = ['year', 'month', 'day', 'hour'] as const
  const stemIndex = (s: string) => GAN_NAMES.indexOf(s) as GanIndex
  const branchIndex = (b: string) => ZHI_NAMES.indexOf(b) as ZhiIndex
  const entries = ganzhi.map(([stem, branch]) => makePillar(stemIndex(stem), branchIndex(branch)))
  return { year: entries[0]!, month: entries[1]!, day: entries[2]!, hour: entries[3]! }
}

function chartOf(birthDatetime: string, timeStandard: 'true_solar' | 'standard' = 'standard') {
  return buildChart(
    {
      birthDatetime,
      gender: 'male',
      longitude: 116.4,
      timezone: 'Asia/Shanghai',
      dayBoundary: 'midnight',
      timeStandard,
    },
    { referenceYear: 2000 },
  )
}

describe('五行计数：丙戌 庚寅 丁亥 甲辰（用户报的 0 土 0 水 bug）', () => {
  const pillars = pillarsOf(['丙', '戌'], ['庚', '寅'], ['丁', '亥'], ['甲', '辰'])

  it('天干只有 丙庚丁甲（无土无水）—— 这正是旧版显示 0 土 0 水的原因', () => {
    const stems = [pillars.year.stem, pillars.month.stem, pillars.day.stem, pillars.hour.stem]
    expect(stems).toEqual(['丙', '庚', '丁', '甲'])
  })

  it('本气计数必须含地支：木 2 / 火 2 / 土 2 / 金 1 / 水 1（合计 8）', () => {
    const tally = countWuXingMajor(pillars)
    expect(tally).toEqual({ 木: 2, 火: 2, 土: 2, 金: 1, 水: 1 })
    // 土来自 戌、辰；水来自 亥 —— 旧实现在这三处全为 0
    expect(tally.土).toBe(2)
    expect(tally.水).toBe(1)
    expect(Object.values(tally).reduce((sum, n) => sum + n, 0)).toBe(8)
  })

  it('藏干细算：天干 + 地支全部藏干，合计 15', () => {
    // 藏干：戌(戊辛丁) 寅(甲丙戊) 亥(壬甲) 辰(戊乙癸) ＋ 天干 丙庚丁甲
    // 木：甲(干) 甲(寅) 甲(亥) 乙(辰) = 4
    // 火：丙(干) 丁(干) 丙(寅) 丁(戌) = 4
    // 土：戊(戌) 戊(寅) 戊(辰) = 3
    // 金：庚(干) 辛(戌) = 2
    // 水：壬(亥) 癸(辰) = 2
    expect(countWuXingAll(pillars)).toEqual({ 木: 4, 火: 4, 土: 3, 金: 2, 水: 2 })
  })

  it('两种视图的差异必须体现在地支藏干上，且细算恒不小于本气', () => {
    const major = countWuXingMajor(pillars)
    const all = countWuXingAll(pillars)
    for (const key of ['木', '火', '土', '金', '水'] as const) {
      expect(all[key]).toBeGreaterThanOrEqual(major[key])
    }
    expect(all.土 - major.土).toBe(1) // 辰 的余气
  })
})

describe('五行计数：与 buildChart 实际结果一致', () => {
  it('2008-07-16 10:33 男 → 戊子 己未 丁巳 乙巳', () => {
    const chart = buildChart(
      {
        birthDatetime: '2008-07-16 10:33',
        gender: 'male',
        longitude: 116.4,
        timezone: 'Asia/Shanghai',
        dayBoundary: 'midnight',
        timeStandard: 'true_solar',
      },
      { referenceYear: 2008 },
    )
    expect(chart.bazi).toBe('戊子 己未 丁巳 乙巳')
    // 天干：戊土 己土 丁火 乙木 ｜ 地支本气：子水 未土 巳火 巳火
    expect(countWuXingMajor(chart.pillars)).toEqual({ 木: 1, 火: 3, 土: 3, 金: 0, 水: 1 })
  })

  it('2000-01-01 00:00 男 → 己卯 丙子 戊午 壬子（土 2 水 3）', () => {
    const chart = chartOf('2000-01-01 00:00')
    expect(chart.bazi).toBe('己卯 丙子 戊午 壬子')
    // 天干：己土 丙火 戊土 壬水 ｜ 地支本气：卯木 子水 午火 子水
    const tally: CountWuXing = countWuXingMajor(chart.pillars)
    expect(tally).toEqual({ 木: 1, 火: 2, 土: 2, 金: 0, 水: 3 })
    // 旧实现会得到 土 2 水 1（漏了子、午两个地支）
    expect(tally.水).toBe(3)
  })
})

describe('五行计数：不依赖手抄的五行表', () => {
  it('单一阳干重复四柱时，元素计数 = 4（+ 与「子＝水」重合时的 4）', () => {
    const yangGanWuXing: [string, '木' | '火' | '土' | '金' | '水'][] = [
      ['甲', '木'],
      ['丙', '火'],
      ['戊', '土'],
      ['庚', '金'],
      ['壬', '水'],
    ]
    for (const [stem, element] of yangGanWuXing) {
      // 甲子 / 丙子 / 戊子 / 庚子 / 壬子 都是合法干支（阳干配阳支）
      const pillars = pillarsOf([stem, '子'], [stem, '子'], [stem, '子'], [stem, '子'])
      const tally = countWuXingMajor(pillars)
      // 壬子：天干壬与地支子同属水，故为 8
      const expected = element === '水' ? 8 : 4
      expect(tally[element], `${stem} 应属${element}`).toBe(expected)
      // 地支子恒为水：4 个
      expect(tally.水).toBeGreaterThanOrEqual(4)
      expect(Object.values(tally).reduce((sum, n) => sum + n, 0)).toBe(8)
    }
  })

  it('单一阳支重复四柱时，该支五行计数 ≥ 4（本气口径的关键回归）', () => {
    const yangZhiWuXing: [string, '木' | '火' | '土' | '金' | '水'][] = [
      ['子', '水'],
      ['寅', '木'],
      ['辰', '土'],
      ['午', '火'],
      ['申', '金'],
      ['戌', '土'],
    ]
    for (const [branch, element] of yangZhiWuXing) {
      // 甲子 / 甲寅 / 甲辰 / 甲午 / 甲申 / 甲戌 都是合法干支（阳干配阳支）
      const pillars = pillarsOf(['甲', branch], ['甲', branch], ['甲', branch], ['甲', branch])
      const tally = countWuXingMajor(pillars)
      // 甲寅：天干甲与地支寅同属木，故为 8
      const expected = element === '木' ? 8 : 4
      expect(tally[element], `${branch} 应属${element}`).toBe(expected)
      expect(tally.木, '甲为木').toBeGreaterThanOrEqual(4)
      expect(Object.values(tally).reduce((sum, n) => sum + n, 0)).toBe(8)
    }
  })
})
