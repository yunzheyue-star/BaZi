import { describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { REGIONS, findCounty, findProvince, formatRegionPath, resolveRegion } from '../core/regions'
import { buildChart } from '../core/chart'
import { useChartStore } from '../stores/chart'

/**
 * 交互与区域数据测试
 *
 * 覆盖本轮改动：
 *   1. 三级行政区划数据（省 / 市 / 区县）与用户举的四个例子
 *   2. 选中柱 / 选中大运的联动（四柱详情、流年按大运过滤）
 *   3. 计时口径切换（真太阳时 / 平太阳时）
 */

describe('regions：行政区划数据', () => {
  it('省级单位覆盖 34 个（含直辖市与港澳台）', () => {
    expect(REGIONS).toHaveLength(34)
    const names = REGIONS.map((p) => p.name)
    for (const expected of [
      '北京市',
      '上海市',
      '重庆市',
      '天津市',
      '湖北省',
      '广西壮族自治区',
      '香港特别行政区',
      '澳门特别行政区',
      '台湾省',
    ]) {
      expect(names, `缺少 ${expected}`).toContain(expected)
    }
  })

  it('用户举的四个例子都能逐级命中，且经度在合理范围', () => {
    const cases: [string, string, string, number][] = [
      ['湖北省', '黄石市', '大冶市', 114.9],
      ['湖北省', '武汉市', '江夏区', 114.3],
      ['广西壮族自治区', '南宁市', '青秀区', 108.3],
      ['广西壮族自治区', '崇左市', '天等县', 107.1],
    ]
    for (const [province, city, county, lonPrefix] of cases) {
      const hit = findCounty(province, city, county)
      expect(hit, `${province}/${city}/${county} 应命中`).toBeDefined()
      expect(hit!.longitude).toBeGreaterThan(lonPrefix - 1)
      expect(hit!.longitude).toBeLessThan(lonPrefix + 1)
      // 中国大陆经度必在 73–136 之间
      expect(hit!.longitude).toBeGreaterThan(73)
      expect(hit!.longitude).toBeLessThan(136)
      expect(hit!.latitude).toBeGreaterThan(3)
      expect(hit!.latitude).toBeLessThan(54)
    }
  })

  it('resolveRegion：区县留空时回退市级驻地坐标（台湾省只选到市）', () => {
    const byCity = resolveRegion('台湾省', '台北市', '')
    expect(byCity).toBeDefined()
    expect(byCity!.county.name).toBe('台北市')
    expect(byCity!.timezone).toBe('Asia/Taipei')
    expect(byCity!.county.longitude).toBeCloseTo(121.5654, 3)

    // 港澳的 18 / 8 个区在数据源中即为城市级（无下级），故「市 = 区」
    expect(resolveRegion('香港特别行政区', '中西区', '中西区')?.timezone).toBe('Asia/Hong_Kong')
    expect(resolveRegion('香港特别行政区', '中西区', '')?.county.longitude).toBeCloseTo(114.1544, 3)
    expect(resolveRegion('澳门特别行政区', '花地玛堂区', '')?.timezone).toBe('Asia/Macau')
    // 大陆默认东八区
    expect(resolveRegion('湖北省', '武汉市', '江夏区')?.timezone).toBe('Asia/Shanghai')
  })

  it('直辖市层级不冗余：北京市 / 市辖区 / 东城区', () => {
    const beijing = findProvince('北京市')
    expect(beijing?.cities).toHaveLength(1)
    expect(beijing?.cities[0]!.name).toBe('市辖区')
    expect(beijing?.cities[0]!.counties.some((c) => c.name === '东城区')).toBe(true)
  })

  it('formatRegionPath 拼接时省略空级', () => {
    expect(formatRegionPath('湖北省', '武汉市', '江夏区')).toBe('湖北省 / 武汉市 / 江夏区')
    expect(formatRegionPath('台湾省', '台北市', '')).toBe('台湾省 / 台北市')
    expect(formatRegionPath('', '', '')).toBe('')
  })

  it('每个省至少有一个市，每个市要么有区县要么本身即最小单位', () => {
    for (const province of REGIONS) {
      expect(province.cities.length, `${province.name} 没有市级`).toBeGreaterThan(0)
      expect(province.timezone.length).toBeGreaterThan(0)
    }
    const totalCounties = REGIONS.reduce(
      (sum, p) => sum + p.cities.reduce((s, c) => s + c.counties.length, 0),
      0,
    )
    // 全国区县量级应在 2000 以上
    expect(totalCounties).toBeGreaterThan(2000)
  })
})

describe('store：选中柱与四柱详情', () => {
  function freshStore() {
    setActivePinia(createPinia())
    const store = useChartStore()
    store.applyInput({ ...store.input, birthDatetime: '2008-07-16 10:33' })
    return store
  }

  it('默认选中日柱；点击其它柱后详情随之切换（bug 回归）', () => {
    const store = freshStore()
    expect(store.selectedPillar).toBe('day')
    expect(store.selectedPillarDetail?.label).toBe('日柱')
    expect(store.selectedPillarDetail?.isDayMaster).toBe(true)

    store.selectPillar('year')
    expect(store.selectedPillarDetail?.label).toBe('年柱')
    expect(store.selectedPillarDetail?.pillar.ganzhi).toBe('戊子')
    expect(store.selectedPillarDetail?.stemTenGod).toBe('伤官')
    expect(store.selectedPillarDetail?.hiddenStems).toEqual(['癸'])

    store.selectPillar('hour')
    expect(store.selectedPillarDetail?.pillar.ganzhi).toBe('乙巳')
    expect(store.selectedPillarDetail?.stemTenGod).toBe('偏印')

    store.selectPillar('month')
    expect(store.selectedPillarDetail?.pillar.ganzhi).toBe('己未')
  })

  it('十神面板与四柱共享同一个选中项', () => {
    const store = freshStore()
    store.selectPillar('month')
    expect(store.selectedTenGodKey).toBe('month')
  })

  it('选中柱详情带出该柱命中的神煞（2008 例：天乙贵人在月支未）', () => {
    const store = freshStore()
    store.selectPillar('month')
    expect(store.selectedPillarDetail?.shensha.map((h) => h.name)).toEqual(['天乙贵人'])
    store.selectPillar('year')
    expect(store.selectedPillarDetail?.shensha).toEqual([])
    expect(store.selectedPillarDetail?.allShensha.map((h) => h.name)).toEqual(['天乙贵人'])
  })
})

describe('store：计时口径切换', () => {
  function freshStore() {
    setActivePinia(createPinia())
    const store = useChartStore()
    store.applyInput({ ...store.input, birthDatetime: '2008-07-16 10:33' })
    return store
  }

  it('默认真太阳时，切到平太阳时后时柱即时重排', () => {
    const store = freshStore()
    expect(store.input.timeStandard).toBe('true_solar')
    expect(store.result?.trueSolarTime.standardLabel).toBe('真太阳时')
    expect(store.result?.trueSolarTime.trueSolarMinute).toBe(27)

    store.setTimeStandard('standard')
    expect(store.input.timeStandard).toBe('standard')
    expect(store.result?.trueSolarTime.standardLabel).toBe('平太阳时')
    expect(store.result?.trueSolarTime.deltaMinutes).toBe(0)
    // 两档时钟仍并列给出，便于对照
    expect(store.result?.trueSolarTime.standardMinute).toBe(33)
    expect(store.result?.trueSolarTime.trueSolarMinute).toBe(27)
    // 日柱不受口径影响
    expect(store.result?.pillars.day.ganzhi).toBe('丁巳')
  })
})

describe('store：大运 ↔ 流年联动', () => {
  function freshStore() {
    setActivePinia(createPinia())
    const store = useChartStore()
    store.applyInput({ ...store.input, birthDatetime: '2008-07-16 10:33' })
    return store
  }

  it('未选大运时列出完整流年（覆盖到最后一步大运结束）', () => {
    const store = freshStore()
    expect(store.selectedLuckN).toBeNull()
    const list = store.annualsOfSelectedLuck
    const cycles = store.result!.luckCycles
    const last = cycles[cycles.length - 1]!
    expect(list[0]!.year).toBe(2008)
    expect(list[list.length - 1]!.year).toBe(last.coveredToYear)
    expect(list).toHaveLength(last.coveredToYear - 2008 + 1)
  })

  it('点击第一步大运庚申 → 流年只剩该步覆盖的年份 2015–2024', () => {
    const store = freshStore()
    const first = store.result!.luckCycles[0]!
    expect(first.ganzhi).toBe('庚申')
    expect(first.coveredFromYear).toBe(2015)
    expect(first.coveredToYear).toBe(2024)
    expect(first.coveredLabel).toBe('2015–2024')

    store.selectLuck(1)
    expect(store.selectedLuck?.ganzhi).toBe('庚申')
    const rows = store.annualsOfSelectedLuck
    expect(rows).toHaveLength(10)
    expect(rows[0]!.year).toBe(2015)
    expect(rows[rows.length - 1]!.year).toBe(2024)
    // 该步首年 2015 的流年干支 = k_year(2015) = 11 → 乙未
    expect(rows[0]!.ganzhi).toBe('乙未')
  })

  it('各步覆盖区间首尾相接、不重叠', () => {
    const store = freshStore()
    const cycles = store.result!.luckCycles
    for (let i = 1; i < cycles.length; i += 1) {
      expect(cycles[i]!.coveredFromYear).toBe(cycles[i - 1]!.coveredToYear + 1)
    }
    // 再点一次同一步 → 取消选中
    store.selectLuck(2)
    expect(store.selectedLuckN).toBe(2)
    store.selectLuck(2)
    expect(store.selectedLuckN).toBeNull()
  })

  it('大运的 startYear 与 coveredFromYear 一致（交运年取整）', () => {
    const chart = buildChart(
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
    for (const step of chart.luckCycles) {
      expect(step.startYear).toBe(step.coveredFromYear)
      expect(step.coveredToYear - step.coveredFromYear).toBe(9)
    }
  })
})
