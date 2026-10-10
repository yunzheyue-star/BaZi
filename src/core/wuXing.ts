/**
 * 五行计数
 *
 * 两种口径：
 * - `countWuXingMajor`：四柱**天干** + 四柱**地支本气**，各计 1，合计恒为 8
 * - `countWuXingAll`：天干 + 地支**全部藏干**（本气 + 中气 + 余气），合计 > 8
 *
 * 【历史 bug 留痕】
 * 早期实现在 store 里手写了一份「天干索引 → 五行」的数组，只遍历四柱天干，
 * 完全没有统计地支，于是「丙戌 庚寅 丁亥 甲辰」这种天干不含土/水的命盘
 * 会显示 0 土、0 水（实际应为 土 2、水 1），而界面标题却写着「天干 + 地支本气」。
 * 现在改为以 constants.ts 的 GAN_META / ZHI_META / ZHI_META.hiddenStemIndexes 为唯一数据源，
 * 不再手抄五行表，避免同类漂移。
 */

import { GAN_META, ZHI_META } from './constants'
import { hiddenStemIndexes } from './ganzhi'
import type { WuXingName } from './constants'
import type { Pillars, WuXingIndex } from '../types/bazi'
import { WU_XING } from './constants'

/** 五行计数表 */
export type CountWuXing = Record<WuXingName, number>

/** 四柱顺序 */
const PILLAR_KEYS = ['year', 'month', 'day', 'hour'] as const

/** 五行零值表 */
export function emptyWuXingTally(): CountWuXing {
  return { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 }
}

/** 五行索引 → 五行名（0 木 1 火 2 土 3 金 4 水） */
export function wuXingName(index: WuXingIndex): WuXingName {
  return WU_XING[index]!
}

/** 天干索引 → 五行名；索引越界返回 undefined（不抛错，便于容错统计） */
export function ganWuXingName(ganIndex: number): WuXingName | undefined {
  const meta = GAN_META[ganIndex]
  return meta ? meta.wuXing : undefined
}

/** 地支索引 → 五行名（本气） */
export function zhiWuXingName(zhiIndex: number): WuXingName | undefined {
  const meta = ZHI_META[zhiIndex]
  return meta ? meta.wuXing : undefined
}

/** 某柱天干与地支本气的五行名 */
export function pillarWuXing(pillar: { stemIndex: number; branchIndex: number }): {
  stem?: WuXingName
  branch?: WuXingName
} {
  return {
    stem: ganWuXingName(pillar.stemIndex),
    branch: zhiWuXingName(pillar.branchIndex),
  }
}

/**
 * 本气计数：天干 + 地支本气，各计 1（合计 8）
 *
 * 这是界面默认视图，也是八字里最常用的「数五行」口径。
 */
export function countWuXingMajor(pillars: Pillars): CountWuXing {
  const tally = emptyWuXingTally()
  for (const key of PILLAR_KEYS) {
    const { stem, branch } = pillarWuXing(pillars[key])
    if (stem) tally[stem] += 1
    if (branch) tally[branch] += 1
  }
  return tally
}

/**
 * 细算：天干 + 地支全部藏干
 *
 * 「未」这类藏三干的地支会一次性把 土/火/木 各计 1，因此合计大于 8。
 */
export function countWuXingAll(pillars: Pillars): CountWuXing {
  const tally = emptyWuXingTally()
  for (const key of PILLAR_KEYS) {
    const { stem } = pillarWuXing(pillars[key])
    if (stem) tally[stem] += 1
    for (const hidden of hiddenStemIndexes(pillars[key].branchIndex)) {
      const name = ganWuXingName(hidden)
      if (name) tally[name] += 1
    }
  }
  return tally
}

/** 计数表合计 */
export function wuXingTotal(tally: CountWuXing): number {
  return Object.values(tally).reduce((sum, n) => sum + n, 0)
}

/** 计数表 → 百分比（用于条形图；全零时返回全 0） */
export function wuXingPercents(tally: CountWuXing): CountWuXing {
  const total = wuXingTotal(tally)
  const result = emptyWuXingTally()
  if (total === 0) return result
  for (const name of WU_XING) {
    result[name] = Math.round((tally[name] / total) * 100)
  }
  return result
}
