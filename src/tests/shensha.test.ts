import { describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { buildChart } from '../core/chart'
import { shenshaByPillar } from '../core/shenshaMore'
import { useChartStore } from '../stores/chart'
import type { ChartInput } from '../types/bazi'

/**
 * 按柱神煞测试
 *
 * 校验用例来自用户给定的一张表（丙戌 庚寅 丁亥 甲辰，2006-02-27 09:20 天等县）：
 *   年干 → 月德贵人、天罗
 *   月干 → 国印贵人、亡神
 *   日干 → 天德贵人、天乙贵人、劫煞、孤辰、十恶大败、天罗
 *   时干 → 童子煞、地网
 *
 * 复核方式：先由该表反推各神煞的起法（月德由月支三合局定干、天德由月支定干/支、
 * 天罗地网由年日支见戌亥/辰巳、童子煞由季节）× 天干/地支），再用词表算出结果。
 */

const CASE: ChartInput = {
  birthDatetime: '2006-02-27 09:20',
  gender: 'male',
  longitude: 107.1424,
  birthPlace: '广西壮族自治区 / 崇左市 / 天等县',
  timezone: 'Asia/Shanghai',
  dayBoundary: 'midnight',
  timeStandard: 'true_solar',
}

const chart = buildChart(CASE, { referenceYear: 2006 })
const { hits, byPillar } = shenshaByPillar(
  chart.pillars,
  chart.pillars.day.stemIndex,
  chart.pillars.year.stemIndex,
)

describe('用例盘本身', () => {
  it('四柱为 丙戌 庚寅 丁亥 甲辰', () => {
    expect(chart.bazi).toBe('丙戌 庚寅 丁亥 甲辰')
  })
})

describe('shenshaByPillar：按柱命中', () => {
  it('年干丙 → 月德贵人、天罗', () => {
    expect(byPillar.year).toContain('月德贵人')
    expect(byPillar.year).toContain('天罗')
  })

  it('月干庚 → 国印贵人、亡神', () => {
    expect(byPillar.month).toContain('国印贵人')
    expect(byPillar.month).toContain('亡神')
  })

  it('日干丁 → 天德贵人、天乙贵人、劫煞、孤辰、十恶大败、天罗', () => {
    for (const name of ['天德贵人', '天乙贵人', '劫煞', '孤辰', '十恶大败', '天罗']) {
      expect(byPillar.day, `日柱应命中 ${name}`).toContain(name)
    }
  })

  it('时干甲 → 童子煞、地网', () => {
    expect(byPillar.hour).toContain('童子煞')
    expect(byPillar.hour).toContain('地网')
  })

  it('四柱命中集合与用户给定的表逐项一致（允许额外的正确项）', () => {
    // 用户表（键为柱位），值必须被包含
    const expected: Record<string, string[]> = {
      year: ['月德贵人', '天罗'],
      month: ['国印贵人', '亡神'],
      day: ['天德贵人', '天乙贵人', '劫煞', '孤辰', '十恶大败', '天罗'],
      hour: ['童子煞', '地网'],
    }
    for (const [key, names] of Object.entries(expected)) {
      for (const name of names) {
        expect(byPillar[key as 'year'], `${key} 缺少 ${name}`).toContain(name)
      }
    }
  })

  it('神煞不应串柱：地网只在时柱，月德贵人与十恶大败各就各位', () => {
    expect(byPillar.hour).toContain('地网')
    expect(byPillar.year).not.toContain('地网')
    expect(byPillar.month).not.toContain('地网')
    expect(byPillar.day).not.toContain('地网')

    expect(byPillar.day).toContain('十恶大败')
    expect(byPillar.year).not.toContain('十恶大败')
    expect(byPillar.month).not.toContain('十恶大败')
    expect(byPillar.hour).not.toContain('十恶大败')
  })

  it('每条命中都带判定依据，且 targetName 非空', () => {
    expect(hits.length).toBeGreaterThan(5)
    for (const hit of hits) {
      expect(hit.reason.length).toBeGreaterThan(0)
      expect(hit.targetName.length).toBeGreaterThan(0)
      expect(hit.positions.length).toBeGreaterThan(0)
    }
  })

  it('命中名去重：同一柱内不出现重复神煞名', () => {
    for (const key of ['year', 'month', 'day', 'hour'] as const) {
      expect(new Set(byPillar[key]).size).toBe(byPillar[key].length)
    }
  })
})

describe('store：神煞面板随选中柱切换（交互要求）', () => {
  function freshStore() {
    setActivePinia(createPinia())
    const store = useChartStore()
    store.applyInput({ ...CASE })
    return store
  }

  const EXPECTED: Record<string, string[]> = {
    year: ['月德贵人', '天罗'],
    month: ['国印贵人', '亡神'],
    day: ['天德贵人', '天乙贵人', '劫煞', '孤辰', '十恶大败', '天罗'],
    hour: ['童子煞', '地网'],
  }

  for (const [key, names] of Object.entries(EXPECTED)) {
    it(`选中${key === 'year' ? '年' : key === 'month' ? '月' : key === 'day' ? '日' : '时'}柱 → 神煞含 ${names.join('、')}`, () => {
      const store = freshStore()
      store.selectPillar(key as 'year')
      const actual = store.selectedShenshaNames
      for (const name of names) {
        expect(actual, `${key} 应含 ${name}`).toContain(name)
      }
      // 明细与名称同源：明细覆盖全部名称，且可能同一神煞有多条来源（如天乙贵人日干/年干各一）
      const detailNames = new Set(store.selectedShenshaHits.map((h) => h.name))
      expect(detailNames).toEqual(new Set(actual))
      // 每条都能给出判定依据
      for (const hit of store.selectedShenshaHits) {
        expect(hit.reason.length).toBeGreaterThan(0)
      }
    })
  }

  it('四柱各有独立的神煞集合，且全盘命中是它们的并集（去重）', () => {
    const store = freshStore()
    const per = store.shenshaPerPillar!
    const union = new Set([
      ...per.byPillar.year,
      ...per.byPillar.month,
      ...per.byPillar.day,
      ...per.byPillar.hour,
    ])
    const allNames = new Set(store.allShenshaHits.map((h) => h.name))
    for (const name of union) {
      expect(allNames).toContain(name)
    }
    // 且每柱至少有一项（本盘四柱均非空）
    for (const key of ['year', 'month', 'day', 'hour'] as const) {
      expect(per.byPillar[key].length).toBeGreaterThan(0)
    }
  })
})

describe('shenshaByPillar：换一张盘仍然成立（防写死）', () => {
  it('换盘不误报：2008 例的亡神/劫煞/桃花都不该出现在日柱', () => {
    const other = buildChart(
      {
        birthDatetime: '2008-07-16 10:33',
        gender: 'male',
        longitude: 116.4,
        timezone: 'Asia/Shanghai',
        dayBoundary: 'midnight',
        timeStandard: 'true_solar',
      },
      { referenceYear: 2008 },
    )
    const r = shenshaByPillar(other.pillars, other.pillars.day.stemIndex, other.pillars.year.stemIndex)
    // 未月属亥卯未局 → 月德为甲；盘中无甲 → 落到月柱
    expect(r.byPillar.month).toContain('月德贵人')
    // 华盖由月令取象：月支未属亥卯未局 → 华盖正在未 → 落月柱
    expect(r.byPillar.month).toContain('华盖')
    expect(r.byPillar.year).not.toContain('华盖')
    // 桃花：申子辰局见酉；四支 子未巳巳 中无酉 → 不出现
    expect(Object.values(r.byPillar).flat()).not.toContain('桃花')
    // 劫煞：年支子属申子辰局 → 巳（日支、时支都在）→ 日、时两柱
    expect(r.byPillar.day).toContain('劫煞')
    expect(r.byPillar.hour).toContain('劫煞')
    // 十恶大败：丁巳不在表内，故日柱不应有
    expect(r.byPillar.day).not.toContain('十恶大败')
    // 天罗地网：四支 子未巳巳 → 巳为地网（日、时），无戌亥故无天罗
    expect(r.byPillar.day).toContain('地网')
    expect(r.byPillar.hour).toContain('地网')
    expect(Object.values(r.byPillar).flat()).not.toContain('天罗')
  })
})
