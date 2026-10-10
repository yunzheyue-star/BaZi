---
name: bazi-chart-calculator
description: 根据公历出生时间计算四柱八字、十神、大运、流年、神煞。基于模60编码、太阳黄经、儒略日数和五行生克关系函数。
version: 1.0.0
tags: [bazi, four-pillars, chinese-astrology, calendar]
inputs:
  - birth_datetime: "YYYY-MM-DD HH:mm" (required)
  - gender: male | female (required)
  - longitude: float, default 116.4
  - timezone: string, default "Asia/Shanghai"
  - day_boundary: midnight | zi_hour, default zi_hour
  - true_solar_time: bool, default true
outputs:
  - true_solar_time, solar_term
  - pillars, bazi, hidden_stems
  - ten_gods
  - luck_cycles, annual_fortunes
  - shensha
  - steps
---

# 技能：四柱八字排盘计算器

## 1. 功能概述

将出生时间映射为四柱八字状态，并推导十神、大运、流年、神煞。

核心模型：

- 六十甲子循环：k ∈ Z₆₀
- 天干索引 i = k mod 10
- 地支索引 j = k mod 12
- 太阳黄经定节气
- 儒略日数定日柱
- 五行生克定十神

## 2. 编码表

### 2.1 天干

| i   | 天干 | 五行 w | 阴阳 s |
| --- | ---- | ------ | ------ |
| 0   | 甲   | 0 木   | 0 阳   |
| 1   | 乙   | 0 木   | 1 阴   |
| 2   | 丙   | 1 火   | 0 阳   |
| 3   | 丁   | 1 火   | 1 阴   |
| 4   | 戊   | 2 土   | 0 阳   |
| 5   | 己   | 2 土   | 1 阴   |
| 6   | 庚   | 3 金   | 0 阳   |
| 7   | 辛   | 3 金   | 1 阴   |
| 8   | 壬   | 4 水   | 0 阳   |
| 9   | 癸   | 4 水   | 1 阴   |

公式：

- w(i) = i // 2
- s(i) = i % 2
- 生：(w+1) % 5
- 克：(w+2) % 5

### 2.2 地支

| j   | 地支 | 藏干     |
| --- | ---- | -------- |
| 0   | 子   | 癸       |
| 1   | 丑   | 己 癸 辛 |
| 2   | 寅   | 甲 丙 戊 |
| 3   | 卯   | 乙       |
| 4   | 辰   | 戊 乙 癸 |
| 5   | 巳   | 丙 庚 戊 |
| 6   | 午   | 丁 己    |
| 7   | 未   | 己 丁 乙 |
| 8   | 申   | 庚 壬 戊 |
| 9   | 酉   | 辛       |
| 10  | 戌   | 戊 辛 丁 |
| 11  | 亥   | 壬 甲    |

### 2.3 六十甲子

- k ∈ [0, 59]
- i = k % 10
- j = k % 12
- 反解：k = CRT(i, j; 10, 12)，要求 i ≡ j (mod 2)

## 3. 核心算法

### 3.1 真太阳时

T_solar = T_local + (longitude - 120°) × 4 min + EoT

### 3.2 年柱

以立春为界：
Y* = max{ Y : t ≥ 立春(Y) }
k_y = (Y* - 4) mod 60
i_y = k_y mod 10
j_y = k_y mod 12

### 3.3 月柱

太阳黄经 λ，立春 = 315°：
m = floor( ((λ - 315°) mod 360°) / 30° ) + 1
j_m = (m + 1) mod 12
i_m = (2 * i_y + m + 1) mod 10
k_m = CRT(i_m, j_m)

### 3.4 日柱

JDN = julian_day_number(local_date)
k_d = (JDN + 49) mod 60
i_d = k_d mod 10
j_d = k_d mod 12

### 3.5 时柱

h = 真太阳时小时
j_h = floor( ((h + 1) mod 24) / 2 )
i_h = (2 * i_d + j_h) mod 10
k_h = CRT(i_h, j_h)

### 3.6 十神

以日干 i_d 为"我"：
w_d = i_d // 2，s_d = i_d % 2
对目标天干 i：
w = i // 2，s = i % 2
if w == w_d: s == s_d ? 比肩 : 劫财
elif w == (w_d+1)%5: s == s_d ? 食神 : 伤官
elif w == (w_d+2)%5: s == s_d ? 偏财 : 正财
elif w == (w_d+3)%5: s == s_d ? 七杀 : 正官
elif w == (w_d+4)%5: s == s_d ? 偏印 : 正印

地支十神 = 藏干十神集合。

### 3.7 大运

方向：
d = +1 若 (阳年干且男) 或 (阴年干且女)
d = -1 否则

第 n 步大运：
k_luck(n) = (k_m + d * n) mod 60，n = 1..10

起运：

- 顺排找出生后最近"节"
- 逆排找出生前最近"节"
- Δ = |t_birth - t_jie|
- 起运岁 = Δ / 3天（1天=4月，1时辰=10天）

### 3.8 流年

k_year(Y) = (Y - 4) mod 60

### 3.9 神煞（基础版）

天乙贵人（日干或年干查地支）：
甲戊庚 → [丑, 未]
乙己 → [子, 申]
丙丁 → [亥, 酉]
壬癸 → [卯, 巳]
辛 → [寅, 午]

桃花（年支或日支三合局）：
申子辰 → 酉
寅午戌 → 卯
巳酉丑 → 午
亥卯未 → 子

驿马：
申子辰 → 寅
寅午戌 → 申
巳酉丑 → 亥
亥卯未 → 巳

华盖：
申子辰 → 辰
寅午戌 → 戌
巳酉丑 → 丑
亥卯未 → 未

羊刃（仅阳干）：
甲 → 卯
丙戊 → 午
庚 → 酉
壬 → 子

## 4. 输出 JSON Schema

```json
{
  "input": {
    "birthDatetime": "2008-07-16 10:33",
    "gender": "male",
    "longitude": 116.4,
    "timezone": "Asia/Shanghai",
    "dayBoundary": "zi_hour",
    "trueSolarTime": true
  },
  "trueSolarTime": { "hour": 10, "minute": 13, "deltaMinutes": -20 },
  "solarTerm": { "currentMonthOrder": 6, "lambda": 114.84 },
  "pillars": {
    "year": { "k": 24, "stem": "戊", "branch": "子", "stemIndex": 4, "branchIndex": 0 },
    "month": { "k": 55, "stem": "己", "branch": "未", "stemIndex": 5, "branchIndex": 7 },
    "day": { "k": 53, "stem": "丁", "branch": "巳", "stemIndex": 2, "branchIndex": 4 },
    "hour": { "k": 41, "stem": "乙", "branch": "巳", "stemIndex": 1, "branchIndex": 4 }
  },
  "bazi": "戊子 己未 丁巳 乙巳",
  "hiddenStems": {
    "year": ["癸"],
    "month": ["己", "丁", "乙"],
    "day": ["丙", "庚", "戊"],
    "hour": ["丙", "庚", "戊"]
  },
  "tenGods": {
    "yearStem": "伤官",
    "monthStem": "食神",
    "hourStem": "偏印",
    "branches": {
      "year": ["七杀"],
      "month": ["食神", "比肩", "偏印"],
      "day": ["劫财", "正财", "伤官"],
      "hour": ["劫财", "正财", "伤官"]
    }
  },
  "luckCycles": [
    { "n": 1, "k": 56, "ganzhi": "庚申", "startAge": 8 },
    { "n": 2, "k": 57, "ganzhi": "辛酉", "startAge": 18 }
  ],
  "annualFortunes": [
    { "year": 2008, "k": 24, "ganzhi": "戊子" },
    { "year": 2009, "k": 25, "ganzhi": "己丑" }
  ],
  "shensha": {
    "天乙贵人": false,
    "桃花": false,
    "驿马": false,
    "华盖": true,
    "羊刃": false
  },
  "steps": [{ "name": "trueSolarTime", "formula": "...", "inputs": {}, "output": {} }]
}
```

## 5. 前端集成约定

### 5.1 core 层纯函数签名

```ts
// core/ganzhi.ts
export function crt(stemIndex: number, branchIndex: number): number
export function decodeGanzhi(k: number): { stemIndex; branchIndex; stem; branch }
export function makePillar(stemIndex: number, branchIndex: number): Pillar
export function pillarFromK(k: number): Pillar

// core/pillars.ts
export function yearPillar(metaphysicalYear: number): Pillar
export function monthPillar(yearStemIndex: number, monthOrder: number): Pillar
export function dayPillar(jdn: number): Pillar
export function hourPillar(dayStemIndex: number, hour: number): Pillar

// core/luck.ts
export function luckCycles(monthPillar, yearStemIndex, gender, startAge, n): LuckStep[]
export function annualFortunes(startYear, count): AnnualStep[]

// core/chart.ts
export function buildChart(input: ChartInput): ChartResult
```

### 5.2 steps 中间量格式

```ts
interface Step {
  name: string // 例如 "yearPillar"
  formula: string // 例如 "k_y = (2008 - 4) mod 60"
  inputs: Record<string, unknown>
  output: unknown
}
```

buildChart 必须依次记录：

1. trueSolarTime
2. yearPillar
3. monthPillar
4. dayPillar
5. hourPillar
6. tenGods
7. luckCycles

### 5.3 Pinia store 约定

```ts
export const useChartStore = defineStore('chart', () => {
  const input = ref<ChartInput>(defaultInput)
  const result = ref<ChartResult | null>(null)
  const error = ref<string | null>(null)
  function calculate() {
    /* 调用 buildChart */
  }
  function reset() {
    /* 清空 */
  }
  function exportJson() {
    /* 返回 JSON 字符串 */
  }
  return { input, result, error, calculate, reset, exportJson }
})
```

### 5.4 组件职责边界

| 组件               | 职责                           | 禁止           |
| ------------------ | ------------------------------ | -------------- |
| BirthForm          | 收集输入，调用 store.calculate | 不得写算法     |
| PillarCard         | 展示单柱干支、藏干、十神       | 不得计算十神   |
| PillarsGrid        | 布局四柱                       | 不得访问 core  |
| TenGodsPanel       | 展示十神                       | 不得计算五行   |
| LuckCyclesTable    | 展示大运表                     | 不得排大运     |
| AnnualFortuneTable | 展示流年                       | 不得算流年     |
| ShenshaList        | 展示神煞                       | 不得查表       |
| StepDebug          | 展示 steps                     | 不得修改 steps |

## 6. 校验用例

| 公历时间            | 四柱                |
| ------------------- | ------------------- |
| 2008-07-16 10:33 男 | 戊子 己未 丁巳 乙巳 |
| 2000-01-01 00:00 男 | 己卯 丙子 戊午 壬子 |
| 1984-02-04 23:30 男 | 甲子 丙寅 丁丑 壬子 |
| 2024-02-04 16:27 男 | 甲辰 丙寅 己亥 壬申 |

## 7. 边界与流派配置

| 配置项   | 默认     | 可选       |
| -------- | -------- | ---------- |
| 换日     | 子时换日 | 午夜换日   |
| 真太阳时 | 开       | 关         |
| 均时差   | 开       | 关         |
| 大运起运 | 3天=1年  | 精确到分钟 |
| 神煞表   | 通用版   | 门派版     |

## 8. 调用方式

Agent 收到用户出生信息后：

1. 解析 birthDatetime、gender、longitude
2. 计算真太阳时
3. 查立春时刻定年柱
4. 查节气定月柱
5. 计算 JDN 定日柱
6. 五鼠遁定时柱
7. 计算十神、藏干
8. 按性别和年干阴阳排大运
9. 生成未来 10 年流年
10. 查神煞表
11. 输出 JSON + 文本摘要

---

**技能结束。**
