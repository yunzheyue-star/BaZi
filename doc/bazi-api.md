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
type TimeStandard = 'true_solar' | 'standard'
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
  birthPlace?: string          // 出生地：「省 / 市 / 区县」路径，或自定义地名
  timezone: string             // IANA 名，如 "Asia/Shanghai"
  dayBoundary: DayBoundary     // 换日流派
  timeStandard: TimeStandard   // 计时口径：决定时柱用哪个时间
}
```

**`TimeStandard` 两档语义**

| 取值 | 展示名 | 时柱所用时间 | 偏移量 `deltaMinutes` |
| --- | --- | --- | --- |
| `standard` | 平太阳时 | 民用钟表时（东经 120° 标准时，即北京时间） | 恒为 `0` |
| `true_solar` | 真太阳时 | 平太阳时 + 经度时差 + 均时差 `EoT` | `(lon − 120°) × 4 + EoT` |

**注意**：「平太阳时」与「北京时间」在本系统里是同一个东西——区时本身就是平太阳时的一种，
所以只有两档，展示名统一用「平太阳时」。经度时差 `(lon − 120°) × 4` 是**真太阳时的必需项**
（钟表时 → 地方时的换算），不是可选项。

两档都只影响**时柱**；日柱取民用日，年柱月柱取出生瞬间的太阳黄经与节气时刻
（详见 [算法说明书 §14.1](bazi-algorithm.md#141-计时口径只进时柱不进日柱-)）。

**口径在哪里切换**：`BirthForm` 不再提供口径选择（参考盘按真太阳时口径校验）。
切换入口在**四柱页** —— `PillarsGrid` 调 `store.setTimeStandard()`，点击即重排时柱，
两档时钟并列显示便于对照。这是「点一下即时看真 / 平太阳时」的唯一入口。

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
  standardLabel: string                 // "真太阳时" / "北京时间（平太阳时）"
  longitudeDeltaMinutes: number         // (lon − 120) × 4，真太阳时的经度时差项
  equationOfTimeMinutes: number         // 均时差（按出生地平太阳时求值）
  deltaMinutes: number                  // 合计偏移；standard 档为 0，true_solar 档为 经度时差 + EoT
  // 两档时钟并列（无论选哪档都给出，供 UI 对照）
  standardHour: number; standardMinute: number        // 北京时间（= 民用钟表时 = 平太阳时）
  trueSolarHour: number; trueSolarMinute: number      // 真太阳时 = 北京时间 + EoT
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
  coveredFromYear: number  // 本步覆盖的流年起始年（含）
  coveredToYear: number    // 本步覆盖的流年结束年（含）= 下一步起点 − 1
  coveredLabel: string     // "2015–2024"
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
| 1 | `trueSolarTime` | 出生地、经度、时区、口径，以及北京时间（平太阳时）/ 真太阳时两个时钟与选用结果 |
| 2 | `yearPillar` | 出生 UT 儒略日、本年立春时刻与儒略日、命理年、`k_y/i_y/j_y`、阴阳 |
| 3 | `monthPillar` | λ、节起始黄经、月令、节名、节内度数、节后天数与 `k_m/i_m/j_m` |
| 4 | `dayPillar` | 换日流派、所用民用日、JDN、`k_d/i_d/j_d` |
| 5 | `hourPillar` | 口径时钟的小时、时辰名、`k_h/i_h/j_h` |
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
const defaultInput: ChartInput             // 2008-07-16 10:33 男，湖北省/武汉市/江夏区
const sampleInputA: ChartInput             // 校验用例一
const sampleInputB: ChartInput             // 校验用例二

function useChartStore(): ChartStore
```

> 出生地预设城市表 `CITIES` 已移除 —— 地址改由 `core/regions.ts` 的三级级联数据提供
> （见 §17），不再维护第二份城市清单。

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
| `wuXingCount` | `ComputedRef<CountWuXing>` | 五行计数：天干 + 地支**本气**，各计 1（合计 8） |
| `wuXingCountAll` | `ComputedRef<CountWuXing>` | 五行计数：天干 + 地支**全部藏干**（合计 > 8） |
| `wuXingTotal` | `ComputedRef<number>` | 本气视图合计（恒为 8） |
| `luckDirectionLabel` | `ComputedRef<string>` | 顺排 / 逆排（取自 `steps`，不重算） |
| `trueSolarLabel` | `ComputedRef<string>` | 时柱所用时间文本，如 `真太阳时 10:13（−20.5 分）` |
| `clockPair` | `ComputedRef<{key, label, clock}[]>` | 两档对照：平太阳时 / 真太阳时 |
| `selectedPillar` | `Ref<PillarKey>` | 当前选中柱，默认 `'day'`（日主） |
| `selectedTenGodKey` | `Ref<PillarKey>` | 十神面板联动的选中柱 |
| `selectedLuckN` | `Ref<number \| null>` | 当前选中大运步序，`null` = 未选（流年显示全部） |
| `selectedPillarDetail` | `ComputedRef<... \| null>` | 选中柱详情：干支、天干十神、藏干十神、**该柱命中的神煞**、全盘命中 |
| `selectedLuck` | `ComputedRef<LuckStep \| null>` | 选中大运步（未选时取第一步，供高亮/展示） |
| `fullAnnualFortunes` | `ComputedRef<AnnualStep[]>` | 完整流年表（自出生年覆盖到最后一步大运结束） |
| `annualsOfSelectedLuck` | `ComputedRef<AnnualStep[]>` | 选中大运覆盖的流年；未选时给出完整流年表 |
| `isPillarSelected(key)` | `(key: PillarKey) => boolean` | 是否选中某柱 |
| `selectPillar(key)` | `(key: PillarKey) => void` | 选中柱，并联动 `selectedTenGodKey` |
| `selectLuck(n)` | `(n: number) => void` | 选中大运步；再次点同一步则取消（切换语义） |
| `setTimeStandard(v)` | `(v: TimeStandard) => void` | 切换计时口径并**立即重排**（四柱页的切换入口） |
| `calculate()` | `() => void` | 调 `buildChart({...input}, { referenceYear: 当前年 })` |
| `applyInput(next)` | `(next: ChartInput) => void` | 整体替换输入并立即排盘 |
| `patchInput(patch)` | `(patch: Partial<ChartInput>) => void` | 局部更新输入 |
| `reset()` | `() => void` | 恢复默认、清空结果与三个选中项 |
| `exportJson()` | `() => string` | 完整结果 JSON（含 steps），无结果返回 `''` |
| `exportText()` | `() => string` | 文本摘要，无结果返回 `''` |

> **`fullAnnualFortunes` 为什么在 store 里再排一次**：`buildChart` 按技能约定只排 10 年流年，
> 但「点大运看该步流年」需要覆盖到第 10 步（约 100 年）。这里以 `referenceYear = 出生年`
> 调用纯函数 `annualFortunes()` 重排一次 —— 不读系统时钟，结果可复现。

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
  isDayMaster?: boolean    // 高亮日主
  selected?: boolean       // 是否为当前选中柱
  clickable?: boolean      // 是否可点击选择
}
// emits: select —— 点击 / 回车 / 空格 时触发（仅 clickable 为 true 时）
```

其余 7 个组件（`BirthForm` / `PillarsGrid` / `TenGodsPanel` / `LuckCyclesTable` / `AnnualFortuneTable` / `ShenshaList` / `StepDebug`）**无 props、无 emits**：一律通过 `useChartStore()` + `storeToRefs()` 取数，保证单一数据源。选中态（柱 / 十神 / 大运）同样由 store 持有，因此**四柱页与十神页的选中项天然同步**。

### 12.2 职责边界

| 组件 | 职责 | 禁止 |
| --- | --- | --- |
| `BirthForm` | 三级级联选地址 → 写回经纬度时区；收集其余输入 → `store.calculate()` | 不得写算法 |
| `PillarCard` | 展示单柱干支、藏干、十神；可点击发 `select` | 不得计算十神 |
| `PillarsGrid` | 四柱布局 + **计时口径切换** + 选中柱详情 + 五行计数条 | 不得访问 `core` 算法（仅调 store action） |
| `TenGodsPanel` | 展示十神明细与分布；每个干/支可点击选中 | 不得计算五行 |
| `LuckCyclesTable` | 展示大运表；点击某步 → `store.selectLuck()` | 不得排大运 |
| `AnnualFortuneTable` | 展示流年（随选中大运过滤） | 不得算流年 |
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

## 15. `core/wuXing.ts` —— 五行计数

```ts
/** 五行计数表 */
type CountWuXing = Record<WuXingName, number>

function emptyWuXingTally(): CountWuXing

/** 五行索引 → 名（0 木 1 火 2 土 3 金 4 水） */
function wuXingName(index: WuXingIndex): WuXingName

/** 天干索引 → 五行名；越界返回 undefined（不抛错） */
function ganWuXingName(ganIndex: number): WuXingName | undefined

/** 地支索引 → 五行名（本气） */
function zhiWuXingName(zhiIndex: number): WuXingName | undefined

/** 单柱的干、支五行名 */
function pillarWuXing(pillar: { stemIndex: number; branchIndex: number }): {
  stem?: WuXingName
  branch?: WuXingName
}

/** 本气计数：四柱天干 + 四柱地支本气，各计 1（合计恒为 8） */
function countWuXingMajor(pillars: Pillars): CountWuXing

/** 细算：四柱天干 + 地支全部藏干（合计 > 8） */
function countWuXingAll(pillars: Pillars): CountWuXing

/** 计数表合计 */
function wuXingTotal(tally: CountWuXing): number

/** 计数表 → 百分比（条形图用；全零时全为 0） */
function wuXingPercents(tally: CountWuXing): CountWuXing
```

> **回归背景**：这两个计数函数是从 store 里提出来并修正的。旧实现只遍历四柱天干、
> 且手抄了一份「索引 → 五行」数组，导致 `丙戌 庚寅 丁亥 甲辰` 显示 0 土 0 水。
> 现在数据源统一为 `constants.ts` 的 `GAN_META` / `ZHI_META`，并有 8 条用例守着。

---

## 16. `core/regions.ts` —— 行政区划（三级级联）

> **本文件由脚本生成**：`doc/gen_regions.py`，数据源为阿里云 DataV 行政区划公开 GeoJSON。
> 规模：34 省级 / 411 市 / 2792 区县，约 260 KB。生成脚本自带对账（每级数量与 `childrenNum` 一致）。

```ts
interface County { name: string; longitude: number; latitude: number }
interface City { name: string; longitude: number; latitude: number; counties: County[] }
interface Province { name: string; timezone: string; cities: City[] }

/** 全部省 / 自治区 / 直辖市 / 特别行政区 */
const REGIONS: readonly Province[]

/** 按省名取省份 */
function findProvince(name: string): Province | undefined

/** 按省名 + 市名取市 */
function findCity(provinceName: string, cityName: string): City | undefined

/** 按省 / 市 / 区县名取区县 */
function findCounty(provinceName: string, cityName: string, countyName: string): County | undefined

/**
 * 解析三级地址 → 精确坐标与所属时区。
 * 容错：区县留空（如台湾省只选到市）时回退为市级驻地坐标。
 */
function resolveRegion(
  provinceName: string,
  cityName: string,
  countyName: string,
): { county: County; timezone: string } | undefined

/** 地址展示文本：省 / 市 / 区县（缺级自动省略） */
function formatRegionPath(provinceName: string, cityName: string, countyName: string): string
```

**数据结构约定**

| 情形 | 层级形态 | 例子 |
| --- | --- | --- |
| 普通省份 | 省 → 地级市 → 区县 | 湖北省 / 武汉市 / 江夏区 |
| 直辖市 | 省 → 「市辖区」→ 区 | 北京市 / 市辖区 / 东城区 |
| 省直辖县级行政区划 | 省 → 县级市（**自身即区县**） | 河南省 / 济源市 / 济源市 |
| 不设区的地级市 | 省 → 市（**自身即区县**） | 广东省 / 东莞市 / 东莞市 |
| 港澳 | 省 → 区（**区即城市级**，无下级） | 香港特别行政区 / 中西区 / 中西区 |
| 台湾省 | 省 → 市（**无区县层级**） | 台湾省 / 台北市 |

- 坐标取行政区**驻地**坐标（`properties.center`），精度 0.0001°，折合约 10 米，对时差计算绰绰有余。
- 时区：港澳台分别为 `Asia/Hong_Kong` / `Asia/Macau` / `Asia/Taipei`，其余 `Asia/Shanghai`。
- 台湾省在数据源中 `childrenNum=0` 且无 `_full.json`，市清单为脚本内置的主要市。

---

## 17. 相关文档

- [排盘算法说明书](./bazi-algorithm.md) —— 数学模型、公式推导、口径与精度
- [调用关系图](./bazi-call-graph.md) —— 模块依赖、执行链路、Mermaid 图
- [项目 README](../README.md) —— 安装、运行、目录结构、校验用例
