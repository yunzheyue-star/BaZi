/**
 * 大运与流年（技能 §3.7、§3.8、§7）
 *
 * 方向：d = +1 若 (阳年干且男) 或 (阴年干且女)，否则 d = −1
 * 第 n 步：k_luck(n) = (k_m + d·n) mod 60
 * 起运：顺排找出生后最近「节」，逆排找出生前最近「节」，Δ/3 天 = 1 岁
 */

import { decodeGanzhi, mod } from './ganzhi'
import { isLiuChong, isLiuHe } from './constants'
import { tenGod } from './tenGods'
import type {
  AnnualStep,
  GanIndex,
  Gender,
  GanzhiK,
  LuckDirection,
  LuckStep,
  Pillar,
  ZhiIndex,
} from '../types/bazi'

/** 一步大运的年数 */
export const LUCK_STEP_YEARS = 10

/**
 * 大运方向：阳男阴女顺排，阴男阳女逆排。
 * @param yearStemIndex 年干索引（偶数 = 阳干）
 */
export function luckDirection(yearStemIndex: GanIndex, gender: Gender): LuckDirection {
  const yangYear = mod(yearStemIndex, 2) === 0
  const yangGender = gender === 'male'
  return yangYear === yangGender ? 1 : -1
}

/**
 * 由「距节的天数」推起运岁数。
 *
 * 技能 §7 默认流派：3 天 = 1 年（1 天 = 4 个月，1 时辰 = 10 天）。
 * startAge 取「不足一年算一年」的进位值，与技能示例（2008 例 → 8 岁）一致。
 */
export function startAgeFromDays(daysToJie: number): { exact: number; ceiled: number } {
  const exact = daysToJie / 3
  return { exact, ceiled: Math.ceil(exact) }
}

/**
 * 排大运。
 *
 * @param monthPillar 月柱（大运自月柱起排）
 * @param count 排几步，默认 10
 */
export function luckCycles(
  monthPillar: Pillar,
  direction: LuckDirection,
  startAgeExact: number,
  birthYear: number,
  count = 10,
): LuckStep[] {
  const steps: LuckStep[] = []
  const startAge = Math.ceil(startAgeExact)
  /** 交运年（含小数）→ 本步覆盖的流年整数起年 */
  const firstYear = Math.round(birthYear + startAgeExact)

  for (let n = 1; n <= count; n += 1) {
    const k = mod(monthPillar.k + direction * n, 60) as GanzhiK
    const parts = decodeGanzhi(k)
    const startAgeOfStep = startAge + (n - 1) * LUCK_STEP_YEARS
    const endAgeOfStep = startAgeOfStep + LUCK_STEP_YEARS - 1

    // 本步覆盖的流年区间：从本步交运年起，到下一步交运年前一年止。
    // 用「下一步起点 − 1」而非「起点 + 9」，可避免各步交运年取整后出现缝隙或重叠。
    const coveredFromYear = firstYear + (n - 1) * LUCK_STEP_YEARS
    const coveredToYear = firstYear + n * LUCK_STEP_YEARS - 1

    steps.push({
      n,
      k,
      ganzhi: parts.ganzhi,
      stem: parts.stem,
      branch: parts.branch,
      startAge: startAgeOfStep,
      startAgeExact: Number((startAgeExact + (n - 1) * LUCK_STEP_YEARS).toFixed(2)),
      startYear: coveredFromYear,
      startYearLabel: `${coveredFromYear} 年`,
      coveredFromYear,
      coveredToYear,
      coveredLabel: `${coveredFromYear}–${coveredToYear}`,
      ageRange: `${startAgeOfStep}–${endAgeOfStep} 岁`,
    })
  }
  return steps
}

/**
 * 流年（技能 §3.8）：k_year(Y) = (Y − 4) mod 60
 */
export function annualFortunes(
  startYear: number,
  count: number,
  dayStemIndex: GanIndex,
  dayBranchIndex: ZhiIndex,
  birthYear: number,
): AnnualStep[] {
  const list: AnnualStep[] = []
  for (let i = 0; i < count; i += 1) {
    const year = startYear + i
    const k = mod(year - 4, 60) as GanzhiK
    const parts = decodeGanzhi(k)
    const branchIndex = parts.branchIndex
    let branchRelation = '无'
    if (isLiuChong(dayBranchIndex, branchIndex)) branchRelation = '六冲'
    else if (isLiuHe(dayBranchIndex, branchIndex)) branchRelation = '六合'
    list.push({
      year,
      k,
      ganzhi: parts.ganzhi,
      stem: parts.stem,
      branch: parts.branch,
      stemTenGod: tenGod(dayStemIndex, parts.stemIndex),
      branchRelation,
      age: year - birthYear + 1,
    })
  }
  return list
}

/** 单个流年的干支（供查询/展示复用） */
export function ganzhiOfYear(year: number): { k: GanzhiK; ganzhi: string } {
  const k = mod(year - 4, 60) as GanzhiK
  return { k, ganzhi: decodeGanzhi(k).ganzhi }
}
