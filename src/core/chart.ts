/**
 * 排盘总入口 buildChart(input, options?): ChartResult
 *
 * 技能 §5.2：buildChart 必须依次记录 steps
 *   1. trueSolarTime  2. yearPillar  3. monthPillar  4. dayPillar
 *   5. hourPillar     6. tenGods     7. luckCycles
 *
 * 本文件只做「编排 + 记录中间量」，具体算法全部下沉到各 core 模块。
 * 纯函数约束：不读系统时钟、不碰 DOM；唯一的时间依赖由 options.referenceYear 注入。
 */

import { GAN, JIE_NAMES, TERM_SPAN, ZHI } from './constants'
import {
  equationOfTime,
  fromJulianDay,
  julianDay,
  julianDayNumber,
  monthOrderFromLambda,
  parseDatetime,
  solarApparentLongitude,
  solarTermMoment,
  trueSolarCorrection,
} from './calendar'
import type { CivilDate, CivilDateTime } from './calendar'
import { hiddenStemIndexes, mod } from './ganzhi'
import {
  dayPillar,
  hourPillar,
  metaphysicalYear,
  monthPillar,
  resolveDayDate,
  shiChenIndex,
  yearPillar,
} from './pillars'
import { branchTenGods, tenGod } from './tenGods'
import { annualFortunes, luckCycles, luckDirection, startAgeFromDays } from './luck'
import { shensha } from './shensha'
import { TIME_STANDARD_LABEL } from '../types/bazi'
import type {
  ChartInput,
  ChartResult,
  GanIndex,
  HiddenStems,
  LuckStep,
  Pillars,
  SolarTermInfo,
  Step,
  TenGods,
  TrueSolarTimeInfo,
} from '../types/bazi'

/* ------------------------------------------------------------------ *
 * 常量
 * ------------------------------------------------------------------ */

/** 流年默认输出年数 */
export const DEFAULT_ANNUAL_COUNT = 10

/** 大运默认步数 */
export const DEFAULT_LUCK_COUNT = 10

/** 太阳日均黄经变化率（度/日），用于估算距节天数 */
const SUN_DAILY_LAMBDA = 0.98564736

/** 中国标准时基准经线 */
const STANDARD_MERIDIAN = 120

export interface BuildChartOptions {
  /** 流年起始年；缺省用出生年（保证 core 纯函数、结果可复现）。UI 层传当前年。 */
  referenceYear?: number
  /** 大运步数 */
  luckCount?: number
  /** 流年年数 */
  annualCount?: number
}

/* ------------------------------------------------------------------ *
 * 时区工具
 * ------------------------------------------------------------------ */

/**
 * 求某本地挂钟时刻在给定时区的 UTC 偏移（分钟，东八区为 +480）。
 *
 * 用 Intl 反解，不引入重型依赖；非法时区名会抛错，由 buildChart 转成中文提示。
 */
export function timezoneOffsetMinutes(dt: CivilDateTime, timeZone: string): number {
  const asUtc = Date.UTC(dt.year, dt.month - 1, dt.day, dt.hour, dt.minute)
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(new Date(asUtc))
  const pick = (type: string): number => {
    const found = parts.find((p) => p.type === type)
    return found ? Number(found.value) : 0
  }
  const asZoned = Date.UTC(
    pick('year'),
    pick('month') - 1,
    pick('day'),
    pick('hour') % 24,
    pick('minute'),
  )
  return Math.round((asZoned - asUtc) / 60000)
}

/* ------------------------------------------------------------------ *
 * 小工具
 * ------------------------------------------------------------------ */

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function formatCivil(dt: CivilDateTime): string {
  return `${dt.year}-${pad2(dt.month)}-${pad2(dt.day)} ${pad2(dt.hour)}:${pad2(dt.minute)}`
}

function formatDate(d: CivilDate): string {
  return `${d.year}-${pad2(d.month)}-${pad2(d.day)}`
}

/** 把「分钟偏移」加到时分上并环绕到 [0, 1440)，返回时分 */
function addMinutes(
  clock: { hour: number; minute: number },
  minutes: number,
): { hour: number; minute: number } {
  const total = mod(clock.hour * 60 + clock.minute + Math.round(minutes), 1440)
  return { hour: Math.floor(total / 60), minute: total % 60 }
}

/** 儒略日 → "2008-02-04 19:00"（用于展示节气时刻） */
function jdToLabel(jd: number): string {
  const dt = fromJulianDay(jd)
  return formatCivil(dt)
}

/* ------------------------------------------------------------------ *
 * 主函数
 * ------------------------------------------------------------------ */

/**
 * 排盘：输入 → ChartResult
 *
 * @throws 出生时间格式非法 / 时区名非法 / 经度越界时，抛带中文说明的错误
 */
export function buildChart(input: ChartInput, options: BuildChartOptions = {}): ChartResult {
  const steps: Step[] = []
  const civil = parseDatetime(input.birthDatetime)

  if (!Number.isFinite(input.longitude) || input.longitude < -180 || input.longitude > 180) {
    throw new Error(`经度不合法：${input.longitude}，应在 −180 ～ 180 之间`)
  }

  let tzOffsetMinutes: number
  try {
    tzOffsetMinutes = timezoneOffsetMinutes(civil, input.timezone)
  } catch {
    throw new Error(`时区名不合法：${input.timezone}（示例：Asia/Shanghai）`)
  }

  /* ---------------- 1. 真太阳时 ---------------- */
  const civilJdLocal = julianDay(civil)
  /** 出生瞬间的 UT 近似儒略日（节气时刻以 UT 求解，必须换算后才能比较） */
  const birthJdUt = civilJdLocal - tzOffsetMinutes / 1440
  const civilUt: CivilDateTime = fromJulianDay(birthJdUt)

  // 三种时钟都算出来，再按口径挑一个给时柱用：
  //   北京时间 = 民用钟表时（东经 120° 标准时）
  //   平太阳时 = 民用时 + 经度时差
  //   真太阳时 = 民用时 + 经度时差 + 均时差
  // 注意：日柱与节气/年柱判定都不使用这三个值（口径见 README「流派与口径」）
  const correction = trueSolarCorrection(civilUt, input.longitude, STANDARD_MERIDIAN)
  const standardClock = { hour: civil.hour, minute: civil.minute }
  const meanSolarClock = addMinutes(standardClock, correction.longitudeDeltaMinutes)
  const trueSolarClock = addMinutes(standardClock, correction.deltaMinutes)

  const standard = input.timeStandard
  const usedClock =
    standard === 'true_solar' ? trueSolarClock : standard === 'mean_solar' ? meanSolarClock : standardClock
  const hourDeltaMinutes =
    standard === 'true_solar' ? correction.deltaMinutes : standard === 'mean_solar' ? correction.longitudeDeltaMinutes : 0
  const solarHour = usedClock.hour
  const solarMinute = usedClock.minute

  const trueSolarTimeInfo: TrueSolarTimeInfo = {
    hour: solarHour,
    minute: solarMinute,
    localHour: civil.hour,
    localMinute: civil.minute,
    standard,
    standardLabel: TIME_STANDARD_LABEL[standard],
    longitudeDeltaMinutes: round(correction.longitudeDeltaMinutes, 2),
    equationOfTimeMinutes: round(correction.equationOfTimeMinutes, 2),
    deltaMinutes: round(hourDeltaMinutes, 2),
    standardHour: standardClock.hour,
    standardMinute: standardClock.minute,
    meanSolarHour: meanSolarClock.hour,
    meanSolarMinute: meanSolarClock.minute,
    trueSolarHour: trueSolarClock.hour,
    trueSolarMinute: trueSolarClock.minute,
  }

  steps.push({
    name: 'trueSolarTime',
    formula:
      '北京时间 = T_local；平太阳时 = T_local + (lon − 120°)×4min；真太阳时 = 平太阳时 + EoT',
    inputs: {
      birthDatetime: input.birthDatetime,
      birthPlace: input.birthPlace ?? '（未填）',
      longitude: input.longitude,
      timezone: input.timezone,
      utcOffsetMinutes: tzOffsetMinutes,
      timeStandard: `${standard}（${TIME_STANDARD_LABEL[standard]}）`,
      eotEvaluatedAtUt: formatCivil(civilUt),
    },
    output: {
      civilTime: formatCivil(civil),
      北京时间: `${pad2(standardClock.hour)}:${pad2(standardClock.minute)}`,
      平太阳时: `${pad2(meanSolarClock.hour)}:${pad2(meanSolarClock.minute)}`,
      真太阳时: `${pad2(trueSolarClock.hour)}:${pad2(trueSolarClock.minute)}`,
      longitudeDeltaMinutes: trueSolarTimeInfo.longitudeDeltaMinutes,
      equationOfTimeMinutes: trueSolarTimeInfo.equationOfTimeMinutes,
      采用口径: TIME_STANDARD_LABEL[standard],
      采用偏移分钟: trueSolarTimeInfo.deltaMinutes,
      时柱所用时间: `${pad2(solarHour)}:${pad2(solarMinute)}`,
      note: `只用于定时柱（时支 + 五鼠遁时干）；日柱取民用日，年柱月柱取出生瞬间的黄经与节气`,
    },
  })

  const lambdaAtBirth = solarApparentLongitude(birthJdUt)

  /* ---------------- 2. 年柱（立春为界） ---------------- */
  const lichunThisYear = solarTermMoment(civil.year, 0)
  const lichunPrevYear = solarTermMoment(civil.year - 1, 0)
  const afterLichun = birthJdUt >= lichunThisYear.jd
  const mYear = metaphysicalYear(afterLichun ? civil.year : civil.year - 1, birthJdUt, afterLichun ? lichunThisYear.jd : lichunPrevYear.jd)
  const yPillar = yearPillar(mYear)

  steps.push({
    name: 'yearPillar',
    formula: 'Y* = max{Y : t ≥ 立春(Y)}；k_y = (Y* − 4) mod 60',
    inputs: {
      civilYear: civil.year,
      birthJdUt: round(birthJdUt, 5),
      lichunThisYear: `${jdToLabel(lichunThisYear.jd)} UT`,
      lichunThisYearJd: round(lichunThisYear.jd, 5),
    },
    output: {
      metaphysicalYear: mYear,
      boundary: afterLichun
        ? `晚于 ${civil.year} 年立春`
        : `早于 ${civil.year} 年立春 → 归入 ${civil.year - 1} 年`,
      k_y: yPillar.k,
      i_y: yPillar.stemIndex,
      j_y: yPillar.branchIndex,
      ganzhi: yPillar.ganzhi,
      yinYang: mod(yPillar.stemIndex, 2) === 0 ? '阳' : '阴',
    },
  })

  /* ---------------- 3. 月柱（节气为界） ---------------- */
  const monthOrder = monthOrderFromLambda(lambdaAtBirth)
  const mPillar = monthPillar(yPillar.stemIndex, monthOrder)

  const termIndex = mod(monthOrder - 1, 12)
  const stepStartLambda = mod(315 + TERM_SPAN * termIndex, 360)
  const degreesIntoTerm = mod(lambdaAtBirth - stepStartLambda, 360)
  const daysAfterTerm = degreesIntoTerm / SUN_DAILY_LAMBDA
  const daysToNextTerm = TERM_SPAN / SUN_DAILY_LAMBDA - daysAfterTerm

  const solarTermInfo: SolarTermInfo = {
    monthOrder,
    lambda: round(lambdaAtBirth, 4),
    termName: JIE_NAMES[termIndex]!,
    previousTermName: JIE_NAMES[mod(termIndex - 1, 12)]!,
    daysAfterTerm: round(daysAfterTerm, 2),
    nextTermName: JIE_NAMES[mod(termIndex + 1, 12)]!,
    daysToNextTerm: round(daysToNextTerm, 2),
  }

  steps.push({
    name: 'monthPillar',
    formula:
      'm = floor(((λ − 315°) mod 360°) / 30°) + 1；j_m = (m + 1) mod 12；i_m = (2·i_y + m + 1) mod 10',
    inputs: {
      lambda: solarTermInfo.lambda,
      termStartLambda: stepStartLambda,
      yearStemIndex: yPillar.stemIndex,
    },
    output: {
      monthOrder,
      currentTerm: solarTermInfo.termName,
      degreesIntoTerm: round(degreesIntoTerm, 4),
      daysAfterTerm: solarTermInfo.daysAfterTerm,
      j_m: mPillar.branchIndex,
      i_m: mPillar.stemIndex,
      k_m: mPillar.k,
      ganzhi: mPillar.ganzhi,
    },
  })

  /* ---------------- 4. 日柱（JDN，取民用日） ---------------- */
  const dayDate = resolveDayDate(civil, input.dayBoundary)
  const jdn = julianDayNumber(dayDate)
  const dPillar = dayPillar(jdn)

  steps.push({
    name: 'dayPillar',
    formula: 'k_d = (JDN + 49) mod 60，JDN 取「日柱所用民用日」',
    inputs: {
      civilTime: formatCivil(civil),
      dayBoundary: input.dayBoundary,
      trueSolarTimeIgnored: '真太阳时不影响日柱（仅用于定时柱）',
    },
    output: {
      boundaryRule:
        input.dayBoundary === 'zi_hour' ? '子时换日：23:00 起算次日' : '午夜换日：00:00 起算次日',
      usedCivilDate: formatDate(dayDate),
      JDN: jdn,
      k_d: dPillar.k,
      i_d: dPillar.stemIndex,
      j_d: dPillar.branchIndex,
      ganzhi: dPillar.ganzhi,
    },
  })

  /* ---------------- 5. 时柱（五鼠遁） ---------------- */
  const hourBranchIndex = shiChenIndex(solarHour)
  const hPillar = hourPillar(dPillar.stemIndex, solarHour)

  steps.push({
    name: 'hourPillar',
    formula: 'j_h = floor(((h + 1) mod 24) / 2)；i_h = (2·i_d + j_h) mod 10',
    inputs: { trueSolarHour: solarHour, dayStemIndex: dPillar.stemIndex },
    output: {
      shiChen: `${ZHI[hourBranchIndex]}时`,
      j_h: hPillar.branchIndex,
      i_h: hPillar.stemIndex,
      k_h: hPillar.k,
      ganzhi: hPillar.ganzhi,
    },
  })

  const pillars: Pillars = { year: yPillar, month: mPillar, day: dPillar, hour: hPillar }

  /* ---------------- 6. 藏干与十神 ---------------- */
  const hiddenStems: HiddenStems = {
    year: hiddenStemIndexes(yPillar.branchIndex).map((i) => GAN[i]),
    month: hiddenStemIndexes(mPillar.branchIndex).map((i) => GAN[i]),
    day: hiddenStemIndexes(dPillar.branchIndex).map((i) => GAN[i]),
    hour: hiddenStemIndexes(hPillar.branchIndex).map((i) => GAN[i]),
  }

  const tenGods: TenGods = {
    yearStem: tenGod(dPillar.stemIndex, yPillar.stemIndex),
    monthStem: tenGod(dPillar.stemIndex, mPillar.stemIndex),
    dayStem: '日主',
    hourStem: tenGod(dPillar.stemIndex, hPillar.stemIndex),
    branches: {
      year: branchTenGods(dPillar.stemIndex, yPillar.branchIndex),
      month: branchTenGods(dPillar.stemIndex, mPillar.branchIndex),
      day: branchTenGods(dPillar.stemIndex, dPillar.branchIndex),
      hour: branchTenGods(dPillar.stemIndex, hPillar.branchIndex),
    },
  }

  steps.push({
    name: 'tenGods',
    formula: '以日干为「我」：同我比劫 / 我生食伤 / 我克财 / 克我官杀 / 生我印；同阴阳取前者',
    inputs: { dayStemIndex: dPillar.stemIndex, dayStem: GAN[dPillar.stemIndex] },
    output: {
      yearStem: tenGods.yearStem,
      monthStem: tenGods.monthStem,
      dayStem: tenGods.dayStem,
      hourStem: tenGods.hourStem,
      hiddenStems,
      branchGods: tenGods.branches,
    },
  })

  /* ---------------- 7. 大运 ---------------- */
  const direction = luckDirection(yPillar.stemIndex, input.gender)
  const daysToJie = direction === 1 ? daysToNextTerm : daysAfterTerm
  const startAge = startAgeFromDays(daysToJie)
  const luck: LuckStep[] = luckCycles(
    mPillar,
    direction,
    startAge.exact,
    civil.year,
    options.luckCount ?? DEFAULT_LUCK_COUNT,
  )
  const yangYear = mod(yPillar.stemIndex, 2) === 0

  steps.push({
    name: 'luckCycles',
    formula:
      'd = +1 若(阳年干且男)或(阴年干且女)，否则 −1；k_luck(n) = (k_m + d·n) mod 60；起运岁 = Δ / 3天',
    inputs: {
      yearStem: GAN[yPillar.stemIndex],
      yearStemIndex: yPillar.stemIndex,
      gender: input.gender,
      k_m: mPillar.k,
      daysAfterTerm: solarTermInfo.daysAfterTerm,
      daysToNextTerm: solarTermInfo.daysToNextTerm,
    },
    output: {
      direction: direction === 1 ? '顺排' : '逆排',
      directionReason:
        (yangYear ? '阳年干' : '阴年干') + (input.gender === 'male' ? ' + 男' : ' + 女'),
      targetTerm: direction === 1 ? `出生后最近的节（${solarTermInfo.nextTermName}）` : `出生前最近的节（${solarTermInfo.termName}）`,
      daysToJie: round(daysToJie, 2),
      startAgeExact: round(startAge.exact, 4),
      startAge: startAge.ceiled,
      startYear: round(civil.year + startAge.exact, 2),
      firstThreeSteps: luck
        .slice(0, 3)
        .map((s) => `${s.n}. ${s.ganzhi}（${s.ageRange}）`)
        .join('，'),
    },
  })

  /* ---------------- 组装 ---------------- */
  const referenceYear = options.referenceYear ?? civil.year
  const annualStartYear = Math.max(civil.year, referenceYear)
  const annuals = annualFortunes(
    annualStartYear,
    options.annualCount ?? DEFAULT_ANNUAL_COUNT,
    dPillar.stemIndex,
    dPillar.branchIndex,
    civil.year,
  )

  return {
    input,
    trueSolarTime: trueSolarTimeInfo,
    solarTerm: solarTermInfo,
    pillars,
    bazi: [yPillar, mPillar, dPillar, hPillar].map((p) => p.ganzhi).join(' '),
    hiddenStems,
    tenGods,
    luckCycles: luck,
    annualFortunes: annuals,
    shensha: shensha(pillars, dPillar.stemIndex, yPillar.stemIndex),
    steps,
  }
}

/** 日干五行分布统计用：把四柱天干索引列出来 */
export function stemIndexesOf(result: ChartResult): GanIndex[] {
  return [
    result.pillars.year.stemIndex,
    result.pillars.month.stemIndex,
    result.pillars.day.stemIndex,
    result.pillars.hour.stemIndex,
  ]
}

/** 供调试面板复算太阳黄经用 */
export { equationOfTime, solarApparentLongitude }
