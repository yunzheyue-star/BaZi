import { describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { buildChart } from '../core/chart'
import { resolveRegion } from '../core/regions'
import { useChartStore } from '../stores/chart'
import type { ChartInput } from '../types/bazi'

/**
 * 真太阳时回归：2006-02-27 09:20 · 广西壮族自治区/崇左市/天等县
 *
 * 报告的现象：
 *   - 界面真太阳时显示 09:07，时柱乙巳
 *   - 期望：真太阳时 ≈ 08:16，时柱甲辰
 *
 * 核心事实：天等县经度 107.1424°E，偏离东经 120° 达 12.86°
 *   → 经度时差 (107.1424 − 120) × 4 = −51.43 分
 *   → 均时差 EoT(2006-02-27) ≈ −12.75 分
 *   → 合计 −64.18 分 → 09:20 − 64.18min = 08:16 → 辰时
 *   → 日柱丁亥（i_d = 3）→ i_h = (2×3 + 4) mod 10 = 0 → 甲 → 甲辰
 *
 * 而 09:07 只能由经度 ≈ 116.7°E（北京/河北）产生，说明经度未生效。
 */

const TIANDENG = resolveRegion('广西壮族自治区', '崇左市', '天等县')

function inputOf(overrides: Partial<ChartInput>): ChartInput {
  return {
    birthDatetime: '2006-02-27 09:20',
    gender: 'male',
    longitude: 107.1424,
    birthPlace: '广西壮族自治区 / 崇左市 / 天等县',
    timezone: 'Asia/Shanghai',
    dayBoundary: 'midnight',
    timeStandard: 'true_solar',
    ...overrides,
  }
}

describe('regions：天等县坐标', () => {
  it('能取到天等县，经度 107.1424°E', () => {
    expect(TIANDENG).toBeDefined()
    expect(TIANDENG!.county.name).toBe('天等县')
    expect(TIANDENG!.county.longitude).toBeCloseTo(107.1424, 4)
    expect(TIANDENG!.county.latitude).toBeCloseTo(23.0825, 4)
    expect(TIANDENG!.timezone).toBe('Asia/Shanghai')
  })
})

describe('core：2006-02-27 09:20 天等县的真太阳时与时柱', () => {
  const chart = buildChart(inputOf({}), { referenceYear: 2006 })

  it('经度时差 −51.43 分、均时差 ≈ −12.75 分、合计 ≈ −64.18 分', () => {
    expect(chart.trueSolarTime.longitudeDeltaMinutes).toBeCloseTo(-51.43, 2)
    expect(chart.trueSolarTime.equationOfTimeMinutes).toBeCloseTo(-12.75, 1)
    expect(chart.trueSolarTime.deltaMinutes).toBeCloseTo(-64.18, 1)
  })

  it('真太阳时 = 08:16（辰时），不是 09:07', () => {
    expect(chart.trueSolarTime.trueSolarHour).toBe(8)
    expect(chart.trueSolarTime.trueSolarMinute).toBe(16)
    // 时柱所用时间就是真太阳时
    expect([chart.trueSolarTime.hour, chart.trueSolarTime.minute]).toEqual([8, 16])
  })

  it('日柱为丁亥，时柱为甲辰', () => {
    expect(chart.pillars.day.ganzhi).toBe('丁亥')
    expect(chart.pillars.day.stemIndex).toBe(3) // 丁
    expect(chart.pillars.hour.branch).toBe('辰')
    expect(chart.pillars.hour.stem).toBe('甲')
    expect(chart.pillars.hour.ganzhi).toBe('甲辰')
  })

  it('若经度误用北京 116.4，真太阳时变为 08:53（接近直觉的「8点50多」，但仍属辰时）', () => {
    const beijingLon = buildChart(inputOf({ longitude: 116.4 }), { referenceYear: 2006 })
    expect([beijingLon.trueSolarTime.trueSolarHour, beijingLon.trueSolarTime.trueSolarMinute]).toEqual([
      8, 53,
    ])
    expect(beijingLon.trueSolarTime.longitudeDeltaMinutes).toBeCloseTo(-14.4, 2)
    // 08:53 仍在辰时，日干丁 → 时干甲，故时柱同为甲辰
    expect(beijingLon.pillars.hour.ganzhi).toBe('甲辰')
  })

  it('修复前的行为（只加 EoT、丢掉经度时差）会得到 09:07 —— 正是报告的错值', () => {
    // 该行为已修，此处以断言锁死「不可能再出现」：
    const chart = buildChart(inputOf({}), { referenceYear: 2006 })
    expect([chart.trueSolarTime.trueSolarHour, chart.trueSolarTime.trueSolarMinute]).not.toEqual([
      9, 7,
    ])
    // deltaMinutes 必须同时含经度时差与均时差
    expect(chart.trueSolarTime.deltaMinutes).toBeCloseTo(
      chart.trueSolarTime.longitudeDeltaMinutes + chart.trueSolarTime.equationOfTimeMinutes,
      1,
    )
  })

  it('平太阳时口径下为 09:20（巳时），时柱随之为乙巳 —— 这解释了界面上的乙巳', () => {
    const meanSolar = buildChart(inputOf({ timeStandard: 'standard' }), { referenceYear: 2006 })
    expect([meanSolar.trueSolarTime.hour, meanSolar.trueSolarTime.minute]).toEqual([9, 20])
    expect(meanSolar.pillars.hour.branch).toBe('巳')
    expect(meanSolar.pillars.hour.ganzhi).toBe('乙巳')
  })
})

describe('store：三级级联选址后经度必须写进 input', () => {
  it('选到天等县后 longitude = 107.1424，排盘得到甲辰', () => {
    setActivePinia(createPinia())
    const store = useChartStore()
    store.patchInput({
      birthDatetime: '2006-02-27 09:20',
      longitude: TIANDENG!.county.longitude,
      birthPlace: '广西壮族自治区 / 崇左市 / 天等县',
      timezone: TIANDENG!.timezone,
      timeStandard: 'true_solar',
    })
    store.calculate()
    expect(store.input.longitude).toBeCloseTo(107.1424, 4)
    expect(store.result?.pillars.hour.ganzhi).toBe('甲辰')
    expect(store.result?.bazi.endsWith('甲辰')).toBe(true)
  })
})
