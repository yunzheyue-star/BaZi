/**
 * 数值快照探针（非测试文件，vitest 不会收集）
 *
 * 用途：写文档或排查差异时，把 buildChart 的全部中间量打成 JSON 直接读，
 *       避免手算出错。用法：临时改名为 snapshot.probe.test.ts 后
 *       `npx vitest run src/tests/snapshot.probe.test.ts`，跑完改回。
 *
 * 平时保持本文件名（无 .test），因此不参与 npm run test:unit。
 */
import { buildChart } from '../core/chart'

export function dumpChart(birthDatetime: string, dayBoundary: 'midnight' | 'zi_hour' = 'midnight') {
  return buildChart(
    {
      birthDatetime,
      gender: 'male',
      longitude: 116.4,
      timezone: 'Asia/Shanghai',
      dayBoundary,
      trueSolarTime: true,
    },
    { referenceYear: 2008 },
  )
}
