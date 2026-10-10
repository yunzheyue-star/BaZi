/**
 * 五行计数探针（非测试文件，vitest 不会收集）
 *
 * 用途：改动 GAN_META / ZHI_META / wuXing.ts 之后，一眼看到真实计数值，
 *       避免手算出错（文档里的数字都来自这里）。
 * 用法：临时改名为 wuXing.probe.test.ts 后
 *       `npx vitest run src/tests/wuXing.probe.test.ts`，跑完改回。
 */
import { buildChart } from '../core/chart'
import { countWuXingAll, countWuXingMajor } from '../core/wuXing'

export function dumpWuXing(birthDatetime: string, timeStandard: 'true_solar' | 'standard') {
  const chart = buildChart(
    {
      birthDatetime,
      gender: 'male',
      longitude: 116.4,
      timezone: 'Asia/Shanghai',
      dayBoundary: 'midnight',
      timeStandard,
    },
    { referenceYear: 2008 },
  )
  return {
    bazi: chart.bazi,
    major: countWuXingMajor(chart.pillars),
    all: countWuXingAll(chart.pillars),
  }
}
