/**
 * 数值快照探针（非测试文件，vitest 不会收集）
 *
 * 用途：改动 core 后一眼看到各口径的真实时钟与四柱，避免手算出错。
 * 用法：临时改名为 dump.probe.test.ts 后
 *       `npx vitest run src/tests/dump.probe.test.ts`，跑完改回。
 */
import { buildChart } from '../core/chart'
import type { ChartInput } from '../types/bazi'

export function dumpClocks(overrides: Partial<ChartInput>) {
  const chart = buildChart(
    {
      birthDatetime: '2008-07-16 10:33',
      gender: 'male',
      longitude: 116.4,
      birthPlace: '北京',
      timezone: 'Asia/Shanghai',
      dayBoundary: 'midnight',
      timeStandard: 'true_solar',
      ...overrides,
    } as ChartInput,
    { referenceYear: 2008 },
  )
  const t = chart.trueSolarTime
  return {
    bazi: chart.bazi,
    standardClock: `${String(t.standardHour).padStart(2, '0')}:${String(t.standardMinute).padStart(2, '0')}`,
    trueSolarClock: `${String(t.trueSolarHour).padStart(2, '0')}:${String(t.trueSolarMinute).padStart(2, '0')}`,
    longitudeDelta: t.longitudeDeltaMinutes,
    eot: t.equationOfTimeMinutes,
    delta: t.deltaMinutes,
    usedClock: `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`,
  }
}
