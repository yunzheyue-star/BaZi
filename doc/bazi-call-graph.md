# 调用关系图

> 适用版本：`bazi@0.0.0` ｜ 接口见 [接口文档](./bazi-api.md)，算理见 [算法说明书](./bazi-algorithm.md)
> 所有图均为 Mermaid，GitHub / VS Code / Typora 可直接渲染；括号内为源码位置。

## 目录

1. [分层架构](#1-分层架构)
2. [模块依赖图](#2-模块依赖图)
3. [`buildChart` 执行时序](#3-buildchart-执行时序)
4. [数据变换链路](#4-数据变换链路)
5. [函数级调用树](#5-函数级调用树)
6. [组件树与数据来源](#6-组件树与数据来源)
7. [状态流转](#7-状态流转)
8. [依赖规则与反例](#8-依赖规则与反例)

---

## 1. 分层架构

依赖只能自上而下，箭头方向 = 允许的 import 方向。

```mermaid
flowchart TD
    subgraph L5["表现层 · components/"]
        C1["BirthForm"]
        C2["PillarsGrid"]
        C3["PillarCard"]
        C4["TenGodsPanel"]
        C5["LuckCyclesTable"]
        C6["AnnualFortuneTable"]
        C7["ShenshaList"]
        C8["StepDebug"]
        C0["App.vue"]
    end

    subgraph L4["状态层 · stores/"]
        S1["chart.ts<br/>useChartStore"]
    end

    subgraph L3["组合层 · composables/"]
        H1["useBazi"]
    end

    subgraph L2["计算层 · core/ 纯函数"]
        K1["chart.ts"]
        K2["pillars.ts"]
        K3["calendar.ts"]
        K4["ganzhi.ts"]
        K5["constants.ts"]
        K6["tenGods.ts"]
        K7["luck.ts"]
        K8["shensha.ts"]
        K9["wuXing.ts"]
        K10["regions.ts<br/>行政区划数据（脚本生成）"]
    end

    subgraph L1["类型层 · types/"]
        T1["bazi.ts"]
    end

    C0 --> S1
    C1 --> S1
    C2 --> S1
    C3 --> K5
    C4 --> S1
    C5 --> S1
    C6 --> S1
    C7 --> S1
    C8 --> S1
    C1 --> K10

    S1 --> K1
    S1 --> K5
    S1 --> K9
    S1 --> K7
    H1 --> K1

    K1 --> K2
    K1 --> K3
    K1 --> K4
    K1 --> K5
    K1 --> K6
    K1 --> K7
    K1 --> K8

    K2 --> K3
    K2 --> K4
    K6 --> K4
    K6 --> K5
    K7 --> K4
    K7 --> K5
    K7 --> K6
    K8 --> K5
    K9 --> K5
    K9 --> K4

    K1 -.-> T1
    K2 -.-> T1
    K3 -.-> T1
    K4 -.-> T1
    K6 -.-> T1
    K7 -.-> T1
    K8 -.-> T1
    K9 -.-> T1
    S1 -.-> T1

    K5 -.->|"展示层直连的 core 模块（只取颜色与汉字表）"| C3
    K10 -.->|"展示层直连：三级级联地址数据"| C1

    classDef pure fill:#e8f2ff,stroke:#3a6fbf,color:#12305c
    classDef data fill:#f3e8ff,stroke:#7c3aed,color:#2e1065
    classDef state fill:#fff4e5,stroke:#a9762f,color:#4a2f0b
    classDef view fill:#eefaf1,stroke:#2f9e6f,color:#0d3a22
    class K1,K2,K3,K4,K5,K6,K7,K8,K9 pure
    class K10 data
    class S1,H1 state
    class C0,C1,C2,C3,C4,C5,C6,C7,C8 view
```

**读图要点**

- `core/` 只依赖 `types/`，**零** Vue / Pinia 依赖 —— 所以 `vitest` 能直接测它，不需要挂载组件。
- 展示层唯一直接接触 `core` 的是 `PillarCard` 读 `constants.ts` 的颜色表（纯查表，无算法），
  其余组件一律经 store 取数。
- `useBazi`（composable）与 store 是**并列**的两条调用路径：store 是应用主路径，
  composable 面向复用（例如将来做多盘对比）。

---

## 2. 模块依赖图

只画 `core/` 内部，标出每个模块依赖谁 —— 无环，且方向单一。

```mermaid
flowchart LR
    chart["chart.ts<br/>编排 + steps"]
    pillars["pillars.ts<br/>四柱 + 换日"]
    calendar["calendar.ts<br/>JDN / 黄经 / 节气 / 真太阳时"]
    ganzhi["ganzhi.ts<br/>六十甲子 / CRT / mod"]
    constants["constants.ts<br/>查表"]
    tenGods["tenGods.ts<br/>十神"]
    luck["luck.ts<br/>大运 / 流年"]
    shensha["shensha.ts<br/>神煞"]
    wuXing["wuXing.ts<br/>五行计数"]
    regions["regions.ts<br/>行政区划（脚本生成）"]
    types["types/bazi.ts"]

    chart --> pillars
    chart --> calendar
    chart --> ganzhi
    chart --> constants
    chart --> tenGods
    chart --> luck
    chart --> shensha
    wuXing --> constants
    wuXing --> ganzhi
    regions --> types
    pillars --> calendar
    pillars --> ganzhi
    tenGods --> ganzhi
    tenGods --> constants
    luck --> ganzhi
    luck --> constants
    luck --> tenGods
    shensha --> constants
    ganzhi --> constants
    calendar --> ganzhi
    calendar --> constants

    chart -.-> types
    ganzhi -.-> types
    calendar -.-> types
    pillars -.-> types
    tenGods -.-> types
    luck -.-> types
    shensha -.-> types
    wuXing -.-> types

    classDef leaf fill:#f5f7fa,stroke:#6b7280,color:#1f2329
    class constants,ganzhi leaf
```

**关键观察**

- `constants.ts` 与 `ganzhi.ts` 是**叶子层**（`constants` 不依赖任何同层模块，`ganzhi` 只依赖 `constants`），
  所有查表与模运算都下沉到这里 —— 这正是「所有查表放 constants、所有模运算放 ganzhi」的落地结果。
- `calendar.ts → ganzhi.ts` 只为取一个 `mod()`；这是 core 内部最小的合理耦合。
- `luck.ts → tenGods.ts` 是为了给流年补十神标注，方向是单向的，`tenGods` 不知道 `luck` 存在。
- `wuXing.ts` 只依赖 `constants`（五行归属表）与 `ganzhi`（藏干查表），与 `chart.ts` 平级：
  它是**独立可测的派生计算**，由 store 直接调用，不经过 `buildChart`（五行不进 `ChartResult`）。
- `regions.ts` 是**纯数据模块**（脚本生成的行政区划表），不依赖任何同层模块，只导出类型。
  它与 `constants.ts` 的区别：`constants` 是命理常量（天干地支等），`regions` 是地理数据。
- **无环**：任意两模块之间不存在双向依赖。

---

## 3. `buildChart` 执行时序

`store.calculate()` → `buildChart(input, { referenceYear })` 内部的真实调用顺序（与 `steps` 顺序一致）。

```mermaid
sequenceDiagram
    autonumber
    participant UI as BirthForm
    participant ST as useChartStore
    participant CH as core/chart.ts
    participant CA as core/calendar.ts
    participant PL as core/pillars.ts
    participant GZ as core/ganzhi.ts
    participant CO as core/constants.ts
    participant TG as core/tenGods.ts
    participant LK as core/luck.ts
    participant SS as core/shensha.ts

    UI->>ST: calculate()
    ST->>CH: buildChart(input, { referenceYear })

    Note over CH: 输入校验
    CH->>CA: parseDatetime(birthDatetime)
    CA-->>CH: CivilDateTime（非法格式抛中文错误）
    CH->>CH: timezoneOffsetMinutes(civil, timezone)
    CH->>CA: julianDay(civil) → birthJdUt = local − offset/1440

    Note over CH: ① 计时口径（两档时钟并列，只有时柱消费）
    CH->>CA: trueSolarCorrection(civilUt, longitude, 120)
    CA->>CA: equationOfTime(jd) ← solarApparentLongitude(jd)
    CA-->>CH: { longitudeDelta, eot, delta }
    CH->>CH: 平太阳时 = 民用钟表时（北京时间，不修正）
    CH->>CH: 真太阳时 = 北京时间 + 均时差
    CH->>CH: 按 input.timeStandard 选一个给时柱

    Note over CH: ② 年柱（立春为界）
    CH->>CA: solarApparentLongitude(birthJdUt)
    CA-->>CH: λ
    CH->>CA: solarTermMoment(year, 0)
    CA->>CA: 牛顿迭代求 λ = 315°
    CA-->>CH: 立春时刻 jd
    CH->>PL: metaphysicalYear / yearPillar(mYear)
    PL->>GZ: makePillar(i_y, j_y)
    GZ->>GZ: crt(i, j)
    GZ-->>PL: Pillar
    PL-->>CH: 年柱

    Note over CH: ③ 月柱（节气为界）
    CH->>CA: monthOrderFromLambda(λ)
    CA-->>CH: m
    CH->>PL: monthPillar(i_y, m)
    PL->>GZ: makePillar(i_m, j_m)
    GZ-->>PL: Pillar
    PL-->>CH: 月柱（k_m 供大运复用）

    Note over CH: ④ 日柱（JDN，真太阳时不参与）
    CH->>PL: resolveDayDate(civil, dayBoundary)
    PL-->>CH: 日柱所用民用日
    CH->>CA: julianDayNumber(dayDate)
    CA-->>CH: JDN
    CH->>PL: dayPillar(JDN)
    PL->>GZ: makePillar(k_d mod 10, k_d mod 12)
    GZ-->>PL: Pillar
    PL-->>CH: 日柱

    Note over CH: ⑤ 时柱（口径选出的时钟 + 五鼠遁）
    CH->>PL: shiChenIndex(选定时钟的小时) / hourPillar(i_d, h)
    PL->>GZ: makePillar(i_h, j_h)
    GZ-->>PL: Pillar
    PL-->>CH: 时柱

    Note over CH: ⑥ 藏干与十神
    CH->>GZ: hiddenStemIndexes(各支)
    GZ->>CO: ZHI_META 查表
    CO-->>GZ: 藏干索引
    GZ-->>CH: 藏干
    CH->>TG: tenGod(i_d, 目标干) × 天干与全部藏干
    TG->>GZ: ganWuXing / ganYinYang
    TG->>CO: TEN_GODS 表
    CO-->>TG: 十神名
    TG-->>CH: 十神（含地支十神数组）

    Note over CH: ⑦ 大运
    CH->>LK: luckDirection(i_y, gender)
    LK-->>CH: d = ±1
    CH->>LK: startAgeFromDays(Δ)
    LK-->>CH: { exact, ceiled }
    CH->>LK: luckCycles(月柱, d, startAgeExact, birthYear, 10)
    LK->>GZ: decodeGanzhi((k_m + d·n) mod 60)
    GZ-->>LK: GanzhiParts
    LK-->>CH: LuckStep[]

    Note over CH: ⑧ 流年 与 ⑨ 神煞
    CH->>LK: annualFortunes(startYear, 10, i_d, j_d, birthYear)
    LK->>TG: tenGod(i_d, 流年天干)
    TG-->>LK: 十神
    LK-->>CH: AnnualStep[]
    CH->>SS: shensha(pillars, i_d, i_y)
    SS->>CO: TIAN_YI_GUI_REN / 三合局 / YANG_REN
    CO-->>SS: 目标地支
    SS-->>CH: Shensha

    CH-->>ST: ChartResult（7 个 steps + bazi）
    ST-->>UI: 响应式更新 → 各展示组件重渲染
```

---

## 4. 数据变换链路

从输入到四柱的每一步变换，标注中间量的真实字段名（可在 `StepDebug` 面板逐项核对）。

```mermaid
flowchart LR
    A["input.birthDatetime<br/>2008-07-16 10:33"] --> B["parseDatetime<br/>CivilDateTime"]
    B --> C["timezoneOffsetMinutes<br/>+480 min"]
    C --> D["birthJdUt<br/>2454663.60"]
    B --> E["julianDay − offset<br/>→ civilUt"]
    E --> F["trueSolarCorrection<br/>经度时差 −14.4（仅展示）/ EoT −6.08"]
    F --> G0["平太阳时（北京时间）10:33"]
    F --> G2["真太阳时 10:27"]
    G0 --> G{"input.timeStandard<br/>挑选时柱所用时间"}
    G2 --> G

    D --> H["solarApparentLongitude<br/>λ = 113.9414°"]
    D --> I["solarTermMoment(2008, 0)<br/>立春 2454505.30"]
    I --> J["metaphysicalYear<br/>2008"]
    J --> K["yearPillar<br/>k_y = 24 → 戊子"]

    H --> L["monthOrderFromLambda<br/>m = 6"]
    K --> M["monthPillar(i_y=4, m=6)<br/>k_m = 55 → 己未"]

    B --> N["resolveDayDate<br/>2008-07-16"]
    N --> O["julianDayNumber<br/>JDN = 2454664"]
    O --> P["dayPillar<br/>k_d = 53 → 丁巳"]

    G --> Q["shiChenIndex<br/>j_h = 5 巳时"]
    P --> R["hourPillar(i_d=3, h=10)<br/>k_h = 41 → 乙巳"]

    K --> S["四柱 Pillars"]
    M --> S
    P --> S
    R --> S
    S --> T["bazi<br/>戊子 己未 丁巳 乙巳"]
    S --> U["hiddenStems 查表"]
    P --> V["tenGods（以 i_d=3 为「我」）"]
    U --> V
    S --> V2["countWuXingMajor / countWuXingAll<br/>木1 火3 土3 金0 水1"]

    H --> W["daysToNextTerm<br/>21.37 天"]
    M --> X["luckCycles<br/>k_m + d·n"]
    W --> X
    P --> Y["annualFortunes<br/>k_year(Y)"]
    S --> Z["shensha<br/>五类查表"]

    X --> R2["ChartResult"]
    Y --> R2
    Z --> R2
    V --> R2
    V2 --> R2
    T --> R2

    classDef num fill:#fff8e1,stroke:#c2a13a,color:#4a3a05
    class D,F,H,I,O,W num
```

---

## 5. 函数级调用树

`buildChart` 之下每个被调函数的清单（按调用先后），`⚠️` 标记会抛错的函数。

```mermaid
flowchart TD
    BC["buildChart(input, options)"]

    BC --> A1["parseDatetime ⚠️"]
    BC --> A2["timezoneOffsetMinutes ⚠️"]
    BC --> A3["julianDay / julianDayNumber"]
    BC --> A4["fromJulianDay"]
    BC --> A5["trueSolarCorrection"]
    BC --> A6["solarApparentLongitude"]
    BC --> A7["solarTermMoment"]
    BC --> A8["monthOrderFromLambda"]
    BC --> A9["resolveDayDate"]
    BC --> A10["shiChenIndex"]
    BC --> A11["shensha"]

    A5 --> B1["equationOfTime"]
    B1 --> B2["solarApparentLongitude"]
    B1 --> B3["daysSinceJ2000"]

    A6 --> B3
    A7 --> B4["牛顿迭代 ×≤12"]
    B4 --> A6
    B3 --> C1["sinDeg / cosDeg"]

    BC --> P1["yearPillar"]
    BC --> P2["metaphysicalYear"]
    BC --> P3["monthPillar"]
    BC --> P4["dayPillar"]
    BC --> P5["hourPillar"]
    P1 --> G1["makePillar → crt ⚠️"]
    P3 --> G1
    P4 --> G2["mod(k_d + 49, 60)"]
    P4 --> G1
    P5 --> G1

    BC --> T1["tenGod"]
    BC --> T2["branchTenGods"]
    T2 --> G3["hiddenStemIndexes → ZHI_META"]
    T2 --> T1
    T1 --> G4["ganWuXing / ganYinYang"]
    T1 --> C2["TEN_GODS 表"]

    BC --> L1["luckDirection"]
    BC --> L2["startAgeFromDays"]
    BC --> L3["luckCycles"]
    BC --> L4["annualFortunes"]
    L3 --> G5["decodeGanzhi"]
    L4 --> T1
    L4 --> C3["isLiuChong / isLiuHe"]

    A11 --> C4["TIAN_YI_GUI_REN"]
    A11 --> C5["sanHeHead → taoHuaOf / yiMaOf / huaGaiOf"]
    A11 --> C6["YANG_REN"]

    BC --> Z1["round / pad2 / formatCivil（内部格式化）"]
    BC --> Z2["steps.push × 7"]

    classDef err fill:#fdecec,stroke:#b3261e,color:#5c120e
    class A1,A2,G1 err
```

---

## 6. 组件树与数据来源

```mermaid
flowchart TD
    MAIN["main.ts<br/>createApp + createPinia + styles.css"] --> APP["App.vue"]
    APP --> BF["BirthForm"]
    APP --> PG["PillarsGrid"]
    APP --> TGP["TenGodsPanel"]
    APP --> SL["ShenshaList"]
    APP --> LCT["LuckCyclesTable"]
    APP --> AFT["AnnualFortuneTable"]
    APP --> SD["StepDebug"]

    PG --> PC["PillarCard ×4"]

    STORE[("useChartStore | input / result / error + 三个选中态")]

    BF -->|"三级级联 → patchInput(longitude/timezone/birthPlace)"| STORE
    BF -->|"calculate() / sampleInputA/B"| STORE
    PG -->|"result / pillarList / wuXingCount / clockPair"| STORE
    PG -->|"selectPillar() / setTimeStandard()"| STORE
    TGP -->|"result.tenGods / selectedPillar"| STORE
    TGP -->|"selectPillar()"| STORE
    SL -->|"result.shensha"| STORE
    LCT -->|"result.luckCycles / selectedLuckN"| STORE
    LCT -->|"selectLuck()"| STORE
    AFT -->|"annualsOfSelectedLuck / selectedLuck"| STORE
    SD -->|"result.steps / exportJson()"| STORE
    PC -->|"props：pillar / … / selected / clickable"| PG
    PC -->|"仅取颜色与汉字表"| CONST["core/constants.ts"]
    BF -->|"REGIONS / resolveRegion"| REG["core/regions.ts"]

    STORE -->|"buildChart()（含 setTimeStandard 重新排盘）"| CORE["core/chart.ts"]
    STORE -->|"annualFortunes()（完整流年表）"| LUCK["core/luck.ts"]
    STORE -->|"countWuXingMajor / countWuXingAll"| WX["core/wuXing.ts"]

    classDef ui fill:#eefaf1,stroke:#2f9e6f,color:#0d3a22
    classDef data fill:#fff4e5,stroke:#a9762f,color:#4a2f0b
    class APP,BF,PG,PC,TGP,SL,LCT,AFT,SD,MAIN ui
    class STORE data
```

**数据流方向**：组件 →（action）→ store →（纯函数）→ core →（返回值）→ store →（响应式）→ 组件。
没有任何组件直接调 `core` 的算法函数；组件之间只下传展示 props（`PillarCard` 收 `PillarsGrid` 的 props）。

**两个"展示层直连 core"的例外，都是纯数据/纯查表**：`PillarCard` ← `constants.ts`（五行颜色），
`BirthForm` ← `regions.ts`（行政区划三级数据）。算法调用一律经 store。

**跨组件选中态统一放 store**：`selectedPillar` / `selectedTenGodKey` / `selectedLuckN`。
因此四柱页、十神页、大运页、流年页四处的高亮与过滤天然同步，不需要组件间通信。

---

## 7. 状态流转

```mermaid
stateDiagram-v2
    [*] --> 初始: 挂载 App
    初始 --> 已出盘: onMounted → calculate()（默认输入）
    已出盘 --> 计算中: 用户改输入并点「排盘」
    计算中 --> 已出盘: buildChart 成功 → result 赋值
    计算中 --> 错误: buildChart 抛错（格式/时区/经度）
    错误 --> 计算中: 修正输入后重试
    错误 --> 初始: store.reset() / 清空
    已出盘 --> 初始: store.reset() / 清空

    note right of 错误
        error 写入中文信息
        result 置 null
        组件只渲染错误条，不做 try/catch
    end note

    note right of 已出盘
        steps 七项齐备
        StepDebug 可展开逐项核对
    end note
```

---

## 8. 依赖规则与反例

### 8.1 允许

| 方向 | 例子 |
| --- | --- |
| `components` → `stores` | `BirthForm` 调 `store.calculate()`；`PillarsGrid` 调 `setTimeStandard()` |
| `components` → `core/constants` | `PillarCard` 取五行颜色（纯查表） |
| `components` → `core/regions` | `BirthForm` 取三级行政区划（纯数据） |
| `stores` → `core` | `chart.ts` 调 `buildChart()` / `annualFortunes()` / `countWuXingMajor()` |
| `composables` → `core` | `useBazi.run()` 调 `buildChart()` |
| `core` 内部向下 | `chart` → `pillars` → `ganzhi` → `constants` |

### 8.2 禁止（若出现即为设计事故）

```mermaid
flowchart LR
    BAD1["components/*"] -->|"❌ 直接调 buildChart"| BAD2["core/chart.ts"]
    BAD3["core/*"] -->|"❌ import vue / pinia"| BAD4["框架 API"]
    BAD5["components/*"] -->|"❌ 组件之间传业务数据"| BAD6["components/*"]
    BAD7["core/*"] -->|"❌ 读写 localStorage / fetch"| BAD8["外部 I/O"]

    classDef bad fill:#fdecec,stroke:#b3261e,color:#5c120e
    class BAD1,BAD2,BAD3,BAD4,BAD5,BAD6,BAD7,BAD8 bad
```

**为什么这几条必须守住**

1. 组件直接调 `core`：绕过 store 的单一数据源，改一个地方要改多处，且 `steps` 与 UI 可能不同步。
2. `core` 引入框架：`vitest` 就得起 jsdom 才能测算法，纯函数可测性丧失。
3. 组件互传业务数据：出现「谁是数据主人」的歧义，刷新时序敏感。
4. `core` 做 I/O：纯函数可复现性被破坏，`buildChart` 将无法用于批量校验。

`core` 中唯一的时间依赖是流年起始年，已通过 `options.referenceYear` 显式注入，
使 `buildChart` 在给定 options 下仍是可复现的纯函数（见 [算法说明书 §12](./bazi-algorithm.md#12-流年)）。

---

## 附：一图速览

```mermaid
flowchart TB
    subgraph 输入
        I1["出生时间 · 性别 · 出生地经度 · 时区"]
        I2["换日流派 · 计时口径（平太阳时 / 真太阳时）"]
    end
    subgraph 时钟
        C0["平太阳时 = 民用钟表时<br/>（＝北京时间，不修正）"]
        C2["真太阳时 = 平太阳时 + 均时差"]
    end
    subgraph 天文
        A1["太阳视黄经 λ"]
        A2["节气时刻（牛顿迭代）"]
        A3["均时差 EoT"]
    end
    subgraph 四柱
        P1["年柱 · 立春为界"]
        P2["月柱 · 节气为界"]
        P3["日柱 · JDN（民用日）"]
        P4["时柱 · 口径时钟 + 五鼠遁"]
    end
    subgraph 派生
        D1["藏干 · 十神"]
        D4["五行计数（本气 / 藏干）"]
        D2["大运 · 流年"]
        D3["神煞"]
    end
    subgraph 输出
        O1["ChartResult + bazi"]
        O2["steps ×7（可核对）"]
    end

    I1 --> C0
    A3 --> C2
    C0 --> P4
    C2 --> P4
    I1 --> A1
    A1 --> P2
    A2 --> P1
    I1 --> P3
    P1 --> P2
    P3 --> P4
    P1 --> D1
    P2 --> D1
    P3 --> D1
    P4 --> D1
    D1 --> D4["五行计数<br/>本气 / 藏干两口径"]
    P2 --> D2
    P1 --> D2
    P3 --> D3
    P1 --> D3
    D1 --> O1
    D4 --> O1
    D2 --> O1
    D3 --> O1
    A1 --> O2
    A2 --> O2
    C0 --> O2
    C2 --> O2
```
