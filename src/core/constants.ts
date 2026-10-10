/**
 * 查表数据：天干、地支、藏干、五行、节气、神煞
 *
 * 本文件只放「数据 + 纯查表函数」，不含任何算法分支。
 * 数据来源：doc/bazi-chart-calculator.skill.md §2、§3.9
 */

import type { GanIndex, WuXingIndex, YinYang, ZhiIndex } from '../types/bazi'

/* ------------------------------------------------------------------ *
 * 天干（技能 §2.1）
 * ------------------------------------------------------------------ */

export const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const
export type GanName = (typeof GAN)[number]

/* ------------------------------------------------------------------ *
 * 地支（技能 §2.2）
 * ------------------------------------------------------------------ */

export const ZHI = [
  '子',
  '丑',
  '寅',
  '卯',
  '辰',
  '巳',
  '午',
  '未',
  '申',
  '酉',
  '戌',
  '亥',
] as const
export type ZhiName = (typeof ZHI)[number]

/* ------------------------------------------------------------------ *
 * 五行（技能 §2.1）
 * ------------------------------------------------------------------ */

export const WU_XING = ['木', '火', '土', '金', '水'] as const
export type WuXingName = (typeof WU_XING)[number]

/** 五行颜色，仅供展示层使用（core 不消费） */
export const WU_XING_COLOR: Record<WuXingName, string> = {
  木: '#2f9e6f',
  火: '#d9414a',
  土: '#a9762f',
  金: '#c2a13a',
  水: '#3a6fbf',
}

/** 生：(w + 1) % 5 */
export function generate(w: WuXingIndex): WuXingIndex {
  return ((w + 1) % 5) as WuXingIndex
}

/** 克：(w + 2) % 5 */
export function overcome(w: WuXingIndex): WuXingIndex {
  return ((w + 2) % 5) as WuXingIndex
}

export interface GanMeta {
  name: GanName
  wuXingIndex: WuXingIndex
  wuXing: WuXingName
  yinYang: YinYang
}

/** 天干元数据：w(i) = i // 2，s(i) = i % 2 */
export const GAN_META: readonly GanMeta[] = GAN.map((name, i) => {
  const wuXingIndex = Math.floor(i / 2) as WuXingIndex
  return {
    name,
    wuXingIndex,
    wuXing: WU_XING[wuXingIndex],
    yinYang: (i % 2) as YinYang,
  }
})

export interface ZhiMeta {
  name: ZhiName
  /** 地支五行（按本气） */
  wuXing: WuXingName
  /** 藏干索引，按「本气 → 中气 → 余气」排列（技能 §2.2） */
  hiddenStemIndexes: readonly GanIndex[]
}

export const ZHI_META: readonly ZhiMeta[] = [
  { name: '子', wuXing: '水', hiddenStemIndexes: [9] }, //        癸
  { name: '丑', wuXing: '土', hiddenStemIndexes: [5, 9, 7] }, //  己 癸 辛
  { name: '寅', wuXing: '木', hiddenStemIndexes: [0, 2, 4] }, //  甲 丙 戊
  { name: '卯', wuXing: '木', hiddenStemIndexes: [1] }, //        乙
  { name: '辰', wuXing: '土', hiddenStemIndexes: [4, 1, 9] }, //  戊 乙 癸
  { name: '巳', wuXing: '火', hiddenStemIndexes: [2, 6, 4] }, //  丙 庚 戊
  { name: '午', wuXing: '火', hiddenStemIndexes: [3, 5] }, //     丁 己
  { name: '未', wuXing: '土', hiddenStemIndexes: [5, 3, 1] }, //  己 丁 乙
  { name: '申', wuXing: '金', hiddenStemIndexes: [6, 8, 4] }, //  庚 壬 戊
  { name: '酉', wuXing: '金', hiddenStemIndexes: [7] }, //        辛
  { name: '戌', wuXing: '土', hiddenStemIndexes: [4, 7, 3] }, //  戊 辛 丁
  { name: '亥', wuXing: '水', hiddenStemIndexes: [8, 0] }, //     壬 甲
]

/** 由汉字取五行（展示层用，避免组件再抄一份表） */
export const GAN_WU_XING_BY_NAME: Record<GanName, WuXingName> = GAN_META.reduce(
  (acc, meta) => {
    acc[meta.name] = meta.wuXing
    return acc
  },
  {} as Record<GanName, WuXingName>,
)

export const ZHI_WU_XING_BY_NAME: Record<ZhiName, WuXingName> = ZHI_META.reduce(
  (acc, meta) => {
    acc[meta.name] = meta.wuXing
    return acc
  },
  {} as Record<ZhiName, WuXingName>,
)

/** 天干 / 地支汉字 → 五行颜色（展示层） */
export const GAN_COLOR: Record<GanName, string> = GAN_META.reduce(
  (acc, meta) => {
    acc[meta.name] = WU_XING_COLOR[meta.wuXing]
    return acc
  },
  {} as Record<GanName, string>,
)

export const ZHI_COLOR: Record<ZhiName, string> = ZHI_META.reduce(
  (acc, meta) => {
    acc[meta.name] = WU_XING_COLOR[meta.wuXing]
    return acc
  },
  {} as Record<ZhiName, string>,
)

/* ------------------------------------------------------------------ *
 * 十神（技能 §3.6）
 * ------------------------------------------------------------------ */

export const TEN_GODS = {
  same: { same: '比肩', diff: '劫财' },
  output: { same: '食神', diff: '伤官' },
  wealth: { same: '偏财', diff: '正财' },
  officer: { same: '七杀', diff: '正官' },
  resource: { same: '偏印', diff: '正印' },
} as const

/* ------------------------------------------------------------------ *
 * 节气（技能 §3.3）
 * ------------------------------------------------------------------ */

/** 十二「节」名称，索引 0 = 立春（太阳黄经 315°），每节 +30° */
export const JIE_NAMES = [
  '立春',
  '惊蛰',
  '清明',
  '立夏',
  '芒种',
  '小暑',
  '立秋',
  '白露',
  '寒露',
  '立冬',
  '大雪',
  '小寒',
] as const
export type JieName = (typeof JIE_NAMES)[number]

/** 立春对应的太阳黄经（度） */
export const LICHUN_LAMBDA = 315

/** 每节跨度的黄经（度） */
export const TERM_SPAN = 30

/** 节序号（0 = 立春）→ 起始太阳黄经 */
export function termStartLambda(termIndex: number): number {
  return (LICHUN_LAMBDA + TERM_SPAN * termIndex) % 360
}

/* ------------------------------------------------------------------ *
 * 神煞（技能 §3.9，通用版）
 * ------------------------------------------------------------------ */

/** 天乙贵人：日干/年干 → 地支 */
export const TIAN_YI_GUI_REN: readonly (readonly ZhiIndex[])[] = [
  [1, 7], // 甲 → 丑 未
  [0, 8], // 乙 → 子 申
  [11, 9], // 丙 → 亥 酉
  [11, 9], // 丁 → 亥 酉
  [1, 7], // 戊 → 丑 未
  [0, 8], // 己 → 子 申
  [1, 7], // 庚 → 丑 未
  [2, 6], // 辛 → 寅 午
  [3, 5], // 壬 → 卯 巳
  [3, 5], // 癸 → 卯 巳
]

/** 三合局分组：以「局首」地支索引为键 */
const SAN_HE_GROUP: Record<number, readonly ZhiIndex[]> = {
  8: [8, 0, 4], // 申子辰
  2: [2, 6, 10], // 寅午戌
  5: [5, 9, 1], // 巳酉丑
  11: [11, 3, 7], // 亥卯未
}

/** 桃花：申子辰→酉，寅午戌→卯，巳酉丑→午，亥卯未→子 */
const TAO_HUA: Record<number, ZhiIndex> = { 8: 9, 2: 3, 5: 6, 11: 0 }

/** 驿马：申子辰→寅，寅午戌→申，巳酉丑→亥，亥卯未→巳 */
const YI_MA: Record<number, ZhiIndex> = { 8: 2, 2: 8, 5: 11, 11: 5 }

/** 华盖：申子辰→辰，寅午戌→戌，巳酉丑→丑，亥卯未→未 */
const HUA_GAI: Record<number, ZhiIndex> = { 8: 4, 2: 10, 5: 1, 11: 7 }

/** 羊刃（仅阳干）：甲→卯，丙戊→午，庚→酉，壬→子 */
export const YANG_REN: Partial<Record<GanIndex, ZhiIndex>> = {
  0: 3, // 甲 → 卯
  2: 6, // 丙 → 午
  4: 6, // 戊 → 午
  6: 9, // 庚 → 酉
  8: 0, // 壬 → 子
}

/**
 * 找出地支所属的三合局「局首」索引。
 * 返回 undefined 表示理论上不可能（十二支必属四局之一），仅作防御。
 */
export function sanHeHead(zhi: ZhiIndex): number | undefined {
  for (const head of Object.keys(SAN_HE_GROUP)) {
    const headIndex = Number(head)
    const group = SAN_HE_GROUP[headIndex]
    if (group !== undefined && group.includes(zhi)) return headIndex
  }
  return undefined
}

export function taoHuaOf(zhi: ZhiIndex): ZhiIndex | undefined {
  const head = sanHeHead(zhi)
  return head === undefined ? undefined : TAO_HUA[head]
}

export function yiMaOf(zhi: ZhiIndex): ZhiIndex | undefined {
  const head = sanHeHead(zhi)
  return head === undefined ? undefined : YI_MA[head]
}

export function huaGaiOf(zhi: ZhiIndex): ZhiIndex | undefined {
  const head = sanHeHead(zhi)
  return head === undefined ? undefined : HUA_GAI[head]
}

/* ------------------------------------------------------------------ *
 * 地支关系（流年展示用）
 * ------------------------------------------------------------------ */

const LIU_HE: Record<number, ZhiIndex> = {
  0: 1,
  1: 0,
  2: 11,
  11: 2,
  3: 10,
  10: 3,
  4: 9,
  9: 4,
  5: 8,
  8: 5,
  6: 7,
  7: 6,
}

/** 六冲：索引相差 6 */
export function isLiuChong(a: ZhiIndex, b: ZhiIndex): boolean {
  return Math.abs(a - b) === 6
}

/** 六合 */
export function isLiuHe(a: ZhiIndex, b: ZhiIndex): boolean {
  return LIU_HE[a] === b
}
