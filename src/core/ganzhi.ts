/**
 * 六十甲子：编码、解码、CRT（中国剩余定理）
 *
 * 技能 §2.3：
 *   k ∈ [0, 59]，i = k mod 10，j = k mod 12
 *   反解：k = CRT(i, j; 10, 12)，要求 i ≡ j (mod 2)
 *
 * 本文件所有函数均为纯函数，无 I/O、无随机、无时钟依赖。
 */

import { GAN, GAN_META, WU_XING, ZHI, ZHI_META } from './constants'
import type { GanIndex, GanzhiK, Pillar, WuXingIndex, YinYang, ZhiIndex } from '../types/bazi'

/** 真模：结果恒为非负，js 的 % 对负数会返回负值 */
export function mod(n: number, m: number): number {
  return ((n % m) + m) % m
}

/** 六十甲子周期 */
export const CYCLE = 60

/** 天干周期 */
export const GAN_SIZE = 10

/** 地支周期 */
export const ZHI_SIZE = 12

/** 类型守卫：天干索引是否合法 */
export function isGanIndex(value: number): value is GanIndex {
  return Number.isInteger(value) && value >= 0 && value < GAN_SIZE
}

/** 类型守卫：地支索引是否合法 */
export function isZhiIndex(value: number): value is ZhiIndex {
  return Number.isInteger(value) && value >= 0 && value < ZHI_SIZE
}

/**
 * CRT(i, j; 10, 12)：已知干索引与支索引反解 k。
 *
 * 推导：k ≡ i (mod 10) 且 k ≡ j (mod 12)。
 * 令 k = i + 10t，代入第二式得 10t ≡ j - i (mod 12)，
 * 即 5t ≡ (j - i)/2 (mod 6)，5 在 mod 6 下的逆元为 5，
 * 故 t ≡ 5·(j - i)/2 (mod 6)，取 k = mod(i + 10t, 60)。
 *
 * @throws 当 i 与 j 奇偶性不一致（这样的干支组合不存在于六十甲子中）
 */
export function crt(stemIndex: GanIndex, branchIndex: ZhiIndex): GanzhiK {
  if (mod(stemIndex, 2) !== mod(branchIndex, 2)) {
    throw new Error(
      `CRT 无解：天干索引 ${stemIndex} 与地支索引 ${branchIndex} 奇偶性不一致，该组合不属于六十甲子`,
    )
  }
  const t = mod((5 * (branchIndex - stemIndex)) / 2, 6)
  return mod(stemIndex + 10 * t, CYCLE)
}

export interface GanzhiParts {
  k: GanzhiK
  stemIndex: GanIndex
  branchIndex: ZhiIndex
  stem: string
  branch: string
  ganzhi: string
  yinYang: YinYang
  wuXingIndex: WuXingIndex
  wuXing: string
}

/** k → 干支明细（技能 §2.3） */
export function decodeGanzhi(k: GanzhiK): GanzhiParts {
  const kk = mod(k, CYCLE)
  const stemIndex = mod(kk, GAN_SIZE) as GanIndex
  const branchIndex = mod(kk, ZHI_SIZE) as ZhiIndex
  const meta = GAN_META[stemIndex]!
  return {
    k: kk,
    stemIndex,
    branchIndex,
    stem: GAN[stemIndex],
    branch: ZHI[branchIndex],
    ganzhi: `${GAN[stemIndex]}${ZHI[branchIndex]}`,
    yinYang: meta.yinYang,
    wuXingIndex: meta.wuXingIndex,
    wuXing: WU_XING[meta.wuXingIndex],
  }
}

/** 由干、支索引构造一柱 */
export function makePillar(stemIndex: GanIndex, branchIndex: ZhiIndex): Pillar {
  const k = crt(stemIndex, branchIndex)
  return {
    k,
    stemIndex,
    branchIndex,
    stem: GAN[stemIndex],
    branch: ZHI[branchIndex],
    ganzhi: `${GAN[stemIndex]}${ZHI[branchIndex]}`,
  }
}

/** 由六十甲子序号构造一柱 */
export function pillarFromK(k: GanzhiK): Pillar {
  const parts = decodeGanzhi(k)
  return {
    k: parts.k,
    stemIndex: parts.stemIndex,
    branchIndex: parts.branchIndex,
    stem: parts.stem,
    branch: parts.branch,
    ganzhi: parts.ganzhi,
  }
}

/** 六十甲子全表 */
export const SIXTY_JIAZI: readonly string[] = Array.from(
  { length: CYCLE },
  (_, k) => decodeGanzhi(k).ganzhi,
)

/* ------------------------------------------------------------------ *
 * 常用派生量
 * ------------------------------------------------------------------ */

/** 天干五行索引：w = i // 2 */
export function ganWuXing(i: GanIndex): WuXingIndex {
  return Math.floor(i / 2) as WuXingIndex
}

/** 天干阴阳：s = i % 2 */
export function ganYinYang(i: GanIndex): YinYang {
  return (i % 2) as YinYang
}

/** 地支藏干索引 */
export function hiddenStemIndexes(j: ZhiIndex): readonly GanIndex[] {
  return ZHI_META[j]!.hiddenStemIndexes
}

/** 地支藏干汉字 */
export function hiddenStems(j: ZhiIndex): string[] {
  return hiddenStemIndexes(j).map((i) => GAN[i])
}
