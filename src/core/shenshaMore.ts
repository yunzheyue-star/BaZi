/**
 * 神煞（进阶）：按「柱」统计的命中集合
 *
 * 与 `shensha.ts` 的关系：
 *   - `shensha.ts` 判定五类基础神煞（天乙贵人 / 桃花 / 驿马 / 华盖 / 羊刃），给出 hits + flags
 *   - 本文件扩充到二十余类，并为**每一柱**给出命中的神煞清单
 *
 * 【口径说明】界面上「选中某柱 / 某天干」时要显示该柱的神煞，为此必须明确
 * 「某神煞算命中在哪一柱」。本文件的定位规则：
 *
 *   1. 取象**落到某个地支**的（三合局类、贵人查支类、孤辰寡宿、天罗地网）
 *      → 该地支所在的柱中标；
 *   2. 取象**落到某个天干**的（月德贵人、天德贵人）→ 该天干所在的柱中标；
 *      若盘中无此天干，则落到「月柱」（月德/天德由月令所出）；
 *   3. **日柱本身成立**的（十恶大败、魁罡、阴差阳错、四废）→ 只标在日柱；
 *   4. 三合局无目标支可查时（如年支子属申子辰局取亡神在亥而盘中无亥）
 *      → 落到引发该局的柱，保证「选中本源柱」时能看到它，不会静默丢失。
 *
 * 来源约定：
 *   - 亡神 / 劫煞 / 驿马 / 桃花：以**年支**与**日支**为源（古法）
 *   - 华盖 / 将星：以**月支**（月令）为源
 *   - 孤辰 / 寡宿：以**年支**为源
 *   - 天罗 / 地网：四柱地支见 戌亥 / 辰巳
 *
 * 复核用例：丙戌 庚寅 丁亥 甲辰（2006-02-27 09:20 天等县）
 *   年干丙 → 月德贵人（月支寅·寅午戌局→丙）、天罗（年支戌）
 *   月干庚 → 国印贵人（庚→未）、亡神（日支亥·亥卯未局→寅，落月柱）
 *   日干丁 → 天德贵人（月支寅→丁）、天乙贵人（丁→亥）、劫煞（年支戌→亥）、
 *            孤辰（年支戌→亥）、十恶大败（日柱丁亥）、天罗（日支亥）
 *   时干甲 → 童子煞（寅月见甲）、地网（时支辰）
 *
 * TODO(门派版): 各家神煞表有出入（尤其孤辰寡宿、童子煞、国印贵人、十恶大败）。
 *              本表采用与复核用例一致的通用版，若需门派定制，改本文件的常量表即可。
 */

import { GAN, ZHI } from './constants'
import type { GanIndex, PillarKey, Pillars, ZhiIndex } from '../types/bazi'

/* ------------------------------------------------------------------ *
 * 常量表
 * ------------------------------------------------------------------ */

/** 三合局：局首地支 → 该局三支 */
const SAN_HE: Record<number, readonly ZhiIndex[]> = {
  8: [8, 0, 4], // 申子辰
  2: [2, 6, 10], // 寅午戌
  5: [5, 9, 1], // 巳酉丑
  11: [11, 3, 7], // 亥卯未
}

/** 地支 → 所属三合局局首 */
function groupHead(zhi: ZhiIndex): number {
  for (const head of Object.keys(SAN_HE)) {
    const h = Number(head)
    if (SAN_HE[h]!.includes(zhi)) return h
  }
  return zhi
}

/** 三合局全名，如 8 → "申子辰"（依据文本必须用全名，否则读者会误把「亥局」当成亥） */
function groupName(head: number): string {
  return (SAN_HE[head] ?? [head]).map((z) => ZHI[z as ZhiIndex]).join('')
}

/** 月德贵人：月支三合局 → 天干（寅午戌月→丙，申子辰月→壬，亥卯未月→甲，巳酉丑月→庚） */
const YUE_DE: Record<number, GanIndex> = { 2: 2, 8: 8, 11: 0, 5: 6 }

/**
 * 天德贵人：月支 → 该月的天德。
 * 取值为天干时用 0–9，取值为地支时用 12 + 地支索引。
 */
const TIAN_DE: Record<number, number> = {
  2: 3, // 寅 → 丁
  3: 20, // 卯 → 申（支）
  4: 8, // 辰 → 壬
  5: 7, // 巳 → 辛
  6: 23, // 午 → 亥（支）
  7: 0, // 未 → 甲
  8: 9, // 申 → 癸
  9: 14, // 酉 → 寅（支）
  10: 2, // 戌 → 丙
  11: 1, // 亥 → 乙
  0: 17, // 子 → 巳（支）
  1: 6, // 丑 → 庚
}

function tianDeAsStem(value: number): GanIndex | undefined {
  return value < 12 ? (value as GanIndex) : undefined
}

function tianDeAsBranch(value: number): ZhiIndex | undefined {
  return value >= 12 ? ((value - 12) as ZhiIndex) : undefined
}

/**
 * 国印贵人：天干 → 地支。
 *
 * 注：本表与复核用例一致（庚 → 未）。通行口诀另有「庚见丑」一说，各家排盘源不统一，
 * 若要切换只需改这一张表。
 */
const GUO_YIN: Record<GanIndex, ZhiIndex> = {
  0: 10, // 甲 → 戌
  1: 11, // 乙 → 亥
  2: 1, // 丙 → 丑
  3: 2, // 丁 → 寅
  4: 1, // 戊 → 丑
  5: 2, // 己 → 寅
  6: 7, // 庚 → 未
  7: 8, // 辛 → 申
  8: 6, // 壬 → 午
  9: 5, // 癸 → 巳
}

/** 天乙贵人：十干 → 地支 */
const TIAN_YI: readonly (readonly ZhiIndex[])[] = [
  [1, 7], // 甲 → 丑未
  [0, 8], // 乙 → 子申
  [11, 9], // 丙 → 亥酉
  [11, 9], // 丁 → 亥酉
  [1, 7], // 戊 → 丑未
  [0, 8], // 己 → 子申
  [1, 7], // 庚 → 丑未
  [2, 6], // 辛 → 寅午
  [3, 5], // 壬 → 卯巳
  [3, 5], // 癸 → 卯巳
]

/** 三合局 → 亡神 */
const WANG_SHEN: Record<number, ZhiIndex> = { 8: 11, 2: 5, 5: 8, 11: 2 }
/** 三合局 → 劫煞 */
const JIE_SHA: Record<number, ZhiIndex> = { 8: 5, 2: 11, 5: 8, 11: 2 }
/** 三合局 → 华盖 */
const HUA_GAI: Record<number, ZhiIndex> = { 8: 4, 2: 10, 5: 1, 11: 7 }
/** 三合局 → 将星 */
const JIANG_XING: Record<number, ZhiIndex> = { 8: 0, 2: 6, 5: 9, 11: 3 }
/** 三合局 → 驿马 */
const YI_MA: Record<number, ZhiIndex> = { 8: 2, 2: 8, 5: 11, 11: 5 }
/** 三合局 → 桃花（咸池） */
const TAO_HUA: Record<number, ZhiIndex> = { 8: 9, 2: 3, 5: 6, 11: 0 }
/** 三合局 → 孤辰 */
const GU_CHEN: Record<number, ZhiIndex> = { 8: 2, 2: 11, 5: 8, 11: 8 }
/** 三合局 → 寡宿 */
const GUA_SU: Record<number, ZhiIndex> = { 8: 10, 2: 4, 5: 1, 11: 5 }

/** 十恶大败：日柱干支 */
const SHI_E_DA_BAI = new Set([
  '甲辰',
  '乙巳',
  '丙申',
  '丁亥',
  '戊戌',
  '己丑',
  '庚辰',
  '辛巳',
  '壬申',
  '癸亥',
])

/** 魁罡：日柱干支 */
const KUI_GANG = new Set(['壬辰', '庚辰', '庚戌', '戊戌'])

/** 阴差阳错：日柱干支 */
const YIN_CHA_YANG_CUO = new Set([
  '丙子',
  '丁丑',
  '戊寅',
  '辛卯',
  '壬辰',
  '癸巳',
  '丙午',
  '丁未',
  '戊申',
  '辛酉',
  '壬戌',
  '癸亥',
])

/** 童子煞：季节（月支三合局）× 天干 */
const TONG_ZI_STEM: Record<number, readonly GanIndex[]> = {
  2: [0, 1], // 寅午戌月 → 甲、乙
  8: [8, 9], // 申子辰月 → 壬、癸
  11: [0, 1], // 亥卯未月 → 甲、乙
  5: [6, 7], // 巳酉丑月 → 庚、辛
}

/** 童子煞：季节（月支三合局）× 地支 */
const TONG_ZI_BRANCH: Record<number, readonly ZhiIndex[]> = {
  2: [2, 10], // 寅午戌月 → 寅、戌
  8: [3, 7], // 申子辰月 → 卯、未
  11: [3, 7], // 亥卯未月 → 卯、未
  5: [6, 9], // 巳酉丑月 → 午、酉
}

/** 天罗地网：见戌亥为天罗，见辰巳为地网 */
const TIAN_LUO: readonly ZhiIndex[] = [10, 11]
const DI_WANG: readonly ZhiIndex[] = [4, 5]

/** 四废日：季节（月支三合局）× 日柱 */
const SI_FEI: Record<number, readonly string[]> = {
  2: ['庚申', '辛酉'],
  8: ['壬子', '癸亥'],
  11: ['甲寅', '乙卯'],
  5: ['丙午', '丁巳'],
}

/** 禄神：十干 → 临官之地支 */
const LU_SHEN: readonly ZhiIndex[] = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0]

/** 羊刃（仅阳干） */
const YANG_REN: Partial<Record<GanIndex, ZhiIndex>> = { 0: 3, 2: 6, 4: 6, 6: 9, 8: 0 }

const PILLAR_KEYS = ['year', 'month', 'day', 'hour'] as const

const SUFFIX: Record<PillarKey, string> = {
  year: '年',
  month: '月',
  day: '日',
  hour: '时',
}

/* ------------------------------------------------------------------ *
 * 类型
 * ------------------------------------------------------------------ */

export interface ShenshaRuleHit {
  name: string
  /** 判定依据文本 */
  reason: string
  /** 目标是天干还是地支 */
  target: 'stem' | 'branch'
  /** 目标汉字 */
  targetName: string
  /** 命中该神煞的柱 */
  positions: PillarKey[]
}

/** 某一柱命中的神煞名 */
export type ShenshaByPillar = Record<PillarKey, string[]>

/* ------------------------------------------------------------------ *
 * 主函数
 * ------------------------------------------------------------------ */

/**
 * 按柱统计神煞命中。
 *
 * @param pillars 四柱
 * @param dayStemIndex 日干（国印贵人的正源）
 * @param yearStemIndex 年干（天乙贵人的另一源）
 */
export function shenshaByPillar(
  pillars: Pillars,
  dayStemIndex: GanIndex,
  yearStemIndex: GanIndex,
): { hits: ShenshaRuleHit[]; byPillar: ShenshaByPillar } {
  const keys = PILLAR_KEYS
  const branchOf = (k: PillarKey): ZhiIndex => pillars[k].branchIndex
  const stemOf = (k: PillarKey): GanIndex => pillars[k].stemIndex

  const monthBranch = branchOf('month')
  const yearBranch = branchOf('year')
  const dayBranch = branchOf('day')
  const head = groupHead(monthBranch)

  const hits: ShenshaRuleHit[] = []
  const byPillar: ShenshaByPillar = { year: [], month: [], day: [], hour: [] }

  /** 柱位 → 形如「戌年支」的标签 */
  const keyLabel = (k: PillarKey): string => `${ZHI[branchOf(k)]}${SUFFIX[k]}支`
  /** 柱位 → 形如「丙年干」的标签 */
  const stemLabel = (k: PillarKey): string => `${GAN[stemOf(k)]}${SUFFIX[k]}干`
  const labelsOf = (positions: PillarKey[]): string => positions.map(keyLabel).join('、')

  function add(hit: ShenshaRuleHit): void {
    hits.push(hit)
    for (const k of hit.positions) {
      if (!byPillar[k].includes(hit.name)) byPillar[k].push(hit.name)
    }
  }

  /** 同一神煞可能由多个源各推一次（如天乙贵人同时由日干、年干推得），此处按名归并 */
  function dedupeByPillar(): void {
    for (const k of keys) {
      byPillar[k] = Array.from(new Set(byPillar[k]))
    }
  }

  const positionsOfBranch = (zhi: ZhiIndex): PillarKey[] => keys.filter((k) => branchOf(k) === zhi)
  const positionsOfStem = (gan: GanIndex): PillarKey[] => keys.filter((k) => stemOf(k) === gan)
  const sourceKey = (zhi: ZhiIndex): PillarKey => keys.find((k) => branchOf(k) === zhi) ?? 'year'

  /* ---------- 1. 月德贵人 / 天德贵人（落到天干） ---------- */

  const yueDeGan = YUE_DE[head]
  if (yueDeGan !== undefined) {
    const pos = positionsOfStem(yueDeGan)
    const landed = pos.length > 0 ? pos : (['month'] as PillarKey[])
    add({
      name: '月德贵人',
      reason:
        `月支${ZHI[monthBranch]}属${groupName(head)}局 → 月德为${GAN[yueDeGan]}` +
        (pos.length > 0 ? `，落${landed.map(stemLabel).join('、')}` : '，盘中无此干 → 落月柱'),
      target: 'stem',
      targetName: GAN[yueDeGan],
      positions: landed,
    })
  }

  const tianDeValue = TIAN_DE[monthBranch]
  if (tianDeValue !== undefined) {
    const asStem = tianDeAsStem(tianDeValue)
    const asBranch = tianDeAsBranch(tianDeValue)
    if (asStem !== undefined) {
      const pos = positionsOfStem(asStem)
      const landed = pos.length > 0 ? pos : (['month'] as PillarKey[])
      add({
        name: '天德贵人',
        reason: `月支${ZHI[monthBranch]} → 天德为${GAN[asStem]}`,
        target: 'stem',
        targetName: GAN[asStem],
        positions: landed,
      })
    } else if (asBranch !== undefined) {
      const pos = positionsOfBranch(asBranch)
      const landed = pos.length > 0 ? pos : (['month'] as PillarKey[])
      add({
        name: '天德贵人',
        reason: `月支${ZHI[monthBranch]} → 天德为${ZHI[asBranch]}`,
        target: 'branch',
        targetName: ZHI[asBranch],
        positions: landed,
      })
    }
  }

  /* ---------- 2. 国印贵人（天干查支；日干为正源，兼看各柱天干） ---------- */

  const guoYinSources: { gan: GanIndex; label: string }[] = [
    { gan: dayStemIndex, label: `日干${GAN[dayStemIndex]}` },
  ]
  for (const k of keys) {
    const gan = stemOf(k)
    if (gan !== dayStemIndex && !guoYinSources.some((s) => s.gan === gan)) {
      guoYinSources.push({ gan, label: `${GAN[gan]}干` })
    }
  }
  for (const { gan, label } of guoYinSources) {
    const target = GUO_YIN[gan]
    const pos = positionsOfBranch(target)
    if (pos.length > 0) {
      add({
        name: '国印贵人',
        reason: `${label} → 国印在${ZHI[target]}（落${labelsOf(pos)}）`,
        target: 'branch',
        targetName: ZHI[target],
        positions: pos,
      })
    }
  }

  /* ---------- 3. 天乙贵人（日干 / 年干查支） ---------- */

  const tianYiSources: [GanIndex, string][] = [
    [dayStemIndex, `日干${GAN[dayStemIndex]}`],
    [yearStemIndex, `年干${GAN[yearStemIndex]}`],
  ]
  for (const [gan, label] of tianYiSources) {
    const targets = TIAN_YI[gan]!
    const pos = keys.filter((k) => targets.includes(branchOf(k)))
    if (pos.length > 0) {
      add({
        name: '天乙贵人',
        reason: `${label} → ${targets.map((t) => ZHI[t]).join(' / ')}（落${labelsOf(pos)}）`,
        target: 'branch',
        targetName: pos.map((k) => ZHI[branchOf(k)]).join(' · '),
        positions: pos,
      })
    }
  }

  /* ---------- 4. 三合局类：年支 / 日支为源 ---------- */

  const sanHeSources: { zhi: ZhiIndex; label: string }[] = [
    { zhi: yearBranch, label: `年支${ZHI[yearBranch]}` },
    { zhi: dayBranch, label: `日支${ZHI[dayBranch]}` },
  ]

  const sanHeRules: {
    name: string
    table: Record<number, ZhiIndex>
    whenAbsent: 'source' | 'skip'
  }[] = [
    { name: '亡神', table: WANG_SHEN, whenAbsent: 'source' },
    { name: '劫煞', table: JIE_SHA, whenAbsent: 'source' },
    { name: '驿马', table: YI_MA, whenAbsent: 'skip' },
    { name: '桃花', table: TAO_HUA, whenAbsent: 'skip' },
  ]

  for (const rule of sanHeRules) {
    for (const source of sanHeSources) {
      const sourceHead = groupHead(source.zhi)
      const target = rule.table[sourceHead]
      if (target === undefined) continue
      const pos = positionsOfBranch(target)
      if (pos.length === 0 && rule.whenAbsent === 'skip') continue
      const landed = pos.length > 0 ? pos : [sourceKey(source.zhi)]
      add({
        name: rule.name,
        reason:
          `${source.label}属${groupName(sourceHead)}局 → ${rule.name}在${ZHI[target]}` +
          `（落${labelsOf(landed)}）`,
        target: 'branch',
        targetName: ZHI[target],
        positions: landed,
      })
    }
  }

  /* ---------- 4b. 华盖 / 将星：月支（月令）为源 ---------- */

  for (const [name, table] of [
    ['华盖', HUA_GAI],
    ['将星', JIANG_XING],
  ] as [string, Record<number, ZhiIndex>][]) {
    const target = table[head]
    if (target === undefined) continue
    const pos = positionsOfBranch(target)
    if (pos.length === 0) continue
    add({
      name,
      reason: `月支${ZHI[monthBranch]}属${groupName(head)}局 → ${name}在${ZHI[target]}（落${labelsOf(pos)}）`,
      target: 'branch',
      targetName: ZHI[target],
      positions: pos,
    })
  }

  /* ---------- 5. 孤辰 / 寡宿（年支为源） ---------- */

  const yearHead = groupHead(yearBranch)
  for (const [name, table] of [
    ['孤辰', GU_CHEN],
    ['寡宿', GUA_SU],
  ] as [string, Record<number, ZhiIndex>][]) {
    const target = table[yearHead]
    if (target === undefined) continue
    const pos = positionsOfBranch(target)
    const landed = pos.length > 0 ? pos : (['year'] as PillarKey[])
    add({
      name,
      reason: `年支${ZHI[yearBranch]}属${groupName(yearHead)}局 → ${name}在${ZHI[target]}`,
      target: 'branch',
      targetName: ZHI[target],
      positions: landed,
    })
  }

  /* ---------- 6. 天罗 / 地网 ---------- */

  for (const [name, targets] of [
    ['天罗', TIAN_LUO],
    ['地网', DI_WANG],
  ] as [string, readonly ZhiIndex[]][]) {
    const pos = keys.filter((k) => targets.includes(branchOf(k)))
    if (pos.length > 0) {
      add({
        name,
        reason: `${name}取${targets.map((t) => ZHI[t]).join(' / ')} → 见${labelsOf(pos)}`,
        target: 'branch',
        targetName: pos.map((k) => ZHI[branchOf(k)]).join(' · '),
        positions: pos,
      })
    }
  }

  /* ---------- 7. 禄神 / 羊刃（各柱天干取象） ---------- */

  for (const k of keys) {
    const gan = stemOf(k)
    const lu = LU_SHEN[gan]!
    const luPos = positionsOfBranch(lu)
    if (luPos.length > 0) {
      add({
        name: '禄神',
        reason: `${GAN[gan]}干 → 禄在${ZHI[lu]}（落${labelsOf(luPos)}）`,
        target: 'branch',
        targetName: ZHI[lu],
        positions: luPos,
      })
    }
    const ren = YANG_REN[gan]
    if (ren !== undefined) {
      const renPos = positionsOfBranch(ren)
      if (renPos.length > 0) {
        add({
          name: '羊刃',
          reason: `${GAN[gan]}干（阳干） → 刃在${ZHI[ren]}（落${labelsOf(renPos)}）`,
          target: 'branch',
          targetName: ZHI[ren],
          positions: renPos,
        })
      }
    }
  }

  /* ---------- 8. 童子煞（季节 × 天干 / 地支） ---------- */

  const seasonHead = groupHead(monthBranch)
  const tongZiStems = TONG_ZI_STEM[seasonHead] ?? []
  const tongZiBranches = TONG_ZI_BRANCH[seasonHead] ?? []
  const tongZiPos = keys.filter(
    (k) => tongZiStems.includes(stemOf(k)) || tongZiBranches.includes(branchOf(k)),
  )
  if (tongZiPos.length > 0) {
    add({
      name: '童子煞',
      reason:
        `月支${ZHI[monthBranch]}（${groupName(seasonHead)}局） → ` +
        `干见${tongZiStems.map((g) => GAN[g]).join('/')}、` +
        `支见${tongZiBranches.map((z) => ZHI[z]).join('/')}`,
      target: 'stem',
      targetName: tongZiPos.map((k) => pillars[k].ganzhi).join(' · '),
      positions: tongZiPos,
    })
  }

  /* ---------- 9. 日柱本身成立者 ---------- */

  const dayGanzhi = pillars.day.ganzhi
  for (const [name, set] of [
    ['十恶大败', SHI_E_DA_BAI],
    ['魁罡', KUI_GANG],
    ['阴差阳错', YIN_CHA_YANG_CUO],
  ] as [string, Set<string>][]) {
    if (set.has(dayGanzhi)) {
      add({
        name,
        reason: `日柱为${name}日（${dayGanzhi}）`,
        target: 'branch',
        targetName: dayGanzhi,
        positions: ['day'],
      })
    }
  }

  /* ---------- 10. 四废（季节 × 日柱） ---------- */

  if ((SI_FEI[seasonHead] ?? []).includes(dayGanzhi)) {
    add({
      name: '四废',
      reason: `月支${ZHI[monthBranch]}（${groupName(seasonHead)}局）逢日柱${dayGanzhi}`,
      target: 'branch',
      targetName: dayGanzhi,
      positions: ['day'],
    })
  }

  dedupeByPillar()
  return { hits, byPillar }
}

/** 某一柱命中的神煞名（组件直接取用） */
export function shenshaOfPillar(
  pillars: Pillars,
  dayStemIndex: GanIndex,
  yearStemIndex: GanIndex,
  key: PillarKey,
): string[] {
  return shenshaByPillar(pillars, dayStemIndex, yearStemIndex).byPillar[key]
}
