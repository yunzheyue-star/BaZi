/**
 * 四柱：年柱、月柱、日柱、时柱
 *
 * 技能 §3.2 ~ §3.5：
 *   年柱：以立春为界        k_y = (Y* − 4) mod 60
 *   月柱：以节气为界        j_m = (m + 1) mod 12，i_m = (2·i_y + m + 1) mod 10
 *   日柱：JDN              k_d = (JDN + 49) mod 60
 *   时柱：真太阳时          j_h = floor(((h + 1) mod 24) / 2)，i_h = (2·i_d + j_h) mod 10
 */

import { crt, makePillar, mod } from './ganzhi'
import { julianDayNumber } from './calendar'
import type { CivilDate, CivilDateTime } from './calendar'
import type { GanIndex, Pillar, ZhiIndex } from '../types/bazi'

/** 基准年：公元 4 年为甲子年 */
const YEAR_EPOCH = 4

/**
 * 年柱（技能 §3.2）
 * @param metaphysicalYear 命理年（已按立春调整过的年份 Y*）
 */
export function yearPillar(metaphysicalYear: number): Pillar {
  const k = mod(metaphysicalYear - YEAR_EPOCH, 60)
  const stemIndex = mod(k, 10) as GanIndex
  const branchIndex = mod(k, 12) as ZhiIndex
  return makePillar(stemIndex, branchIndex)
}

/**
 * 判断命理年：出生时刻 ≥ 该年立春则取本年，否则取上一年。
 * @param birthJd 出生瞬间的儒略日
 * @param lichunJdOfYear 出生公历年的立春儒略日
 */
export function metaphysicalYear(
  civilYear: number,
  birthJd: number,
  lichunJdOfYear: number,
): number {
  return birthJd >= lichunJdOfYear ? civilYear : civilYear - 1
}

/**
 * 月柱（技能 §3.3）
 * @param yearStemIndex 年干索引
 * @param monthOrder 月令序号 m ∈ [1,12]，1 = 寅月（立春起）
 */
export function monthPillar(yearStemIndex: GanIndex, monthOrder: number): Pillar {
  const jm = mod(monthOrder + 1, 12) as ZhiIndex
  const im = mod(2 * yearStemIndex + monthOrder + 1, 10) as GanIndex
  return makePillar(im, jm)
}

/**
 * 日柱（技能 §3.4）
 * @param jdn 儒略日数（整数，代表当地民用日）
 */
export function dayPillar(jdn: number): Pillar {
  const k = mod(jdn + 49, 60)
  const stemIndex = mod(k, 10) as GanIndex
  const branchIndex = mod(k, 12) as ZhiIndex
  return makePillar(stemIndex, branchIndex)
}

/**
 * 时柱（技能 §3.5）
 * @param dayStemIndex 用于定时干的那个「日」的天干索引
 * @param hour 真太阳时的小时（0–23）
 */
export function hourPillar(dayStemIndex: GanIndex, hour: number): Pillar {
  const jh = Math.floor(mod(hour + 1, 24) / 2) as ZhiIndex
  const ih = mod(2 * dayStemIndex + jh, 10) as GanIndex
  return makePillar(ih, jh)
}

/** 地支对应的时辰名 */
export const SHI_CHEN = [
  '子时',
  '丑时',
  '寅时',
  '卯时',
  '辰时',
  '巳时',
  '午时',
  '未时',
  '申时',
  '酉时',
  '戌时',
  '亥时',
] as const

/** 由真太阳时小时取时辰索引（与 hourPillar 的 j_h 一致） */
export function shiChenIndex(hour: number): ZhiIndex {
  return Math.floor(mod(hour + 1, 24) / 2) as ZhiIndex
}

/* ------------------------------------------------------------------ *
 * 换日
 * ------------------------------------------------------------------ */

/**
 * 按流派决定「日柱所用的民用日」。
 *
 * - midnight（子正换日）：00:00 起算新的一天，23:00–23:59 仍属当日。
 * - zi_hour（子初换日）：23:00 起即算次日，日柱与日干提前进位。
 *
 * 两者对日柱的影响只发生在 23:00–23:59 出生的人身上。
 */
export function resolveDayDate(
  dt: CivilDateTime,
  boundary: 'midnight' | 'zi_hour',
): CivilDate {
  if (boundary === 'zi_hour' && dt.hour >= 23) {
    const nextDay = new Date(Date.UTC(dt.year, dt.month - 1, dt.day) + 86400000)
    return {
      year: nextDay.getUTCFullYear(),
      month: nextDay.getUTCMonth() + 1,
      day: nextDay.getUTCDate(),
    }
  }
  return { year: dt.year, month: dt.month, day: dt.day }
}

/** 由民用日算日柱 */
export function dayPillarOfCivilDate(date: CivilDate): Pillar {
  return dayPillar(julianDayNumber(date))
}

/** 四柱校验：干、支索引与 k 必须自洽（供测试与调试使用） */
export function assertPillarConsistent(pillar: Pillar, label: string): void {
  const expected = crt(pillar.stemIndex, pillar.branchIndex)
  if (expected !== pillar.k) {
    throw new Error(
      `${label} 自洽性校验失败：k=${pillar.k} 但 CRT(${pillar.stemIndex}, ${pillar.branchIndex})=${expected}`,
    )
  }
}
