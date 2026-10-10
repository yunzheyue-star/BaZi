/**
 * 四柱八字 —— 全局类型定义
 *
 * 说明：
 * - 所有索引类型都是「字面量联合」，保证 core 层不会接受越界索引。
 * - core/ 只依赖本文件，禁止依赖 Vue / Pinia。
 */

/* ------------------------------------------------------------------ *
 * 基础索引
 * ------------------------------------------------------------------ */

/** 天干索引：0 甲 … 9 癸 */
export type GanIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

/** 地支索引：0 子 … 11 亥 */
export type ZhiIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11

/** 五行索引：0 木 1 火 2 土 3 金 4 水（技能 §2.1：w = i // 2） */
export type WuXingIndex = 0 | 1 | 2 | 3 | 4

/** 六十甲子序号 k ∈ [0, 59] */
export type GanzhiK = number

/** 阴阳：0 阳 1 阴（技能 §2.1：s = i % 2） */
export type YinYang = 0 | 1

/** 柱位 */
export type PillarKey = 'year' | 'month' | 'day' | 'hour'

/** 性别 */
export type Gender = 'male' | 'female'

/** 换日流派：midnight = 午夜换日（子正）；zi_hour = 子时换日（子初 23:00） */
export type DayBoundary = 'midnight' | 'zi_hour'

/**
 * 计时口径（两档，决定时柱用哪个时间）
 *
 * 本系统的「平太阳时」就是**北京时间**（东经 120° 标准时，即钟表时）：
 * 民用钟表时本身就是平太阳时的一种（区时），所以不再单独拆一档。
 *
 * - `true_solar` 真太阳时：北京时间 + 均时差 EoT（由出生时刻的太阳黄经反解）
 * - `standard`   北京时间：不做任何时差修正，直接用钟表时
 */
export type TimeStandard = 'true_solar' | 'standard'

/** 各计时口径的展示名 */
export const TIME_STANDARD_LABEL: Record<TimeStandard, string> = {
  true_solar: '真太阳时',
  standard: '北京时间（平太阳时）',
}

/** 大运顺逆 */
export type LuckDirection = 1 | -1

/* ------------------------------------------------------------------ *
 * 柱
 * ------------------------------------------------------------------ */

export interface Pillar {
  /** 六十甲子序号 */
  k: GanzhiK
  stemIndex: GanIndex
  branchIndex: ZhiIndex
  /** 天干汉字，如 "戊" */
  stem: string
  /** 地支汉字，如 "子" */
  branch: string
  /** 干支合写，如 "戊子" */
  ganzhi: string
}

export interface Pillars {
  year: Pillar
  month: Pillar
  day: Pillar
  hour: Pillar
}

/* ------------------------------------------------------------------ *
 * 输入
 * ------------------------------------------------------------------ */

export interface ChartInput {
  /** 本地钟表时间，格式 "YYYY-MM-DD HH:mm" */
  birthDatetime: string
  gender: Gender
  /** 出生地经度，东经为正（真太阳时 / 平太阳时必填） */
  longitude: number
  /** 出生地名称（可选，仅作展示与导出留痕） */
  birthPlace?: string
  /** IANA 时区名，如 "Asia/Shanghai" */
  timezone: string
  dayBoundary: DayBoundary
  /** 计时口径：真太阳时 / 平太阳时 / 北京时间 */
  timeStandard: TimeStandard
}

/* ------------------------------------------------------------------ *
 * 计算结果
 * ------------------------------------------------------------------ */

export interface TrueSolarTimeInfo {
  /** 时柱所用的时间（按口径选出的那个） */
  hour: number
  minute: number
  /** 本地民用钟表时 */
  localHour: number
  localMinute: number
  /** 本次采用的口径 */
  standard: TimeStandard
  /** 该口径的展示名 */
  standardLabel: string
  /**
   * 经度时差（分钟，(longitude − 120) × 4）。
   * 仅作展示信息与出生地留痕 —— 北京时间本身就是平太阳时的一种（区时），
   * 不再把经度时差计入任何一档的修正量。
   */
  longitudeDeltaMinutes: number
  /** 均时差（分钟），仅 true_solar 档计入合计 */
  equationOfTimeMinutes: number
  /** 合计偏移（分钟）：standard 档恒为 0，true_solar 档为 EoT */
  deltaMinutes: number
  /** 北京时间的时分（= 民用钟表时 = 平太阳时） */
  standardHour: number
  standardMinute: number
  /** 真太阳时的时分（北京时间 + EoT） */
  trueSolarHour: number
  trueSolarMinute: number
}

export interface SolarTermInfo {
  /** 月令序号 m ∈ [1,12]，1 = 立春起点的寅月 */
  monthOrder: number
  /** 太阳视黄经（度，0–360） */
  lambda: number
  /** 本节气名（如 "小暑"） */
  termName: string
  /** 上一个节名（如 "小暑" 的上一个节是 "芒种"） */
  previousTermName: string
  /** 出生于节后第几天 */
  daysAfterTerm: number
  /** 下一个节名 */
  nextTermName: string
  /** 距离下一个节还有几天（用于大运起运） */
  daysToNextTerm: number
}

export interface HiddenStems {
  year: string[]
  month: string[]
  day: string[]
  hour: string[]
}

export interface TenGods {
  yearStem: string
  monthStem: string
  hourStem: string
  /** 日干对日干恒为 "日主" */
  dayStem: '日主'
  branches: {
    year: string[]
    month: string[]
    day: string[]
    hour: string[]
  }
}

export interface LuckStep {
  /** 第 n 步大运，n = 1..N */
  n: number
  k: GanzhiK
  ganzhi: string
  stem: string
  branch: string
  /** 起运虚岁（其意年龄，不足一年向上取整，与技能示例一致） */
  startAge: number
  /** 起运精确岁数（小数） */
  startAgeExact: number
  /** 交运公历年（可含小数） */
  startYear: number
  startYearLabel: string
  /** 该步覆盖的年龄区间文本，如 "8–17 岁" */
  ageRange: string
}

export interface AnnualStep {
  year: number
  k: GanzhiK
  ganzhi: string
  stem: string
  branch: string
  /** 流年天干对日干的十神 */
  stemTenGod: string
  /** 该年年支对日支的关系（六合 / 六冲 / 无） */
  branchRelation: string
  age: number
}

export interface ShenshaHit {
  name: string
  /** 命中的柱位 */
  positions: PillarKey[]
  /** 命中的地支 */
  branches: string[]
  /** 判定依据 */
  reason: string
}

export interface Shensha {
  hits: ShenshaHit[]
  /** 扁平化布尔表（技能 §4 Schema 形态） */
  flags: {
    天乙贵人: boolean
    桃花: boolean
    驿马: boolean
    华盖: boolean
    羊刃: boolean
  }
}

/** 中间量，供 StepDebug.vue 展示 */
export interface Step {
  name: string
  formula: string
  inputs: Record<string, unknown>
  output: unknown
}

export interface ChartResult {
  input: ChartInput
  trueSolarTime: TrueSolarTimeInfo
  solarTerm: SolarTermInfo
  pillars: Pillars
  bazi: string
  hiddenStems: HiddenStems
  tenGods: TenGods
  luckCycles: LuckStep[]
  annualFortunes: AnnualStep[]
  shensha: Shensha
  steps: Step[]
}
