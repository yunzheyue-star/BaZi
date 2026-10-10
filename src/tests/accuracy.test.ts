import { describe, expect, it } from 'vitest'

import { fromJulianDay, solarTermMoment } from '../core/calendar'
import { buildChart, timezoneOffsetMinutes } from '../core/chart'

/**
 * 节气精度回归测试
 *
 * 用公开的节气时刻（北京时间，分钟级）实测简化解析式（平黄经 + 中心差 + 摄动 + 光行差）
 * 的系统误差。实测六例落在 −6 ~ +10 分钟，故容差取 ±20 分钟：
 * 一旦有人改动 solarApparentLongitude / solarTermMoment 导致精度退化，这里会先红。
 *
 * 未计入 ΔT（TT − UT，2000 年前后约 +64 秒），量级 1 分钟，被容差覆盖。
 */
const CASES: { label: string; year: number; termIndex: number; beijing: string }[] = [
  { label: '2024 立春', year: 2024, termIndex: 0, beijing: '2024-02-04 16:27' },
  { label: '2024 惊蛰', year: 2024, termIndex: 1, beijing: '2024-03-05 10:23' },
  { label: '2008 立春', year: 2008, termIndex: 0, beijing: '2008-02-04 19:00' },
  { label: '2008 立秋', year: 2008, termIndex: 6, beijing: '2008-08-07 11:16' },
  { label: '2000 立春', year: 2000, termIndex: 0, beijing: '2000-02-04 20:40' },
  { label: '1984 立春', year: 1984, termIndex: 0, beijing: '1984-02-04 23:19' },
]

/** 计算值 − 参考值，单位分钟 */
function errorMinutes(c: (typeof CASES)[number]): number {
  const moment = solarTermMoment(c.year, c.termIndex)
  // 节气时刻以 UT 求解 → 加回东八区得到北京时间
  const dt = fromJulianDay(moment.jd + 8 / 24)
  const [datePart, timePart] = c.beijing.split(' ')
  const [ry, rmo, rda] = datePart!.split('-').map(Number)
  const [rh, rmi] = timePart!.split(':').map(Number)
  const ref = Date.UTC(ry!, rmo! - 1, rda!, rh!, rmi!)
  const got = Date.UTC(dt.year, dt.month - 1, dt.day, dt.hour, dt.minute)
  return (got - ref) / 60000
}

describe('calendar：节气精度回归', () => {
  for (const c of CASES) {
    it(`${c.label} 误差在 ±20 分钟内（参考 ${c.beijing} 北京时间）`, () => {
      const diff = errorMinutes(c)
      expect(Math.abs(diff)).toBeLessThanOrEqual(20)
    })
  }

  it('时区偏移反解正确（Asia/Shanghai = +480 分钟）', () => {
    const offset = timezoneOffsetMinutes(
      { year: 2008, month: 7, day: 16, hour: 10, minute: 33 },
      'Asia/Shanghai',
    )
    expect(offset).toBe(480)
  })

  it('非法时区名抛错', () => {
    expect(() =>
      timezoneOffsetMinutes(
        { year: 2008, month: 7, day: 16, hour: 10, minute: 33 },
        'Mars/Olympus',
      ),
    ).toThrowError()
  })

  it('2008-07-16 立秋：起运距节约 21.6 天', () => {
    const chart = buildChart(
      {
        birthDatetime: '2008-07-16 10:33',
        gender: 'male',
        longitude: 116.4,
        timezone: 'Asia/Shanghai',
        dayBoundary: 'midnight',
        trueSolarTime: true,
      },
      { referenceYear: 2008 },
    )
    expect(chart.solarTerm.nextTermName).toBe('立秋')
    expect(chart.solarTerm.daysToNextTerm).toBeGreaterThan(21)
    expect(chart.solarTerm.daysToNextTerm).toBeLessThan(22)
  })
})
