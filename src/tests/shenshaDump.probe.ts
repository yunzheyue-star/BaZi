/**
 * 神煞探针（非测试文件，vitest 不会收集）
 *
 * 用途：改动 shenshaMore.ts 后一眼看到某张盘每柱命中的神煞与判定依据。
 * 用法：临时改名为 shenshaDump.probe.test.ts 后
 *       `npx vitest run src/tests/shenshaDump.probe.test.ts`，跑完改回。
 */
import { buildChart } from '../core/chart'
import { shenshaByPillar } from '../core/shenshaMore'
import type { ChartInput } from '../types/bazi'

export function dumpShensha(birthDatetime: string, longitude: number, referenceYear = 2008) {
  const chart = buildChart(
    {
      birthDatetime,
      gender: 'male',
      longitude,
      timezone: 'Asia/Shanghai',
      dayBoundary: 'midnight',
      timeStandard: 'true_solar',
    } as ChartInput,
    { referenceYear },
  )
  const per = shenshaByPillar(chart.pillars, chart.pillars.day.stemIndex, chart.pillars.year.stemIndex)
  return { bazi: chart.bazi, byPillar: per.byPillar, hits: per.hits }
}
