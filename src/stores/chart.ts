/**
 * 排盘状态：输入、结果、错误、导出
 *
 * 技能 §5.3 约定：input / result / error / calculate / reset / exportJson
 * 这里额外提供 defaultInput、sampleInput、applyInput、cities（表单用的预设）。
 * 本文件不写任何算法，只做「调用 core + 持有状态」。
 */

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { buildChart } from '../core/chart'
import { annualFortunes } from '../core/luck'
import { shenshaByPillar } from '../core/shenshaMore'
import { countWuXingAll, countWuXingMajor, wuXingTotal as totalOfWuXing } from '../core/wuXing'
import type { CountWuXing } from '../core/wuXing'
import type { ChartInput, ChartResult, PillarKey, TimeStandard } from '../types/bazi'
import { TIME_STANDARD_LABEL } from '../types/bazi'

/** 常用城市（经度 + 时区），表单下拉用 */
export interface CityPreset {
  label: string
  longitude: number
  timezone: string
}

export const CITIES: readonly CityPreset[] = [
  { label: '北京', longitude: 116.4, timezone: 'Asia/Shanghai' },
  { label: '上海', longitude: 121.47, timezone: 'Asia/Shanghai' },
  { label: '广州', longitude: 113.26, timezone: 'Asia/Shanghai' },
  { label: '成都', longitude: 104.07, timezone: 'Asia/Shanghai' },
  { label: '西安', longitude: 108.94, timezone: 'Asia/Shanghai' },
  { label: '乌鲁木齐', longitude: 87.62, timezone: 'Asia/Shanghai' },
  { label: '哈尔滨', longitude: 126.63, timezone: 'Asia/Shanghai' },
  { label: '香港', longitude: 114.17, timezone: 'Asia/Hong_Kong' },
  { label: '台北', longitude: 121.52, timezone: 'Asia/Taipei' },
  { label: '东京', longitude: 139.69, timezone: 'Asia/Tokyo' },
  { label: '首尔', longitude: 126.98, timezone: 'Asia/Seoul' },
  { label: '新加坡', longitude: 103.82, timezone: 'Asia/Singapore' },
  { label: '纽约', longitude: -74.01, timezone: 'America/New_York' },
  { label: '伦敦', longitude: -0.13, timezone: 'Europe/London' },
  { label: '洛杉矶', longitude: -118.24, timezone: 'America/Los_Angeles' },
]

/** 默认输入：真太阳时口径（与技能 §7 默认一致）+ 午夜换日 */
export const defaultInput: ChartInput = {
  birthDatetime: '2008-07-16 10:33',
  gender: 'male',
  longitude: 116.4,
  birthPlace: '北京',
  timezone: 'Asia/Shanghai',
  dayBoundary: 'midnight',
  timeStandard: 'true_solar',
}

/** 校验用例一：2008-07-16 10:33 男 → 戊子 己未 丁巳 乙巳 */
export const sampleInputA: ChartInput = { ...defaultInput }

/** 校验用例二：2000-01-01 00:00 男 → 己卯 丙子 戊午 壬子 */
export const sampleInputB: ChartInput = {
  ...defaultInput,
  birthDatetime: '2000-01-01 00:00',
}

export const useChartStore = defineStore('chart', () => {
  const input = ref<ChartInput>({ ...defaultInput })
  const result = ref<ChartResult | null>(null)
  const error = ref<string | null>(null)
  const calculating = ref(false)

  /** 是否已算出结果 */
  const hasResult = computed(() => result.value !== null)

  /** 四柱简写，展示层直接用 */
  const bazi = computed(() => result.value?.bazi ?? '')

  /** 分柱数组，配合 v-for 使用（顺序：年 月 日 时） */
  const pillarList = computed(() => {
    const current = result.value
    if (!current) return []
    const order = ['year', 'month', 'day', 'hour'] as const
    const labels = { year: '年柱', month: '月柱', day: '日柱', hour: '时柱' } as const
    return order.map((key) => ({
      key,
      label: labels[key],
      pillar: current.pillars[key],
      hiddenStems: current.hiddenStems[key],
      tenGods: key === 'day' ? ['日主'] : current.tenGods.branches[key],
      stemTenGod:
        key === 'year'
          ? current.tenGods.yearStem
          : key === 'month'
            ? current.tenGods.monthStem
            : key === 'hour'
              ? current.tenGods.hourStem
              : '日主',
    }))
  })

  /** 五行计数（天干 + 地支本气，各计 1；共 8 项） */
  const wuXingCount = computed<CountWuXing>(() =>
    result.value ? countWuXingMajor(result.value.pillars) : { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 },
  )

  /** 五行计数（含地支全部藏干，更细） */
  const wuXingCountAll = computed<CountWuXing>(() =>
    result.value ? countWuXingAll(result.value.pillars) : { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 },
  )

  /** 五行计数合计（本气视图恒为 8） */
  const wuXingTotal = computed(() => totalOfWuXing(wuXingCount.value))

  /* ---------------- 交互相邻状态（跨组件共享的选中项） ---------------- */

  /** 当前选中的柱：year / month / day / hour，默认日柱（日主） */
  const selectedPillar = ref<PillarKey>('day')
  /** 当前选中的天干：用于十神面板高亮与四柱联动 */
  const selectedTenGodKey = ref<PillarKey>('day')
  /** 当前选中的大运步序 n；null = 未选，流年显示全部 */
  const selectedLuckN = ref<number | null>(null)

  /** 按柱统计的神煞（核心规则在 core/shenshaMore.ts，这里只做缓存与取用） */
  const shenshaPerPillar = computed(() => {
    const current = result.value
    if (!current) return null
    return shenshaByPillar(
      current.pillars,
      current.pillars.day.stemIndex,
      current.pillars.year.stemIndex,
    )
  })

  /** 选中柱命中的神煞名 */
  const selectedShenshaNames = computed(() => {
    const per = shenshaPerPillar.value
    if (!per) return []
    return per.byPillar[selectedPillar.value]
  })

  /** 选中柱的神煞明细（含判定依据） */
  const selectedShenshaHits = computed(() => {
    const per = shenshaPerPillar.value
    if (!per) return []
    const names = per.byPillar[selectedPillar.value]
    return per.hits.filter((hit) => names.includes(hit.name))
  })

  /** 全盘神煞明细（去重后的规则集合） */
  const allShenshaHits = computed(() => shenshaPerPillar.value?.hits ?? [])

  /** 选中柱的明细（供四柱详情面板使用） */
  const selectedPillarDetail = computed(() => {
    const current = result.value
    if (!current) return null
    const key = selectedPillar.value
    const labels: Record<PillarKey, string> = {
      year: '年柱',
      month: '月柱',
      day: '日柱',
      hour: '时柱',
    }
    const branches = {
      year: current.tenGods.branches.year,
      month: current.tenGods.branches.month,
      day: current.tenGods.branches.day,
      hour: current.tenGods.branches.hour,
    }
    const stemGods: Record<PillarKey, string> = {
      year: current.tenGods.yearStem,
      month: current.tenGods.monthStem,
      day: '日主',
      hour: current.tenGods.hourStem,
    }
    return {
      key,
      label: labels[key],
      pillar: current.pillars[key],
      isDayMaster: key === 'day',
      stemTenGod: stemGods[key],
      hiddenStems: current.hiddenStems[key],
      hiddenGods: branches[key],
      /** 命中在该柱的神煞 */
      shensha: current.shensha.hits.filter((hit) => hit.positions.includes(key)),
      allShensha: current.shensha.hits,
    }
  })

  /** 选中的大运步（未选时返回第一步，便于展示） */
  const selectedLuck = computed(() => {
    const list = result.value?.luckCycles ?? []
    if (list.length === 0) return null
    const n = selectedLuckN.value
    return list.find((s) => s.n === n) ?? list[0]!
  })

  /**
   * 完整流年表：自出生年起，覆盖到最后一步大运结束。
   *
   * `buildChart` 默认只排 10 年（技能约定），但点选大运时要能看到该步的整段流年，
   * 因此这里按需再排一次 —— 排流年是纯函数，不读时钟，用 referenceYear = 出生年
   * 保证结果可复现。
   */
  const fullAnnualFortunes = computed(() => {
    const current = result.value
    if (!current) return []
    const birthYear = Number(current.input.birthDatetime.slice(0, 4))
    const lastStep = current.luckCycles[current.luckCycles.length - 1]
    const endYear = lastStep ? lastStep.coveredToYear : birthYear + 9
    const count = Math.max(endYear - birthYear + 1, 10)
    return annualFortunes(
      birthYear,
      count,
      current.pillars.day.stemIndex,
      current.pillars.day.branchIndex,
      birthYear,
    )
  })

  /** 当前大运覆盖的流年；未选大运时给出完整流年（自出生年起） */
  const annualsOfSelectedLuck = computed(() => {
    const list = fullAnnualFortunes.value
    const n = selectedLuckN.value
    const step = (result.value?.luckCycles ?? []).find((s) => s.n === n)
    if (!step) return list
    return list.filter(
      (item) => item.year >= step.coveredFromYear && item.year <= step.coveredToYear,
    )
  })

  /** 某个柱位是否被选中（供组件标样式） */
  function isPillarSelected(key: PillarKey): boolean {
    return selectedPillar.value === key
  }

  /** 选中柱 + 联动十神高亮 */
  function selectPillar(key: PillarKey): void {
    selectedPillar.value = key
    selectedTenGodKey.value = key
  }

  /** 切换计时口径：直接重排一次，四柱即时更新 */
  function setTimeStandard(value: TimeStandard): void {
    if (input.value.timeStandard === value) return
    input.value = { ...input.value, timeStandard: value }
    calculate()
  }

  /** 选中大运步（再点一次取消，流年恢复全部） */
  function selectLuck(n: number): void {
    selectedLuckN.value = selectedLuckN.value === n ? null : n
  }

  /** 大运方向说明（来自 steps，避免组件再算一次） */
  const luckDirectionLabel = computed(() => {
    const step = result.value?.steps.find((s) => s.name === 'luckCycles')
    const output = step?.output as { direction?: string; startAge?: number } | undefined
    return output?.direction ?? '—'
  })

  /** 时柱所用时间的说明文本，如「真太阳时 10:27（−6.1 分）」 */
  const trueSolarLabel = computed(() => {
    const info = result.value?.trueSolarTime
    if (!info) return '—'
    const clock = `${String(info.hour).padStart(2, '0')}:${String(info.minute).padStart(2, '0')}`
    if (info.standard === 'standard') return `${info.standardLabel} ${clock}`
    const delta = info.deltaMinutes
    const sign = delta >= 0 ? '+' : '−'
    return `${info.standardLabel} ${clock}（${sign}${Math.abs(delta).toFixed(1)} 分）`
  })

  /** 两档时钟并列对照：平太阳时（即北京时间）/ 真太阳时 */
  const clockPair = computed(() => {
    const info = result.value?.trueSolarTime
    if (!info) return []
    const fmt = (h: number, m: number) =>
      `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    return [
      {
        key: 'standard' as const,
        label: TIME_STANDARD_LABEL.standard,
        clock: fmt(info.standardHour, info.standardMinute),
      },
      {
        key: 'true_solar' as const,
        label: TIME_STANDARD_LABEL.true_solar,
        clock: fmt(info.trueSolarHour, info.trueSolarMinute),
      },
    ]
  })

  /** 调用 core 排盘 */
  function calculate(): void {
    calculating.value = true
    error.value = null
    try {
      result.value = buildChart({ ...input.value }, { referenceYear: new Date().getFullYear() })
    } catch (e: unknown) {
      result.value = null
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      calculating.value = false
    }
  }

  /** 整体替换输入（表单/示例按钮用） */
  function applyInput(next: ChartInput): void {
    input.value = { ...next }
    calculate()
  }

  /** 局部更新输入 */
  function patchInput(patch: Partial<ChartInput>): void {
    input.value = { ...input.value, ...patch }
  }

  /** 清空输入与结果 */
  function reset(): void {
    input.value = { ...defaultInput }
    result.value = null
    error.value = null
    selectedPillar.value = 'day'
    selectedTenGodKey.value = 'day'
    selectedLuckN.value = null
  }

  /** 导出 JSON（含 steps 中间量） */
  function exportJson(): string {
    if (!result.value) return ''
    return JSON.stringify(result.value, null, 2)
  }

  /** 导出纯文本摘要 */
  function exportText(): string {
    const current = result.value
    if (!current) return ''
    const info = current.trueSolarTime
    const pad = (n: number) => String(n).padStart(2, '0')
    const lines = [
      `出生：${current.input.birthDatetime}（${current.input.gender === 'male' ? '男' : '女'}）`,
      `出生地：${current.input.birthPlace ?? '（未填）'}  经度：${current.input.longitude}  时区：${current.input.timezone}`,
      `采用口径：${info.standardLabel}`,
      `平太阳时 ${pad(info.standardHour)}:${pad(info.standardMinute)}` +
        ` / 真太阳时 ${pad(info.trueSolarHour)}:${pad(info.trueSolarMinute)}`,
      `节气：${current.solarTerm.termName}（月令 ${current.solarTerm.monthOrder}，太阳黄经 ${current.solarTerm.lambda}°）`,
      `四柱：${current.bazi}`,
      `五行：${Object.entries(wuXingCount.value)
        .map(([name, count]) => `${name}${count}`)
        .join(' ')}`,
      `十神：年 ${current.tenGods.yearStem} / 月 ${current.tenGods.monthStem} / 日 日主 / 时 ${current.tenGods.hourStem}`,
      `大运：${luckDirectionLabel.value}，${current.luckCycles
        .slice(0, 8)
        .map((s) => `${s.ganzhi}(${s.startAge}岁)`)
        .join(' ')}`,
      `神煞：${
        current.shensha.hits.length === 0
          ? '无'
          : current.shensha.hits.map((h) => `${h.name}(${h.branches.join('')})`).join('、')
      }`,
    ]
    return lines.join('\n')
  }

  return {
    input,
    result,
    error,
    calculating,
    hasResult,
    bazi,
    pillarList,
    wuXingCount,
    wuXingCountAll,
    wuXingTotal,
    luckDirectionLabel,
    trueSolarLabel,
    clockPair,
    selectedPillar,
    selectedTenGodKey,
    selectedLuckN,
    selectedPillarDetail,
    selectedLuck,
    shenshaPerPillar,
    selectedShenshaNames,
    selectedShenshaHits,
    allShenshaHits,
    fullAnnualFortunes,
    annualsOfSelectedLuck,
    isPillarSelected,
    selectPillar,
    selectLuck,
    setTimeStandard,
    calculate,
    applyInput,
    patchInput,
    reset,
    exportJson,
    exportText,
  }
})
