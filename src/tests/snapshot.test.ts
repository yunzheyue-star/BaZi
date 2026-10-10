import { describe, expect, it } from 'vitest'

import { buildChart } from '../core/chart'
import { countWuXingMajor } from '../core/wuXing'
import type { ChartResult } from '../types/bazi'

/**
 * 文档算例回归测试
 *
 * doc/bazi-algorithm.md §15 逐步骤写明了 2008-07-16 10:33 男的每一个中间量，
 * doc/bazi-api.md §9.1 约定了 steps 的七项契约。这些数值一旦漂移，
 * 文档就与实现不符 —— 本文件把文档里出现的关键数字全部钉住。
 */

function chartOf(birthDatetime: string): ChartResult {
  return buildChart(
    {
      birthDatetime,
      gender: 'male',
      longitude: 116.4,
      timezone: 'Asia/Shanghai',
      dayBoundary: 'midnight',
      timeStandard: 'true_solar',
    },
    { referenceYear: 2008 },
  )
}

function stepOutput(result: ChartResult, name: string): Record<string, unknown> {
  const step = result.steps.find((s) => s.name === name)
  expect(step, `缺少 step: ${name}`).toBeDefined()
  return step!.output as Record<string, unknown>
}

describe('doc/bazi-algorithm.md §15 算例：2008-07-16 10:33 男', () => {
  const result = chartOf('2008-07-16 10:33')

  it('① 真太阳时：北京时间 10:33 + 均时差 −6.08 = 10:27；经度仅作展示', () => {
    expect(result.trueSolarTime.equationOfTimeMinutes).toBeCloseTo(-6.08, 2)
    expect(result.trueSolarTime.deltaMinutes).toBeCloseTo(-6.08, 2)
    expect(result.trueSolarTime.longitudeDeltaMinutes).toBeCloseTo(-14.4, 2)
    expect([result.trueSolarTime.standardHour, result.trueSolarTime.standardMinute]).toEqual([10, 33])
    expect(result.trueSolarTime.hour).toBe(10)
    expect(result.trueSolarTime.minute).toBe(27)
  })

  it('② 年柱：命理年 2008，k_y = 24，戊子（阳年干）', () => {
    const out = stepOutput(result, 'yearPillar')
    expect(out.metaphysicalYear).toBe(2008)
    expect(out.k_y).toBe(24)
    expect(out.ganzhi).toBe('戊子')
    expect(out.yinYang).toBe('阳')
  })

  it('③ 月柱：λ ≈ 113.94°，月令 6（未月），k_m = 55，己未', () => {
    expect(result.solarTerm.lambda).toBeCloseTo(113.9414, 3)
    expect(result.solarTerm.monthOrder).toBe(6)
    expect(result.solarTerm.termName).toBe('小暑')
    expect(result.solarTerm.nextTermName).toBe('立秋')
    const out = stepOutput(result, 'monthPillar')
    expect(out.degreesIntoTerm).toBeCloseTo(8.9414, 3)
    expect(out.k_m).toBe(55)
    expect(out.ganzhi).toBe('己未')
  })

  it('④ 日柱：JDN = 2454664，k_d = 53，丁巳', () => {
    const out = stepOutput(result, 'dayPillar')
    expect(out.usedCivilDate).toBe('2008-07-16')
    expect(out.JDN).toBe(2454664)
    expect(out.k_d).toBe(53)
    expect(out.i_d).toBe(3)
    expect(out.j_d).toBe(5)
    expect(out.ganzhi).toBe('丁巳')
  })

  it('⑤ 时柱：巳时，k_h = 41，乙巳', () => {
    const out = stepOutput(result, 'hourPillar')
    expect(out.shiChen).toBe('巳时')
    expect(out.j_h).toBe(5)
    expect(out.i_h).toBe(1)
    expect(out.k_h).toBe(41)
    expect(out.ganzhi).toBe('乙巳')
  })

  it('⑥ 藏干与十神', () => {
    expect(result.hiddenStems).toEqual({
      year: ['癸'],
      month: ['己', '丁', '乙'],
      day: ['丙', '庚', '戊'],
      hour: ['丙', '庚', '戊'],
    })
    expect(result.tenGods.yearStem).toBe('伤官')
    expect(result.tenGods.monthStem).toBe('食神')
    expect(result.tenGods.dayStem).toBe('日主')
    expect(result.tenGods.hourStem).toBe('偏印')
    expect(result.tenGods.branches).toEqual({
      year: ['七杀'],
      month: ['食神', '比肩', '偏印'],
      day: ['劫财', '正财', '伤官'],
      hour: ['劫财', '正财', '伤官'],
    })
  })

  it('⑦ 大运：顺排，距立秋 21.37 天，起运 7.12 岁（进位 8），首步庚申', () => {
    const out = stepOutput(result, 'luckCycles')
    expect(out.direction).toBe('顺排')
    expect(out.directionReason).toBe('阳年干 + 男')
    expect(out.daysToJie).toBeCloseTo(21.37, 2)
    expect(out.startAgeExact).toBeCloseTo(7.1218, 4)
    expect(out.startAge).toBe(8)
    expect(result.luckCycles[0]!.ganzhi).toBe('庚申')
    expect(result.luckCycles[0]!.ageRange).toBe('8–17 岁')
    expect(result.luckCycles[1]!.ganzhi).toBe('辛酉')
    expect(result.luckCycles).toHaveLength(10)
  })

  it('⑧ 流年：自 2008 起，首年戊子 / 伤官', () => {
    expect(result.annualFortunes[0]).toMatchObject({
      year: 2008,
      k: 24,
      ganzhi: '戊子',
      stemTenGod: '伤官',
      branchRelation: '无',
      age: 1,
    })
    expect(result.annualFortunes).toHaveLength(10)
  })

  it('⑨ 神煞：仅天乙贵人命中（月支未）', () => {
    expect(result.shensha.hits.map((h) => h.name)).toEqual(['天乙贵人'])
    expect(result.shensha.hits[0]!.branches).toEqual(['未'])
    expect(result.shensha.flags).toEqual({
      天乙贵人: true,
      桃花: false,
      驿马: false,
      华盖: false,
      羊刃: false,
    })
  })

  it('⑩ 四柱与 steps 契约', () => {
    expect(result.bazi).toBe('戊子 己未 丁巳 乙巳')
    expect(result.steps.map((s) => s.name)).toEqual([
      'trueSolarTime',
      'yearPillar',
      'monthPillar',
      'dayPillar',
      'hourPillar',
      'tenGods',
      'luckCycles',
    ])
  })

  it('⑪ 五行计数（天干 + 地支本气）与文档一致：木1 火3 土3 金0 水1', () => {
    expect(countWuXingMajor(result.pillars)).toEqual({ 木: 1, 火: 3, 土: 3, 金: 0, 水: 1 })
  })
})

describe('doc/bazi-algorithm.md §13.2 换日流派差异形态', () => {
  it('1984-02-04 23:30：midnight 日柱戊辰/时柱壬子，zi_hour 日柱己巳/时柱甲子', () => {
    const base = {
      birthDatetime: '1984-02-04 23:30',
      gender: 'male' as const,
      longitude: 116.4,
      timezone: 'Asia/Shanghai',
      timeStandard: 'true_solar' as const,
    }
    const midnight = buildChart({ ...base, dayBoundary: 'midnight' }, { referenceYear: 1984 })
    const ziHour = buildChart({ ...base, dayBoundary: 'zi_hour' }, { referenceYear: 1984 })

    expect(midnight.pillars.day.ganzhi).toBe('戊辰')
    expect(midnight.pillars.hour.ganzhi).toBe('壬子')
    expect(ziHour.pillars.day.ganzhi).toBe('己巳')
    expect(ziHour.pillars.hour.ganzhi).toBe('甲子')
    // 时支不变，只有日干进位导致时干重排
    expect(ziHour.pillars.hour.branch).toBe(midnight.pillars.hour.branch)
  })
})
