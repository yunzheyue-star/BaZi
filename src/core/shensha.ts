/**
 * 神煞（技能 §3.9 基础版）
 *
 * 天乙贵人：日干或年干查四柱地支
 * 桃花 / 驿马 / 华盖：年支或日支所属三合局查四柱地支
 * 羊刃：仅阳干，日干查四柱地支
 */

import {
  GAN,
  TIAN_YI_GUI_REN,
  YANG_REN,
  huaGaiOf,
  sanHeHead,
  taoHuaOf,
  yiMaOf,
  ZHI,
} from './constants'
import type { GanIndex, PillarKey, Pillars, Shensha, ShenshaHit, ZhiIndex } from '../types/bazi'

const POSITION_LABEL: Record<PillarKey, string> = {
  year: '年支',
  month: '月支',
  day: '日支',
  hour: '时支',
}

interface ZhiSlot {
  key: PillarKey
  label: string
  index: ZhiIndex
}

function slotsOf(pillars: Pillars): ZhiSlot[] {
  return (['year', 'month', 'day', 'hour'] as PillarKey[]).map((key) => ({
    key,
    label: POSITION_LABEL[key],
    index: pillars[key].branchIndex,
  }))
}

/** 按「目标地支集合」收集命中的柱位 */
function collect(slots: ZhiSlot[], targets: readonly ZhiIndex[]) {
  const positions: PillarKey[] = []
  const branches: string[] = []
  for (const slot of slots) {
    if (targets.includes(slot.index)) {
      positions.push(slot.key)
      branches.push(ZHI[slot.index])
    }
  }
  return { positions, branches }
}

/** 天乙贵人 */
function tianYi(slots: ZhiSlot[], dayStemIndex: GanIndex, yearStemIndex: GanIndex): ShenshaHit | null {
  // TIAN_YI_GUI_REN 覆盖全部十个天干，索引必定命中
  const fromDay = TIAN_YI_GUI_REN[dayStemIndex]!
  const fromYear = TIAN_YI_GUI_REN[yearStemIndex]!
  const targets = Array.from(new Set([...fromDay, ...fromYear])) as ZhiIndex[]
  const hit = collect(slots, targets)
  if (hit.positions.length === 0) return null

  const sources: string[] = []
  if (collect(slots, fromDay).positions.length > 0) {
    sources.push(`日干${GAN[dayStemIndex]}`)
  }
  if (collect(slots, fromYear).positions.length > 0) {
    sources.push(`年干${GAN[yearStemIndex]}`)
  }
  return {
    name: '天乙贵人',
    positions: hit.positions,
    branches: hit.branches,
    reason: `${sources.join('、')} → ${targets.map((t) => ZHI[t]).join(' / ')}`,
  }
}

/** 三合局类神煞（桃花 / 驿马 / 华盖） */
function sanHeHit(
  slots: ZhiSlot[],
  name: string,
  fromYear: ZhiIndex,
  fromDay: ZhiIndex,
  resolver: (zhi: ZhiIndex) => ZhiIndex | undefined,
): ShenshaHit | null {
  const targets = Array.from(
    new Set([resolver(fromYear), resolver(fromDay)].filter((v): v is ZhiIndex => v !== undefined)),
  )
  const hit = collect(slots, targets)
  if (hit.positions.length === 0) return null

  const sources = [fromYear, fromDay]
    .filter((zhi, i, arr) => arr.indexOf(zhi) === i)
    .map((zhi) => `${ZHI[sanHeHead(zhi) ?? zhi]}局(${ZHI[zhi]})`)

  return {
    name,
    positions: hit.positions,
    branches: hit.branches,
    reason: `${sources.join('、')} → ${targets.map((t) => ZHI[t]).join(' / ')}`,
  }
}

/** 羊刃 */
function yangRen(slots: ZhiSlot[], dayStemIndex: GanIndex): ShenshaHit | null {
  const target = YANG_REN[dayStemIndex]
  if (target === undefined) return null
  const hit = collect(slots, [target])
  if (hit.positions.length === 0) return null
  return {
    name: '羊刃',
    positions: hit.positions,
    branches: hit.branches,
    reason: `日干${GAN[dayStemIndex]}（阳干） → ${ZHI[target]}`,
  }
}

/**
 * 神煞总入口。
 *
 * @param pillars 四柱
 * @param dayStemIndex 日干索引
 * @param yearStemIndex 年干索引
 */
export function shensha(pillars: Pillars, dayStemIndex: GanIndex, yearStemIndex: GanIndex): Shensha {
  const slots = slotsOf(pillars)
  const yearBranch = pillars.year.branchIndex
  const dayBranch = pillars.day.branchIndex

  const candidates: (ShenshaHit | null)[] = [
    tianYi(slots, dayStemIndex, yearStemIndex),
    sanHeHit(slots, '桃花', yearBranch, dayBranch, taoHuaOf),
    sanHeHit(slots, '驿马', yearBranch, dayBranch, yiMaOf),
    sanHeHit(slots, '华盖', yearBranch, dayBranch, huaGaiOf),
    yangRen(slots, dayStemIndex),
  ]
  const hits = candidates.filter((hit): hit is ShenshaHit => hit !== null)

  const has = (name: string): boolean => hits.some((hit) => hit.name === name)
  return {
    hits,
    flags: {
      天乙贵人: has('天乙贵人'),
      桃花: has('桃花'),
      驿马: has('驿马'),
      华盖: has('华盖'),
      羊刃: has('羊刃'),
    },
  }
}
