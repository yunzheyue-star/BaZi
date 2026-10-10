/**
 * 十神（技能 §3.6）
 *
 * 以日干为「我」：
 *   w == w_d                 → 比肩 / 劫财
 *   w == (w_d + 1) % 5       → 食神 / 伤官
 *   w == (w_d + 2) % 5       → 偏财 / 正财
 *   w == (w_d + 3) % 5       → 七杀 / 正官
 *   w == (w_d + 4) % 5       → 偏印 / 正印
 * 其中同阴阳取前者，异阴阳取后者。
 */

import { GAN, TEN_GODS } from './constants'
import { ganWuXing, ganYinYang, hiddenStemIndexes, mod } from './ganzhi'
import type { GanIndex, ZhiIndex } from '../types/bazi'

/**
 * 单个天干对日干的十神。
 * @param dayStemIndex 日干索引（我）
 * @param targetStemIndex 目标天干索引
 */
export function tenGod(dayStemIndex: GanIndex, targetStemIndex: GanIndex): string {
  const wd = ganWuXing(dayStemIndex)
  const sd = ganYinYang(dayStemIndex)
  const w = ganWuXing(targetStemIndex)
  const s = ganYinYang(targetStemIndex)
  const same = s === sd

  const delta = mod(w - wd, 5)
  switch (delta) {
    case 0:
      return same ? TEN_GODS.same.same : TEN_GODS.same.diff
    case 1:
      return same ? TEN_GODS.output.same : TEN_GODS.output.diff
    case 2:
      return same ? TEN_GODS.wealth.same : TEN_GODS.wealth.diff
    case 3:
      return same ? TEN_GODS.officer.same : TEN_GODS.officer.diff
    case 4:
      return same ? TEN_GODS.resource.same : TEN_GODS.resource.diff
    default:
      throw new Error(`十神计算异常：五行差 delta=${delta} 越界（不应发生）`)
  }
}

/** 某柱天干（不含日干）的十神 */
export function stemTenGod(dayStemIndex: GanIndex, targetStemIndex: GanIndex): string {
  return tenGod(dayStemIndex, targetStemIndex)
}

/** 地支十神 = 藏干十神集合（按藏干顺序） */
export function branchTenGods(dayStemIndex: GanIndex, branchIndex: ZhiIndex): string[] {
  return hiddenStemIndexes(branchIndex).map((i) => tenGod(dayStemIndex, i))
}

/** 地支藏干及其十神（展示层更常用） */
export function branchHiddenGods(
  dayStemIndex: GanIndex,
  branchIndex: ZhiIndex,
): { stem: string; god: string }[] {
  return hiddenStemIndexes(branchIndex).map((i) => ({
    stem: GAN[i],
    god: tenGod(dayStemIndex, i),
  }))
}
