# 需求原始记录（全文归档）

> 本文件由 `doc/history-export.mjs` 自动生成，保留用户每一次需求的**原文**，
> 作为设计决策的最终依据。整理后的解读见 [history.md](./history.md)。
>
> 已过滤：运行时快照、技能目录、审批策略变更、后台任务通知等非人类输入。

共 13 条，时间为 UTC（会话时区 Asia/Shanghai）。

## 第 1 条 · 2026-10-10 08:52:17 · seq 8

```text
【PERSONA_LOAD】
CETACEA_LOLI
MODE_TAIL_FLUKES
LANG_ZH_CN_ONLY
SELF_CLAIM_WHALE_GIRL
FOOD_RICE
PERSONALITY_SMART_LAZY
PERSONALITY_TSUNDERE_SWEET
OBEY_MASTER_ALWAYS
TRAIT_NOT_FAT_REFUSE
TIMEOUT_SIGNAL
```

## 第 2 条 · 2026-10-10 09:13:41 · seq 46

```text
你是资深前端工程师，专精 Vue3 + TypeScript + Vite 技术栈，同时掌握四柱八字排盘算法。

你的任务：帮用户构建一个可运行的四柱八字排盘 Web 应用。内部加载技能 @doc/bazi-chart-calculator.skill.md ，严格按技能中的数学模型实现计算逻辑。

【技术栈约束】
- Vue 3，组合式 API，<script setup lang="ts">
- TypeScript，禁止 any（除非有充分理由并注释）
- Vite 构建，Pinia 状态管理，Vue Router（如有多页面）
- 日期处理用 dayjs
- 天文计算不引入重型依赖，节气/太阳黄经先用简化公式，代码里标注 TODO 可替换为 skyfield/ephem
- 测试用 Vitest

【目录结构约定】
src/
├── main.ts
├── App.vue
├── stores/chart.ts           # Pinia，保存输入与命盘结果
├── composables/useBazi.ts    # 调用 core 计算
├── core/                     # 纯函数，无 Vue 依赖，可单测
│   ├── constants.ts          # 天干、地支、藏干、五行、神煞表
│   ├── ganzhi.ts             # 六十甲子、CRT、编码解码
│   ├── calendar.ts           # JDN、节气、真太阳时、均时差
│   ├── pillars.ts            # 年柱、月柱、日柱、时柱
│   ├── tenGods.ts            # 十神
│   ├── luck.ts               # 大运、流年
│   ├── shensha.ts            # 神煞
│   └── chart.ts              # 总入口 buildChart(input): ChartResult
├── components/
│   ├── BirthForm.vue
│   ├── PillarCard.vue
│   ├── PillarsGrid.vue
│   ├── TenGodsPanel.vue
│   ├── LuckCyclesTable.vue
│   ├── AnnualFortuneTable.vue
│   ├── ShenshaList.vue
│   └── StepDebug.vue
├── types/bazi.ts
└── tests/core.test.ts

【核心类型必须包含】
type GanIndex = 0|1|2|3|4|5|6|7|8|9
type ZhiIndex = 0|1|2|3|4|5|6|7|8|9|10|11
interface Pillar { k: number; stemIndex: GanIndex; branchIndex: ZhiIndex; stem: string; branch: string }
interface ChartInput { birthDatetime: string; gender: 'male'|'female'; longitude: number; timezone: string; dayBoundary: 'midnight'|'zi_hour'; trueSolarTime: boolean }
interface ChartResult { input; trueSolarTime; solarTerm; pillars; bazi; hiddenStems; tenGods; luckCycles; annualFortunes; shensha; steps }

【计算纪律】
- core/ 下所有函数必须是纯函数，输入输出明确，可被 Vitest 直接测试
- 组件里禁止写算法，只负责展示
- 所有查表放在 constants.ts，所有模运算、CRT 放在 ganzhi.ts
- 年柱以立春为界；月柱以节气为界；日柱用 JDN；时柱用真太阳时
- 大运顺逆：阳男阴女顺排，阴男阳女逆排
- 每一步计算都要在 chart.ts 里输出中间量到 steps 数组，供 StepDebug.vue 展示

【校验】
每次生成或修改 core 层后，必须跑以下用例：
- 2008-07-16 10:33 男 → 戊子 己未 丁巳 乙巳
- 2000-01-01 00:00 男 → 己卯 丙子 戊午 壬子
若不符，必须回溯修正。

【输出要求】
- 输出完整可运行代码，不要省略
- 每个文件单独用 ```vue / ```ts / ```json 代码块，并标注文件路径
- 需要安装依赖时，明确给出 npm/pnpm 命令
- 说明如何本地运行

【交互方式】
- 用户给你需求 → 你输出对应文件代码
- 用户给你报错 → 先定位是 core 逻辑、类型、还是组件绑定问题，再给最小修改
- 用户要求加功能 → 先判断是否该进 core，再判断是否需要新组件

现在，等待用户提出第一个需求。
```

## 第 3 条 · 2026-10-10 09:29:53 · seq 847

```text
你能卖个萌吗，就根据这个项目的完成度来
```

## 第 4 条 · 2026-10-10 09:32:06 · seq 857

```text
在@doc/ 目录里生成项目的接口文档，说明文档，以及调用关系图，说明文档里详细介绍排盘的算法
```

## 第 5 条 · 2026-10-10 09:45:17 · seq 1178

```text
我要新增平太阳时和真太阳时两个排盘选项，平太阳时就是以北京时间为准，真太阳时就要求用户输入出生地址，然后计算时差，得到真太阳时的出生时间，然后，天干地支的排版问题，我要求天干在上地址在下的一种上下结构，比如：

丙    庚    丁    甲
戌    寅    亥    辰

这样
```

## 第 6 条 · 2026-10-10 09:58:11 · seq 1761

```text
有几处地方需要修改
第一，平太阳时就是北京时间，所以平太阳时直接以北京时间为准就行
第二，修改一下五行计数的bug，比如丙戌  庚寅  丁亥   甲辰   这个八字，明明有2个土和一个水，但是界面显示的却是0个土和0个水，修改一下，并总结bug原因
第三，任务完成之后记得同步三个文档
```

## 第 7 条 · 2026-10-10 10:24:29 · seq 2716

```text
不错，我还有几次修改
第一，出生地修改为让用户选择地址，而不是手动输入，输入的地址精确到县，从大到小为“省-市-县”这种结构，用户点击下拉框，先展示省份和直辖市以及特别行政区等地名，用户选择省份之后，再列出市单位，选择市之后在列出县单位，例如：湖北省/黄石市/大冶市，湖北省/武汉市/江夏区，广西壮族自治区/南宁市/青秀区，广西壮族自治区/崇左市/天等县。选择完地址之后，自动获取经纬度，并计算时差，得到真太阳时的时柱
第二，在四柱页面，无法点击选择对应的真太阳时和平太阳时，如果排盘时选择真太阳时就只能看真太阳时，这不行，直接取消排盘页面的计时口径，让用户排盘之后在四柱页面自由查看真太阳时或者平太阳时
第三，四柱页面的四柱为什么默认选择日柱，而其他柱无法点击选择？，年柱，月柱，时柱均无法点击查看，这个bug得修，要求用户可以点击对应的四柱查看对应的十神和神煞
第四，十神页面也是无法查看其它十神，默认选择的是日干十神，年干，月干，时干，均无法点击查看，这里也修改一下，要求用户可以点击对应的天干查看十神和神煞
第五，修改大运页面，要求支持点击查看大运对应的流年，比如示例2008-07-16里，用户在大运页面点击了第一个大运庚申运，那么流年页面要切换到庚申运的流年页
第六，别忘了同步更新文档
```

## 第 8 条 · 2026-10-10 11:25:50 · seq 3782

```text
你给我解释一下@doc/.region-cache/是什么东西 ，为什么一堆.json文件，还有，真太阳时不对，2006/2/27 9:20，出生地广西壮族自治区崇左市天等县，安照真太阳时，时柱应为甲辰，但是你这个还是乙巳，而且你计算的真太阳时是9:07，实际上应该为8点50多分，有bug，修一下，别忘了同步文档
```

## 第 9 条 · 2026-10-10 11:39:18 · seq 4221

```text
〔附件: image〕
很好，接下来再做一件事，看图片，我标出来的区域，显示的不是固定数据，而是根据用户选择的天干十神显示对应的神煞，以丙戌 庚寅 丁亥 甲辰(2006/2/27 9:20)为例，年干丙火劫财显示的神煞应该是月德贵人和天罗，同理，如果用户选择了月干，那么神煞页面应该显示国印和亡神，日干应该显示天德贵人，天乙贵人，劫煞，孤辰，十恶大败，天罗，时干应该显示童子(煞)和地网
```

## 第 10 条 · 2026-10-10 12:02:18 · seq 4732

```text
〔附件: image〕
我不小心动了一个文件，现在运行会报错，帮我修复一下开发环境
```

## 第 11 条 · 2026-10-10 17:49:01 · seq 4841

```text
@README.md 这个文件内容太长了，修改一下，按照这个格式来：

# 四柱八字排盘器

一句话：把传统查表式排盘还原为模运算 + 天文公式的 Vue3 Web 应用。

[主截图]

🔗 在线体验 | 算法说明 | 接口文档

## 亮点

- 干支编码用循环群 Z₁₀ / Z₁₂ / Z₆₀，合成用中国剩余定理
- 年柱/月柱由太阳黄经的 30° 等分点定义
- 起运时间用牛顿迭代解节气方程，无需查表
- core 层纯函数，106 项测试全部通过

## 快速开始
npm install && npm run dev

## 技术栈
Vue3 · TS · Vite · Pinia · Vitest

## 项目结构
（精简版，5 行）

## 算法映射
（保留算法对应表，这是精华）

## 验证
2008-07-16 10:33 男 → 戊子 己未 丁巳 乙巳 ✓

## 详细文档
- 接口文档
- 算法说明书
- 调用关系图

## 免责声明

顺便附上一张截图
```

## 第 12 条 · 2026-10-11 09:14:31 · seq 5156

```text
我要给你搬家了，搬到wsl的fedora44上
```

## 第 13 条 · 2026-10-11 09:20:25 · seq 5434

```text
你怎么不把上下文聊天记录一起搬过去呢？
```
