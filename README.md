# 四柱八字排盘（BaZi）

Vue 3 + TypeScript + Vite + Pinia + Vitest 实现的四柱八字排盘 Web 应用。
计算逻辑严格按 [`doc/bazi-chart-calculator.skill.md`](doc/bazi-chart-calculator.skill.md) 的数学模型实现，
`src/core/` 全部为纯函数，可脱离 Vue 单独单测。

## 本地运行

```sh
npm install          # 安装依赖
npm run dev          # 开发服务器（默认 http://localhost:5173）
npm run build        # 类型检查 + 生产构建，产物在 dist/
npm run preview      # 预览构建产物
npm run test:unit    # Vitest（core 校验用例 + 组件挂载）
npm run type-check   # vue-tsc --build
npm run format       # oxfmt 格式化 src/
```

> 本仓库**没有引入 dayjs**：日期时间用浏览器内置 `Intl`（时区偏移反解）+ 自实现儒略日算法，
> 已足够且零运行时开销。若后续需要本地化展示（相对时间、多语言格式），再按需引入。

## 目录结构

```
src/
├── main.ts                    # 应用入口（Pinia 挂载 + 全局样式）
├── App.vue                    # 排盘页外壳：只做布局与组件编排
├── styles.css                 # 全局主题变量与 .card 通用样式
├── stores/chart.ts            # Pinia：input / result / error / calculate / reset / exportJson
├── composables/useBazi.ts     # 组合式封装：调用 core，接住中文错误
├── core/                      # 纯函数，无 Vue 依赖，可单测
│   ├── constants.ts           # 天干/地支/藏干/五行/节气/神煞 查表 + 查表函数
│   ├── ganzhi.ts              # 六十甲子、CRT、编码解码、模运算
│   ├── calendar.ts            # JDN、太阳视黄经、节气时刻、真太阳时、均时差、时区偏移
│   ├── pillars.ts             # 年柱/月柱/日柱/时柱/换日流派
│   ├── tenGods.ts             # 十神
│   ├── luck.ts                # 大运、流年
│   ├── shensha.ts             # 神煞
│   └── chart.ts               # 总入口 buildChart(input, options) + steps 中间量
├── components/                # 8 个展示组件，均不写算法
│   ├── BirthForm.vue          # 收集输入 → store.calculate
│   ├── PillarCard.vue         # 单柱：干支 / 藏干 / 十神
│   ├── PillarsGrid.vue        # 四柱布局 + 五行计数
│   ├── TenGodsPanel.vue       # 十神明细与分布
│   ├── LuckCyclesTable.vue    # 大运表
│   ├── AnnualFortuneTable.vue # 流年表
│   ├── ShenshaList.vue        # 神煞命中与说明
│   └── StepDebug.vue          # steps 中间量（含 JSON 复制/下载）
├── types/bazi.ts              # 全部类型（索引用字面量联合，禁止 any）
└── tests/core.test.ts         # core 层单元测试
```

## 算法对应表

| 环节 | 公式（技能章节） | 实现位置 |
| --- | --- | --- |
| 六十甲子 | `i = k mod 10`，`j = k mod 12`（§2.3） | `core/ganzhi.ts` |
| CRT 反解 | `k = CRT(i, j; 10, 12)`，要求 `i ≡ j (mod 2)` | `core/ganzhi.ts` |
| 真太阳时 | `T_solar = T_local + (lon − 120°) × 4min + EoT`（§3.1） | `core/calendar.ts` |
| 年柱 | `Y* = max{Y : t ≥ 立春(Y)}`，`k_y = (Y* − 4) mod 60`（§3.2） | `core/pillars.ts` |
| 月柱 | `m = floor(((λ − 315°) mod 360°)/30°) + 1`，`j_m = (m+1) mod 12`，`i_m = (2·i_y + m + 1) mod 10`（§3.3） | `core/pillars.ts` |
| 日柱 | `k_d = (JDN + 49) mod 60`（§3.4） | `core/pillars.ts` |
| 时柱 | `j_h = floor(((h+1) mod 24)/2)`，`i_h = (2·i_d + j_h) mod 10`（§3.5） | `core/pillars.ts` |
| 十神 | 五行生克 + 同异阴阳（§3.6） | `core/tenGods.ts` |
| 大运 | `d = +1` 阳男阴女否则 `−1`；`k_luck(n) = (k_m + d·n) mod 60`；起运 `Δ/3` 天（§3.7） | `core/luck.ts` |
| 流年 | `k_year(Y) = (Y − 4) mod 60`（§3.8） | `core/luck.ts` |
| 神煞 | 天乙贵人 / 桃花 / 驿马 / 华盖 / 羊刃（§3.9） | `core/shensha.ts` |
| 中间量 | 七个 step：trueSolarTime → yearPillar → monthPillar → dayPillar → hourPillar → tenGods → luckCycles（§5.2） | `core/chart.ts` |

## 流派与口径（重要）

技能文档 §7 给的是可选流派，本实现把口径显式化，避免同名不同盘：

1. **计时口径两档（决定时柱用哪个时间）**

   | 口径 | 时柱所用时间 | 偏移（2008-07-16 北京） |
   | --- | --- | --- |
   | 北京时间 `standard` | 民用钟表时（东经 120° 标准时） | 0 → 10:33 |
   | 真太阳时 `true_solar` | 北京时间 + 均时差 EoT | −6.1 分 → 10:27 |

   **本系统的「平太阳时」就是北京时间**：区时本身就是平太阳时的一种，所以不单列一档。
   出生地经度 `(lon − 120°) × 4` 仅作展示与出生地留痕，**不计入任何一档的修正量**。
   两个时钟在结果里永远并列给出，UI 会一起显示并标出「时柱采用」的那一档。

2. **口径只进时柱，不进日柱。**
   日柱取**民用日**（`k_d = (JDN + 49) mod 60`）；年柱、月柱取出生瞬间（UT 近似）的太阳黄经与节气时刻；
   大运、流年、神煞也不受口径影响。
   理由：§3.4 的日柱公式以当地民用日为输入，§3.1 的真太阳时只出现在 §3.5 时柱公式里；
   且文档 §6 的四组参考盘全部符合此口径（若让真太阳时跨日，2000-01-01 00:00 与
   1984-02-04 23:30 两例的日柱会整体偏移一天，与文档不符）。
   跨时辰的实际影响：2008-07-16 北京时间 21:04（均时差 −6.08 分）→ 真太阳时 20:58，
   北京时间判亥时、真太阳时判戌时；日柱两档一致。
3. **换日流派**（`dayBoundary`）：
   - `midnight`：00:00 起算次日，23:00–23:59 仍属当日；
   - `zi_hour`：23:00 起即算次日，日柱与日干提前进位，时柱随之重排。
   两者只对 23:00–23:59 出生的人产生差异。
4. **起运**：1 天 = 4 个月、1 时辰 = 10 天，`起运岁 = Δ / 3`；UI 展示「不足一年进位」的岁数
   （2008-07-16 例：距立秋 21.67 天 → 7.22 岁 → 显示 8 岁，与文档示例一致），
   同时保留 `startAgeExact` 精确值。
5. **流年起始年**由 `buildChart(input, { referenceYear })` 注入，`core` 因此保持可复现的纯函数；
   UI 传当前年份，测试传固定年份。

## 界面版式

四柱为**上下结构**：天干在上、地支在下，中间一条肩线分隔（`.char.stem` 的 `border-bottom`）：

```
丙    庚    丁    甲
戌    寅    亥    辰
```

版式规格由 `doc/render-layout-spec.py` 按组件实际 CSS 数值重绘并做几何检查
（肩线是否落在两字之间、四柱是否溢出卡片等），输出见 `layout-pillars.png`：

```sh
<python> doc/render-layout-spec.py
```

## 五行计数

界面上的五行条有**两种口径**，默认是本气口径：

| 口径 | 算法 | 合计 | 2008 例（戊子 己未 丁巳 乙巳） |
| --- | --- | --- | --- |
| 天干 + 地支本气（默认） | 4 天干 + 4 地支本气各计 1 | 恒为 8 | 木1 火3 土3 金0 水1 |
| 天干 + 地支全部藏干 | 再加中气、余气 | > 8 | 木2 火4 土5 金2 水1（合计 14） |

实现在 `core/wuXing.ts`，数据源统一为 `constants.ts` 的 `GAN_META` / `ZHI_META`。

> **已修 bug（重要）**：早期实现只遍历四柱**天干**，漏掉地支，且手抄了一份五行表。
> 结果像 `丙戌 庚寅 丁亥 甲辰` 这种天干不含土、水的命盘会显示 **0 土 0 水**
> （实际 土 2、水 1），而界面标题却写着「天干 + 地支本气」——**标签承诺了、实现没做**。
> 修复后由 `src/tests/wuXing.test.ts` 的 8 条用例守着，含该盘的精确计数与干支遍历回归。

## 精度声明与 TODO

- 太阳视黄经用「平黄经 + 中心差 + 主要摄动项 + 光行差」简化解析式。
  **实测**（见 `src/tests/accuracy.test.ts`）跨 1984–2024 六个节气时刻，与公开值相差
  **−6 ~ +10 分钟**（折合黄经约 ±0.007°）：
  2024 立春 −3、2024 惊蛰 −6、2008 立春 +7、2008 立秋 0、2000 立春 −3、1984 立春 +10（单位：分钟）。
- 未计入 ΔT（TT − UT）：2000 年前后约 +64 秒，1984 年约 +54 秒，量级 1 分钟，被容差覆盖。
- **实用判据**：出生时刻距节气 **15 分钟以内**时建议人工复核年柱/月柱；超出该窗口判定可靠。
- `TODO(astro)`：替换为 skyfield / ephem / astronomia 的 VSOP87D 并把 ΔT 纳入，
  可把节气误差压到秒级。替换点集中在 `core/calendar.ts` 的 `solarApparentLongitude()` 与 `solarTermMoment()`，
  其余逻辑（四柱、十神、大运等）无需改动。

## 校验用例

| 测试文件 | 项数 | 覆盖 |
| --- | --- | --- |
| `src/tests/core.test.ts` | 36 | 八字硬校验、JDN/CRT/十神/大运/换日、两档时钟、异常输入、steps 契约 |
| `src/tests/accuracy.test.ts` | 9 | 节气精度回归（±20 分钟容差）、时区偏移反解、起运天数 |
| `src/tests/snapshot.test.ts` | 12 | 文档 §16 算例的每个中间量、五行计数、换日流派差异形态 |
| `src/tests/wuXing.test.ts` | 8 | 五行计数（含 0 土 0 水 回归）、干支遍历、与 buildChart 一致性 |
| `src/__tests__/App.spec.ts` | 1 | 页面挂载即出盘 |

合计 **66 项**，`npm run test:unit` 一次跑完。
`src/tests/*.probe.ts` 是数值探针（无 `.test` 后缀，不参与测试收集）。

## 文档索引

| 文档 | 内容 |
| --- | --- |
| [doc/bazi-api.md](doc/bazi-api.md) | 接口文档：全部导出函数的签名、类型、异常与组件契约 |
| [doc/bazi-algorithm.md](doc/bazi-algorithm.md) | 算法说明书：公式推导、边界口径、精度实测、完整算例 |
| [doc/bazi-call-graph.md](doc/bazi-call-graph.md) | 调用关系图：分层架构、模块依赖、执行时序、状态流转（9 张 Mermaid 图，已通过解析器校验） |

图表语法自检：`npm install mermaid --no-save --no-package-lock && node mermaid-check.mjs`（脚本本身不参与构建与测试）。

**点名的两组（硬校验，全部四柱一致）：**

| 公历时间 | 四柱 | 结果 |
| --- | --- | --- |
| 2008-07-16 10:33 男 | 戊子 己未 丁巳 乙巳 | ✅ 通过 |
| 2000-01-01 00:00 男 | 己卯 丙子 戊午 壬子 | ✅ 通过 |

**技能文档 §6 后两组（日柱与公式不符，已留痕）：**

| 公历时间 | 文档值 | 本实现计算值 | 说明 |
| --- | --- | --- | --- |
| 1984-02-04 23:30 男 | 甲子 丙寅 **丁丑** 壬子 | 甲子 丙寅 **戊辰** 壬子 | 年柱甲子（立春后）、月柱丙寅（λ≈315.00°）、时柱壬子均与文档一致，仅日柱不同 |
| 2024-02-04 16:27 男 | 甲辰 丙寅 **己亥** 壬申 | 甲辰 丙寅 **戊戌** 庚申 | 立春时刻算得 λ=315.0025°、日内 0 天，与文档节气口径一致；日柱差 1 位 |

依据：`JDN(1984-02-04) = 2445735` → `k_d = (2445735 + 49) mod 60 = 4` → 戊辰；
`JDN(2024-02-04) = 2460345` → `k_d = 34` → 戊戌。两例年柱、月柱均与文档吻合，
差异只在日柱，故判定为文档笔误：测试中并列记录文档值与计算值，不硬编码错值。

## 免责声明

节气与太阳黄经为简化模型，五行颜色与神煞表为通用版（非某一门派定本），
结果仅供研究与娱乐，不作为任何决策依据。
