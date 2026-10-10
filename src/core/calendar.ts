/**
 * 历法与天文：儒略日数、太阳视黄经、节气时刻、真太阳时、均时差
 *
 * 技能 §3.1：T_solar = T_local + (longitude - 120°) × 4min + EoT
 *
 * 【精度声明】
 * 太阳黄经使用「平黄经 + 中心差 + 主要摄动项 + 光行差」的简化解析式，
 * 相对完整 VSOP87 的误差约 0.02°，折合节气时刻约 ±30 分钟。
 * 对「月柱定界」「立春定年」在绝大多数出生时刻上是安全的；
 * 若出生时刻距节气小于 1 小时，建议人工复核。
 *
 * TODO(astro): 替换为 skyfield / ephem / astronomia 的 VSOP87D 实现，
 *              并把 ΔT（TT - UT）纳入计算，可把节气误差压到秒级。
 */

import { JIE_NAMES, termStartLambda } from './constants'
import { mod } from './ganzhi'

/** 儒略日数的整数部分所对应的纪元偏移 */
const JDN_EPOCH = 2440587.5

/** J2000.0 历元儒略日（2000-01-01 12:00 TT） */
export const J2000 = 2451545.0

const DEG = Math.PI / 180
const RAD = 180 / Math.PI

export function sinDeg(x: number): number {
  return Math.sin(x * DEG)
}

export function cosDeg(x: number): number {
  return Math.cos(x * DEG)
}

/* ------------------------------------------------------------------ *
 * 儒略日数
 * ------------------------------------------------------------------ */

export interface CivilDate {
  year: number
  month: number
  day: number
}

export interface CivilDateTime extends CivilDate {
  hour: number
  minute: number
}

/**
 * 公历日期 → 儒略日数（JDN，当日 12:00 对应的整数）。
 * 采用 Fliegel–Van Flandern 算法，对现行格里高利历（1582-10-15 之后）成立。
 *
 * 技能 §3.4 的日柱公式 k_d = (JDN + 49) mod 60 以本函数为基准。
 */
export function julianDayNumber(date: CivilDate): number {
  const a = Math.floor((14 - date.month) / 12)
  const y = date.year + 4800 - a
  const m = date.month + 12 * a - 3
  return (
    date.day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  )
}

/** 公历日期时间 → 儒略日（含小数，UT 近似） */
export function julianDay(dt: CivilDateTime, secondOfMinute = 0): number {
  const dayFraction = (dt.hour - 12) / 24 + dt.minute / 1440 + secondOfMinute / 86400
  return julianDayNumber(dt) + dayFraction
}

/** 儒略日 → 公历日期时间 */
export function fromJulianDay(jd: number): CivilDateTime {
  const z = Math.floor(jd + 0.5)
  const frac = jd + 0.5 - z
  const a = Math.floor((z - 1867216.25) / 36524.25)
  const a1 = z + 1 + a - Math.floor(a / 4)
  const b = a1 + 1524
  const c = Math.floor((b - 122.1) / 365.25)
  const d = Math.floor(365.25 * c)
  const e = Math.floor((b - d) / 30.6001)

  const dayWithFrac = b - d - Math.floor(30.6001 * e) + frac
  const day = Math.floor(dayWithFrac)
  const month = e < 14 ? e - 1 : e - 13
  const year = month > 2 ? c - 4716 : c - 4715

  const minutesOfDay = Math.round((dayWithFrac - day) * 1440)
  return {
    year,
    month,
    day,
    hour: Math.floor(minutesOfDay / 60) % 24,
    minute: minutesOfDay % 60,
  }
}

/* ------------------------------------------------------------------ *
 * 太阳位置
 * ------------------------------------------------------------------ */

/** 自 J2000 起的儒略日数 */
export function daysSinceJ2000(jd: number): number {
  return jd - J2000
}

/**
 * 太阳视黄经 λ（度，0–360）。
 *
 * 组成：
 *   平黄经 L0 = 280.46646 + 36000.76983·T
 *   平近点角 M = 357.52911 + 35999.05029·T
 *   中心差 C = (1.914602 − 0.004817T)sin M + 0.019993 sin 2M + 0.000289 sin 3M
 *   真黄经 ⊙ = L0 + C
 *   视黄经 λ = ⊙ − 0.00569 − 0.00478 sin Ω（光行差 + 黄经章动主项）
 *   再叠加金星/木星/月球的低级摄动项（Meeus, Astronomical Algorithms, ch.25 注记）
 *
 * TODO(astro): 换 VSOP87D。
 */
export function solarApparentLongitude(jd: number): number {
  const t = daysSinceJ2000(jd) / 36525
  const l0 = 280.46646 + 36000.76983 * t + 0.0003032 * t * t
  const m = 357.52911 + 35999.05029 * t - 0.0001537 * t * t
  const c =
    (1.914602 - 0.004817 * t - 0.000014 * t * t) * sinDeg(m) +
    (0.019993 - 0.000101 * t) * sinDeg(2 * m) +
    0.000289 * sinDeg(3 * m)
  const trueLongitude = l0 + c
  const omega = 125.04 - 1934.136 * t

  // 主要摄动（度）：金星、木星、月球
  const a = 153.23 + 22518.7541 * t
  const b = 216.57 + 45037.5082 * t
  const cc = 312.69 + 32964.3577 * t
  const d = 350.74 + 445267.1142 * t - 0.00144 * t * t
  const e = 231.19 + 20.2 * t
  const perturbation =
    0.00134 * cosDeg(a) +
    0.00154 * cosDeg(b) +
    0.002 * cosDeg(cc) +
    0.00179 * sinDeg(d) +
    0.00178 * sinDeg(e)

  const apparent = trueLongitude - 0.00569 - 0.00478 * sinDeg(omega) + perturbation
  return mod(apparent, 360)
}

/** 均时差 EoT（分钟） */
export function equationOfTime(jd: number): number {
  const t = daysSinceJ2000(jd) / 36525
  const l0 = mod(280.4664567 + 360007.6982779 * (t / 10) + 0.03032028 * t * t, 360)
  const lambda = solarApparentLongitude(jd)
  const omega = 125.04 - 1934.136 * t
  const epsilon = 23.439291 - 0.0130042 * t
  const alpha = mod(
    Math.atan2(cosDeg(epsilon) * sinDeg(lambda), cosDeg(lambda)) * RAD,
    360,
  )
  // Meeus: E = L0 − 0.0057183 − α + Δψ·cos ε（此处略去 Δψ）
  let e = l0 - 0.0057183 - alpha + 0.00478 * sinDeg(omega) * cosDeg(epsilon)
  e = mod(e + 180, 360) - 180
  return e * 4
}

/* ------------------------------------------------------------------ *
 * 节气
 * ------------------------------------------------------------------ */

export interface SolarTermMoment {
  /** 节序号：0 = 立春 … 11 = 小寒 */
  termIndex: number
  name: string
  /** 该节开始时刻的儒略日（UT 近似） */
  jd: number
}

/**
 * 求「公历 year 年」内某个节的时刻。
 *
 * 说明：以立春为 0 号节。year 年内的节序号 t 对应公历月份为
 * 2 月（t=0）、3 月（t=1）… 次年 1 月（t=11），故其公历年份为
 * year + floor(t / 11)，月份为 ((t + 1) % 12) + 1。
 *
 * TODO(astro): 迭代收敛判据可加严，或直接换 VSOP87D + ΔT。
 */
export function solarTermMoment(year: number, termIndex: number): SolarTermMoment {
  const t = mod(termIndex, 12)
  const targetLambda = termStartLambda(t)
  const gregorianYear = year + Math.floor(t / 11)
  const gregorianMonth = ((t + 1) % 12) + 1

  const seedJd = julianDay({
    year: gregorianYear,
    month: gregorianMonth,
    day: 6,
    hour: 12,
    minute: 0,
  })

  // 牛顿迭代：dλ/dt ≈ 0.9856 °/day
  let jd = seedJd + (mod(targetLambda - solarApparentLongitude(seedJd) + 180, 360) - 180) / 0.98564736
  for (let i = 0; i < 12; i += 1) {
    const diff = mod(solarApparentLongitude(jd) - targetLambda + 180, 360) - 180
    jd -= diff / 0.98564736
    if (Math.abs(diff) < 1e-7) break
  }

  return { termIndex: t, name: JIE_NAMES[t]!, jd }
}

/** 求 year 年立春时刻的儒略日 */
export function lichunJd(year: number): number {
  return solarTermMoment(year, 0).jd
}

/** 由太阳黄经求月令序号 m ∈ [1,12]（技能 §3.3） */
export function monthOrderFromLambda(lambda: number): number {
  return Math.floor(mod(lambda - 315, 360) / 30) + 1
}

/** 由月令序号求「节」序号（0 = 立春） */
export function termIndexFromMonthOrder(monthOrder: number): number {
  return mod(monthOrder - 1, 12)
}

/* ------------------------------------------------------------------ *
 * 真太阳时
 * ------------------------------------------------------------------ */

export interface QimenCorrection {
  /** 经度时差（分钟）：(longitude − 120) × 4 */
  longitudeDeltaMinutes: number
  /** 均时差（分钟） */
  equationOfTimeMinutes: number
  /** 合计偏移（分钟） */
  deltaMinutes: number
}

/**
 * 真太阳时修正量（技能 §3.1）
 *
 * T_solar = T_local + (longitude − 120°) × 4min + EoT
 */
export function trueSolarCorrection(
  dt: CivilDateTime,
  longitude: number,
  longitudeReference = 120,
): QimenCorrection {
  const longitudeDeltaMinutes = (longitude - longitudeReference) * 4
  const equationOfTimeMinutes = equationOfTime(julianDay(dt))
  return {
    longitudeDeltaMinutes,
    equationOfTimeMinutes,
    deltaMinutes: longitudeDeltaMinutes + equationOfTimeMinutes,
  }
}

/* ------------------------------------------------------------------ *
 * 解析
 * ------------------------------------------------------------------ */

const DATETIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/

/**
 * 解析 "YYYY-MM-DD HH:mm"，失败抛错（core 层不做兜底默认值，交由上层处理）。
 */
export function parseDatetime(value: string): CivilDateTime {
  const match = DATETIME_PATTERN.exec(value.trim())
  if (!match) {
    throw new Error(`出生时间格式不合法：${value}，应形如 2008-07-16 10:33`)
  }
  const [, y, mo, d, h, mi] = match
  return {
    year: Number(y),
    month: Number(mo),
    day: Number(d),
    hour: Number(h),
    minute: Number(mi),
  }
}

/** 两个儒略日之间的天数 */
export function daysBetween(a: number, b: number): number {
  return a - b
}

