# 接口文档 · 四柱八字排盘

> 适用版本：`bazi@0.0.0` ｜ 对应技能：[`bazi-chart-calculator.skill.md`](./bazi-chart-calculator.skill.md)
> 本文档描述**真实导出**的函数签名与类型约定，与 `src/` 源码逐一对照，不是设计稿。

## 0. 阅读约定

| 记号 | 含义 |
| --- | --- |
| `GanIndex` | `0\|1\|…\|9`（0 甲 … 9 癸），字面量联合，越界在编译期即被拒绝 |
| `ZhiIndex` | `0\|1\|…\|11`（0 子 … 11 亥） |
| `GanzhiK` | `number`，六十甲子序号，有效域 `[0, 59]` |
| 纯函数 | 无 I/O、无随机、不读系统时钟；同输入必得同输出 |
| ⚠️ | 会 `throw` 的接口，异常信息为中文 |

**分层纪律**：`types/` ← `core/` ← `composables/` ← `stores/` ← `components/`。
`core/` 内部只允许向下依赖（`types` 与同层无环模块），**不得**依赖 Vue / Pinia。

---

## 1. 类型接口（`src/types/bazi.ts`）

### 1.1 基础索引与标量

```ts
type GanIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
type ZhiIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11
type WuXingIndex = 0 | 1 | 2 | 3 | 4          // 木 火 土 金 水
type GanzhiK = number                          // 六十甲子序号 [0,59]
type YinYang = 0 | 1                           // 0 阳 1 阴
type PillarKey = 'year' | 'month' | 'day' | 'hour'
type Gender = 'male' | 'female'
type DayBoundary = 'midnight' | 'zi_hour'
type TimeStandard = 'true_solar' | 'mean_solar' | 'standard'
type LuckDirection = 1 | -1
```

### 1.2 柱

```ts
interface Pillar {
  k: GanzhiK            // 六十甲子序号
  stemIndex: GanIndex
  branchIndex: ZhiIndex
  stem: string          // 天干汉字，如 "戊"
  branch: string        // 地支汉字，如 "子"
  ganzhi: string        // 干支合写，如 "戊子"
}

interface Pillars { year: Pillar; month: Pillar; day: Pillar; hour: Pillar }
```

### 1.3 输入

```ts
interface ChartInput {
  birthDatetime: string        // "YYYY-MM-DD HH:mm"，**当地钟表时间**
  gender: Gender
  longitude: number            // 出生地经度，东经为正，范围 [-180, 180]
  birthPlace?: string          // 出生地名称（可选，仅展示与导出留痕）
  timezone: string             // IANA 名，如 "Asia/Shanghai"
  dayBoundary: DayBoundary     // 换日流派
  timeStandard: TimeStandard   // 计时口径：决定时柱用哪个时间
}
```

**`TimeStandard` 三档语义**

| 取值 | 展示名 | 时柱所用时间 | 偏移量 `deltaMinutes` |
| --- | --- | --- | --- |
| `standard` | 北京时间 | 民用钟表时（东经 120° 标准时） | 恒为 `0` |
| `mean_solar` | 平太阳时 | 民用时 + 经度时差 `(lon − 120°) × 4` | 经度时差 |
| `true_solar` | 真太阳时 | 平太阳时 + 均时差 `EoT` | 经度时差 + 均时差 |

三档都只影响**时柱**；日柱取民用日，年柱月柱取出生瞬间的太阳黄经与节气时刻（详见 [算法说明书 §13.1](bazi-algorithm.md#131-真太阳时只进时柱不进日柱-)）。

### 1.4 结果

```ts
interface ChartResult {
  input: ChartInput
  trueSolarTime: TrueSolarTimeInfo
  solarTerm: SolarTermInfo
  pillars: Pillars
  bazi: string                 // "戊子 己未 丁巳 乙巳"（年 月 日 时，空格分隔）
  hiddenStems: HiddenStems     // 各柱地支藏干汉字
  tenGods: TenGods             // 天干十神 + 地支藏干十神
  luckCycles: LuckStep[]       // 大运
  annualFortunes: AnnualStep[] // 流年
  shensha: Shensha             // 神煞
  steps: Step[]                // 七个中间量，供 StepDebug 展示
}
```

<details>
<summary>展开：结果子结构完整字段</summary>

```ts
interface TrueSolarTimeInfo {
  hour: number; minute: number          // 时柱所用的时间（按口径选出的那个）
  localHour: number; localMinute: number// 本地民用钟表时
  standard: TimeStandard                // 本次采用的口径
  standardLabel: string                 // "真太阳时" / "平太阳时" / "北京时间"
  longitudeDeltaMinutes: number         // (lon − 120) × 4
  equationOfTimeMinutes: number         // 均时差（仅 true_solar 计入合计）
  deltaMinutes: number                  // 合计偏移；standard 档为 0
  // 三种时钟并列（无论选哪档都给出，供 UI 对照）
  standardHour: number; standardMinute: number        // 北京时间
  meanSolarHour: number; meanSolarMinute: number      // 出生地平太阳时
  trueSolarHour: number; trueSolarMinute: number      // 出生地真太阳时
}

interface SolarTermInfo {
  monthOrder: number         // 月令 m ∈ [1,12]，1 = 寅月（立春起）
  lambda: number             // 太阳视黄经（度）
  termName: string           // 本节气名，如 "小暑"
  previousTermName: string
  daysAfterTerm: number      // 出生于节后第几天
  nextTermName: string
  daysToNextTerm: number     // 距下一个节几天（用于起运）
}

interface HiddenStems { year: string[]; month: string[]; day: string[]; hour: string[] }

interface TenGods {
  yearStem: string; monthStem: string; hourStem: string
  dayStem: '日主'                                  // 常量
  branches: { year: string[]; month: string[]; day: string[]; hour: string[] }
}

interface LuckStep {
  n: number; k: GanzhiK; ganzhi: string; stem: string; branch: string
  startAge: number         // 进位岁数（不足一年算一年）
  startAgeExact: number    // 精确岁数（小数）
  startYear: number; startYearLabel: string
  ageRange: string         // "8–17 岁"
}

interface AnnualStep {
  year: number; k: GanzhiK; ganzhi: string; stem: string; branch: string
  stemTenGod: string       // 流年天干对日干的十神
  branchRelation: string   // '六合' | '六冲' | '无'
  age: number              // 虚岁
}

interface ShenshaHit { name: string; positions: PillarKey[]; branches: string[]; reason: string }
interface Shensha {
  hits: ShenshaHit[]
  flags: { 天乙贵人: boolean; 桃花: boolean; 驿马: boolean; 华盖: boolean; 羊刃: boolean }
}

interface Step {
  name: string
  formula: string
  inputs: Record<string, unknown>
  output: unknown
}
```

</details>

---

## 2. `core/constants.ts` —— 查表层

> 只放数据与纯查表函数，**不含算法分支**。五行生克：生 `(w+1)%5`，克 `(w+2)%5`。

### 2.1 基础表

| 导出 | 类型 | 说明 |
| --- | --- | --- |
| `GAN` | `readonly ['甲',…,'癸']` | 天干表，索引即 `GanIndex` |
| `GAN_META` | `readonly GanMeta[]` | `{ name, wuXingIndex, wuXing, yinYang }`，`w = i//2`，`s = i%2` |
| `ZHI` | `readonly ['子',…,'亥']` | 地支表 |
| `ZHI_META` | `readonly ZhiMeta[]` | `{ name, wuXing, hiddenStemIndexes }`，藏干按「本气→中气→余气」 |
| `WU_XING` | `readonly ['木','火','土','金','水']` | 五行名 |
| `WU_XING_COLOR` | `Record<WuXingName, string>` | 展示用配色 |
| `GAN_WU_XING_BY_NAME` / `ZHI_WU_XING_BY_NAME` | `Record<Name, WuXingName>` | 汉字→五行 |
| `GAN_COLOR` / `ZHI_COLOR` | `Record<Name, string>` | 汉字→颜色 |
| `TEN_GODS` | 常量对象 | 五组十神（same / diff） |
| `JIE_NAMES` | `readonly` 12 项 | 十二「节」，索引 0 = 立春 |
| `LICHUN_LAMBDA` | `315` | 立春太阳黄经 |
| `TERM_SPAN` | `30` | 每节黄经跨度 |
| `TIAN_YI_GUI_REN` | `readonly (readonly ZhiIndex[])[]` | 十干→天乙贵人地支 |
| `YANG_REN` | `Partial<Record<GanIndex, ZhiIndex>>` | 仅阳干有值 |

### 2.2 函数

```ts
/** 生：(w + 1) % 5 */
function generate(w: WuXingIndex): WuXingIndex

/** 克：(w + 2) % 5 */
function overcome(w: WuXingIndex): WuXingIndex

/** 节序号（0 = 立春）→ 该节起始太阳黄经 */
function termStartLambda(termIndex: number): number

/** 地支所属三合局「局首」索引；十二支必属四局之一，undefined 仅作防御 */
function sanHeHead(zhi: ZhiIndex): number | undefined

/** 桃花：申子辰→酉，寅午戌→卯，巳酉丑→午，亥卯未→子 */
function taoHuaOf(zhi: ZhiIndex): ZhiIndex | undefined

/** 驿马：申子辰→寅，寅午戌→申，巳酉丑→亥，亥卯未→巳 */
function yiMaOf(zhi: ZhiIndex): ZhiIndex | undefined

/** 华盖：申子辰→辰，寅午戌→戌，巳酉丑→丑，亥卯未→未 */
function huaGaiOf(zhi: ZhiIndex): ZhiIndex | undefined

/** 六冲：地支索引相差 6 */
function isLiuChong(a: ZhiIndex, b: ZhiIndex): boolean

/** 六合 */
function isLiuHe(a: ZhiIndex, b: ZhiIndex): boolean
```

---

## 3. `core/ganzhi.ts` —— 六十甲子编码

```ts
/** 真模：结果恒为非负（js 的 % 对负数返回负值） */
function mod(n: number, m: number): number

const CYCLE = 60
const GAN_SIZE = 10
const ZHI_SIZE = 12

/** 类型守卫 */
function isGanIndex(value: number): value is GanIndex
function isZhiIndex(value: number): value is ZhiIndex

/**
 * CRT(i, j; 10, 12)：由干、支索引反解六十甲子序号
 * ⚠️ 当 i 与 j 奇偶性不一致时抛错（该组合不属于六十甲子）
 */
function crt(stemIndex: GanIndex, branchIndex: ZhiIndex): GanzhiK

/** k → 干支明细 */
function decodeGanzhi(k: GanzhiK): GanzhiParts
interface GanzhiParts {
  k: GanzhiK; stemIndex: GanIndex; branchIndex: ZhiIndex
  stem: string; branch: string; ganzhi: string
  yinYang: YinYang; wuXingIndex: WuXingIndex; wuXing: string
}

/** 由干、支索引构造一柱（内部调 crt） */
function makePillar(stemIndex: GanIndex, branchIndex: ZhiIndex): Pillar

/** 由六十甲子序号构造一柱 */
function pillarFromK(k: GanzhiK): Pillar

/** 六十甲子全表，索引即 k */
const SIXTY_JIAZI: readonly string[]

/** w = i // 2 */
function ganWuXing(i: GanIndex): WuXingIndex
/** s = i % 2 */
function ganYinYang(i: GanIndex): YinYang
/** 地支藏干索引 */
function hiddenStemIndexes(j: ZhiIndex): readonly GanIndex[]
/** 地支藏干汉字 */
function hiddenStems(j: ZhiIndex): string[]
```

---

## 4. `core/calendar.ts` —— 历法与天文

### 4.1 结构

```ts
interface CivilDate { year: number; month: number; day: number }
interface CivilDateTime extends CivilDate { hour: number; minute: number }

interface SolarTermMoment {
  termIndex: number   // 0 = 立春 … 11 = 小寒
  name: string
  jd: number          // 该节开始时刻的儒略日（UT 近似）
}

interface QimenCorrection {
  longitudeDeltaMinutes: number
  equationOfTimeMinutes: number
  deltaMinutes: number
}
```

### 4.2 函数

```ts
const J2000 = 2451545.0

function sinDeg(x: number): number
function cosDeg(x: number): number

/** 公历日期 → 儒略日数（JDN，当日 12:00） */
function julianDayNumber(date: CivilDate): number

/** 含小数的儒略日（UT 近似）；secondOfMinute 默认 0 */
function julianDay(dt: CivilDateTime, secondOfMinute?: number): number

/** 儒略日 → 公历日期时间（四舍五入到分钟） */
function fromJulianDay(jd: number): CivilDateTime

/** 自 J2000 起的儒略日数 */
function daysSinceJ2000(jd: number): number

/** 太阳视黄经（度，0–360）：平黄经 + 中心差 + 摄动 + 光行差 */
function solarApparentLongitude(jd: number): number

/** 均时差 EoT（分钟），范围约 ±17 */
function equationOfTime(jd: number): number

/** 某公历年内第 termIndex 个节的时刻（牛顿迭代求 λ = 目标值） */
function solarTermMoment(year: number, termIndex: number): SolarTermMoment

/** year 年立春时刻的儒略日 */
function lichunJd(year: number): number

/** λ → 月令 m ∈ [1,12]：floor(((λ − 315) mod 360) / 30) + 1 */
function monthOrderFromLambda(lambda: number): number

/** 月令 → 节序号（0 = 立春） */
function termIndexFromMonthOrder(monthOrder: number): number

/** 真太阳时修正量：经度时差 + 均时差 */
function trueSolarCorrection(
  dt: CivilDateTime,
  longitude: number,
  longitudeReference?: number,   // 默认 120
): QimenCorrection

/** 解析 "YYYY-MM-DD HH:mm"；⚠️ 格式不符抛错 */
function parseDatetime(value: string): CivilDateTime

/** 两个儒略日之差 */
function daysBetween(a: number, b: number): number
```

---

## 5. `core/pillars.ts` —— 四柱

```ts
/** 年柱：k = (Y* − 4) mod 60，Y* 为命理年 */
function yearPillar(metaphysicalYear: number): Pillar

/** 命理年：出生瞬间 ≥ 该年立春取本年，否则上一年 */
function metaphysicalYear(civilYear: number, birthJd: number, lichunJdOfYear: number): number

/** 月柱：j_m = (m+1) mod 12，i_m = (2·i_y + m + 1) mod 10 */
function monthPillar(yearStemIndex: GanIndex, monthOrder: number): Pillar

/** 日柱：k_d = (JDN + 49) mod 60 */
function dayPillar(jdn: number): Pillar

/** 时柱：j_h = floor(((h+1) mod 24)/2)，i_h = (2·i_d + j_h) mod 10 */
function hourPillar(dayStemIndex: GanIndex, hour: number): Pillar

/** 十二时辰名，索引即 ZhiIndex */
const SHI_CHEN: readonly string[]

/** 真太阳时小时 → 时辰索引 */
function shiChenIndex(hour: number): ZhiIndex

/** 按换日流派决定「日柱所用民用日」（zi_hour 时 23:00 起进位） */
function resolveDayDate(dt: CivilDateTime, boundary: DayBoundary): CivilDate

/** 民用日 → 日柱 */
function dayPillarOfCivilDate(date: CivilDate): Pillar

/** 自洽性断言（测试/调试用）：⚠️ CRT(k) 与柱不一致时抛错 */
function assertPillarConsistent(pillar: Pillar, label: string): void
```

---

## 6. `core/tenGods.ts` —— 十神

```ts
/** 单个天干对日干的十神（日干为「我」） */
function tenGod(dayStemIndex: GanIndex, targetStemIndex: GanIndex): string

/** 某柱天干（不含日干）的十神，语义别名 */
function stemTenGod(dayStemIndex: GanIndex, targetStemIndex: GanIndex): string

/** 地支十神 = 藏干十神集合（按藏干顺序，长度 1–3） */
function branchTenGods(dayStemIndex: GanIndex, branchIndex: ZhiIndex): string[]

/** 地支藏干及其十神（展示层常用） */
function branchHiddenGods(
  dayStemIndex: GanIndex,
  branchIndex: ZhiIndex,
): { stem: string; god: string }[]
```

---

## 7. `core/luck.ts` —— 大运与流年

```ts
const LUCK_STEP_YEARS = 10

/** 阳男阴女顺排(+1)，阴男阳女逆排(−1) */
function luckDirection(yearStemIndex: GanIndex, gender: Gender): LuckDirection

/** Δ天 → 起运岁：exact = Δ/3，ceiled = ceil(exact) */
function startAgeFromDays(daysToJie: number): { exact: number; ceiled: number }

/**
 * 排大运：k_luck(n) = (k_m + d·n) mod 60，自月柱起排
 * @param count 步数，默认 10
 */
function luckCycles(
  monthPillar: Pillar,
  direction: LuckDirection,
  startAgeExact: number,
  birthYear: number,
  count?: number,
): LuckStep[]

/** 流年：k_year(Y) = (Y − 4) mod 60，并附十神与日支关系 */
function annualFortunes(
  startYear: number,
  count: number,
  dayStemIndex: GanIndex,
  dayBranchIndex: ZhiIndex,
  birthYear: number,
): AnnualStep[]

/** 单个流年干支 */
function ganzhiOfYear(year: number): { k: GanzhiK; ganzhi: string }
```

---

## 8. `core/shensha.ts` —— 神煞

```ts
/**
 * 神煞总入口（技能 §3.9 通用版）
 * 天乙贵人：日干/年干查四柱地支
 * 桃花 / 驿马 / 华盖：年支或日支所属三合局查四柱地支
 * 羊刃：日干（仅阳干）查四柱地支
 */
function shensha(pillars: Pillars, dayStemIndex: GanIndex, yearStemIndex: GanIndex): Shensha
```

---

## 9. `core/chart.ts` —— 总入口

```ts
interface BuildChartOptions {
  referenceYear?: number  // 流年起始年；缺省 = 出生年（保证 core 可复现）
  luckCount?: number      // 大运步数，默认 DEFAULT_LUCK_COUNT
  annualCount?: number    // 流年年数，默认 DEFAULT_ANNUAL_COUNT
}

const DEFAULT_ANNUAL_COUNT = 10
const DEFAULT_LUCK_COUNT = 10

/**
 * 排盘总入口。纯函数：不读系统时钟（时间依赖由 options.referenceYear 注入）。
 * ⚠️ 出生时间格式非法 / 时区名非法 / 经度越界时抛中文错误。
 */
function buildChart(input: ChartInput, options?: BuildChartOptions): ChartResult

/** 求某本地挂钟时刻在给定时区的 UTC 偏移（分钟，东八区 = +480） */
function timezoneOffsetMinutes(dt: CivilDateTime, timeZone: string): number

/** 四柱天干索引列表（统计用） */
function stemIndexesOf(result: ChartResult): GanIndex[]
```

### 9.1 `steps` 契约

`buildChart` 必须按此顺序产出 7 个中间量（技能 §5.2），测试逐项断言：

| # | `name` | 记录的中间量 |
| --- | --- | --- |
| 1 | `trueSolarTime` | 出生地、经度、时区、口径，以及北京时间 / 平太阳时 / 真太阳时三个时钟与选用结果 |
| 2 | `yearPillar` | 出生 UT 儒略日、本年立春时刻与儒略日、命理年、`k_y/i_y/j_y`、阴阳 |
| 3 | `monthPillar` | λ、节起始黄经、月令、节名、节内度数、节后天数与 `k_m/i_m/j_m` |
| 4 | `dayPillar` | 换日流派、所用民用日、JDN、`k_d/i_d/j_d` |
| 5 | `hourPillar` | 真太阳时小时、时辰名、`k_h/i_h/j_h` |
| 6 | `tenGods` | 日干、四柱天干十神、藏干、地支十神 |
| 7 | `luckCycles` | 顺逆与理由、距节天数、起运精确/进位岁、交运年、前三步 |

---

## 10. `src/composables/useBazi.ts` —— 组合式封装

```ts
interface UseBaziReturn {
  result: Ref<ChartResult | null>
  error: Ref<string | null>
  loading: Ref<boolean>
  bazi: ComputedRef<string>
  hasResult: ComputedRef<boolean>
  /** 执行排盘；core 的异常被接住写入 error，不向上冒泡 */
  run: (input: ChartInput, options?: BuildChartOptions) => ChartResult | null
  clear: () => void
}

/** 传入 initial 时立即计算一次 */
function useBazi(initial?: ChartInput): UseBaziReturn
```

---

## 11. `src/stores/chart.ts` —— Pinia Store

### 11.1 导出

```ts
const CITIES: readonly CityPreset[]        // 15 个常用城市
interface CityPreset { label: string; longitude: number; timezone: string }

const defaultInput: ChartInput             // 2008-07-16 10:33 男，116.4，Asia/Shanghai
const sampleInputA: ChartInput             // 校验用例一
const sampleInputB: ChartInput             // 校验用例二

function useChartStore(): ChartStore
```

### 11.2 Store 成员

| 成员 | 类型 | 说明 |
| --- | --- | --- |
| `input` | `Ref<ChartInput>` | 当前输入 |
| `result` | `Ref<ChartResult \| null>` | 排盘结果 |
| `error` | `Ref<string \| null>` | 中文错误信息 |
| `calculating` | `Ref<boolean>` | 排盘进行中 |
| `hasResult` | `ComputedRef<boolean>` | 是否已有结果 |
| `bazi` | `ComputedRef<string>` | 四柱简写 |
| `pillarList` | `ComputedRef<PillarView[]>` | 分柱视图（年 月 日 时，含藏干与十神） |
| `wuXingCount` | `ComputedRef<Record<WuXingName, number>>` | 五行计数（天干 + 地支本气） |
| `luckDirectionLabel` | `ComputedRef<string>` | 顺排 / 逆排（取自 `steps`，不重算） |
| `trueSolarLabel` | `ComputedRef<string>` | 时柱所用时间文本，如 `真太阳时 10:13（−20.5 分）` |
| `clockTriplet` | `ComputedRef<{key, label, clock}[]>` | 北京时间 / 平太阳时 / 真太阳时 三档对照 |
| `calculate()` | `() => void` | 调 `buildChart({...input}, { referenceYear: 当前年 })` |
| `applyInput(next)` | `(next: ChartInput) => void` | 整体替换输入并立即排盘 |
| `patchInput(patch)` | `(patch: Partial<ChartInput>) => void` | 局部更新输入 |
| `reset()` | `() => void` | 恢复默认并清空结果 |
| `exportJson()` | `() => string` | 完整结果 JSON（含 steps），无结果返回 `''` |
| `exportText()` | `() => string` | 文本摘要，无结果返回 `''` |

---

## 12. 组件接口（`src/components/`）

组件**禁止写算法**，只接收数据、只发事件（技能 §5.4）。

### 12.1 Props 契约

```ts
// PillarCard.vue
interface PillarCardProps {
  label: string            // "年柱" / "月柱" / "日柱" / "时柱"
  pillar: Pillar           // 干支与索引
  hiddenStems: string[]    // 藏干汉字（由父组件传入，本组件不查表）
  hiddenGods: string[]     // 藏干十神（由父组件传入，本组件不判十神）
  stemTenGod: string       // 天干十神
  isDayMaster?: boolean    // 高亮日柱
}
```

其余 7 个组件（`BirthForm` / `PillarsGrid` / `TenGodsPanel` / `LuckCyclesTable` / `AnnualFortuneTable` / `ShenshaList` / `StepDebug`）**无 props、无 emits**：一律通过 `useChartStore()` + `storeToRefs()` 取数，保证单一数据源。

### 12.2 职责边界

| 组件 | 职责 | 禁止 |
| --- | --- | --- |
| `BirthForm` | 收集输入 → `store.calculate()` | 不得写算法 |
| `PillarCard` | 展示单柱干支、藏干、十神 | 不得计算十神 |
| `PillarsGrid` | 四柱布局 + 五行计数条 | 不得访问 `core` |
| `TenGodsPanel` | 展示十神明细与分布 | 不得计算五行 |
| `LuckCyclesTable` | 展示大运表 | 不得排大运 |
| `AnnualFortuneTable` | 展示流年 | 不得算流年 |
| `ShenshaList` | 展示神煞 | 不得查表 |
| `StepDebug` | 展示 `steps`（含 JSON 复制/下载） | 不得修改 `steps` |

---

## 13. 错误与异常约定

| 触发条件 | 抛出位置 | 信息形态 |
| --- | --- | --- |
| 出生时间格式不符 `YYYY-MM-DD HH:mm` | `parseDatetime` | `出生时间格式不合法：…，应形如 2008-07-16 10:33` |
| 时区名非法 | `timezoneOffsetMinutes`（`Intl` 抛错）→ `buildChart` 转译 | `时区名不合法：…（示例：Asia/Shanghai）` |
| 经度越界 | `buildChart` | `经度不合法：…，应在 −180 ～ 180 之间` |
| 干支奇偶性不一致 | `crt` | `CRT 无解：…，该组合不属于六十甲子` |
| 柱自洽性失败 | `assertPillarConsistent` | `… 自洽性校验失败：k=… 但 CRT(…)＝…` |

UI 侧：`buildChart` 的异常在 `useBazi.run()` / `store.calculate()` 内被捕获并写入 `error`，`result` 置 `null`，组件只渲染错误条，不做 try/catch。

---

## 14. 相关文档

- [排盘算法说明书](./bazi-algorithm.md) —— 数学模型、公式推导、口径与精度
- [调用关系图](./bazi-call-graph.md) —— 模块依赖、执行链路、Mermaid 图
- [项目 README](../README.md) —— 安装、运行、目录结构、校验用例
