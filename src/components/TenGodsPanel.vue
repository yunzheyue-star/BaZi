<script setup lang="ts">
/**
 * TenGodsPanel：展示十神与藏干一览。不计算五行、不判十神。
 */
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import { GAN_COLOR, GAN_WU_XING_BY_NAME } from '../core/constants'
import type { GanName } from '../core/constants'
import { useChartStore } from '../stores/chart'

const store = useChartStore()
const { result } = storeToRefs(store)

interface Row {
  label: string
  stem: string
  god: string
  isMaster: boolean
}

/** 天干十神：年 / 月 / 日 / 时 */
const stemRows = computed<Row[]>(() => {
  const current = result.value
  if (!current) return []
  return [
    { label: '年干', stem: current.pillars.year.stem, god: current.tenGods.yearStem, isMaster: false },
    { label: '月干', stem: current.pillars.month.stem, god: current.tenGods.monthStem, isMaster: false },
    { label: '日干', stem: current.pillars.day.stem, god: '日主', isMaster: true },
    { label: '时干', stem: current.pillars.hour.stem, god: current.tenGods.hourStem, isMaster: false },
  ]
})

/** 地支藏干十神 */
const branchRows = computed(() => {
  const current = result.value
  if (!current) return []
  const order = ['year', 'month', 'day', 'hour'] as const
  const labels = { year: '年支', month: '月支', day: '日支', hour: '时支' } as const
  return order.map((key) => ({
    key,
    label: labels[key],
    branch: current.pillars[key].branch,
    stems: current.hiddenStems[key],
    gods: current.tenGods.branches[key],
  }))
})

/** 十神分类汇总：比劫 / 食伤 / 财 / 官杀 / 印 */
const categories = computed(() => {
  const current = result.value
  if (!current) return []
  const all = [
    current.tenGods.yearStem,
    current.tenGods.monthStem,
    current.tenGods.hourStem,
    ...current.tenGods.branches.year,
    ...current.tenGods.branches.month,
    ...current.tenGods.branches.day,
    ...current.tenGods.branches.hour,
  ]
  const groups: { name: string; members: string[] }[] = [
    { name: '比劫', members: ['比肩', '劫财'] },
    { name: '食伤', members: ['食神', '伤官'] },
    { name: '财星', members: ['正财', '偏财'] },
    { name: '官杀', members: ['正官', '七杀'] },
    { name: '印星', members: ['正印', '偏印'] },
  ]
  return groups.map((group) => ({
    name: group.name,
    count: all.filter((god) => group.members.includes(god)).length,
    detail: group.members
      .map((member) => `${member}×${all.filter((god) => god === member).length}`)
      .join(' '),
  }))
})

function colorOf(stem: string): string {
  return GAN_COLOR[stem as GanName] ?? '#666'
}

function wuXingOf(stem: string): string {
  return GAN_WU_XING_BY_NAME[stem as GanName] ?? '—'
}
</script>

<template>
  <section v-if="result" class="card">
    <h2>十神</h2>

    <h3>天干十神（以日干为「我」）</h3>
    <ul class="stem-list">
      <li v-for="row in stemRows" :key="row.label" :class="{ master: row.isMaster }">
        <span class="label">{{ row.label }}</span>
        <span class="stem" :style="{ color: colorOf(row.stem) }">{{ row.stem }}</span>
        <span class="wx">{{ wuXingOf(row.stem) }}</span>
        <span class="god">{{ row.god }}</span>
      </li>
    </ul>

    <h3>地支藏干十神</h3>
    <ul class="branch-list">
      <li v-for="row in branchRows" :key="row.key">
        <span class="label">{{ row.label }}（{{ row.branch }}）</span>
        <span class="gods">
          <span v-for="(stem, i) in row.stems" :key="`${stem}-${i}`" class="chip">
            <b :style="{ color: colorOf(stem) }">{{ stem }}</b>
            {{ row.gods[i] }}
          </span>
        </span>
      </li>
    </ul>

    <h3>十神分布</h3>
    <ul class="category-list">
      <li v-for="row in categories" :key="row.name">
        <span class="label">{{ row.name }}</span>
        <span class="count">{{ row.count }}</span>
        <span class="detail">{{ row.detail }}</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
h3 {
  margin: 18px 0 8px;
  font-size: 13px;
  color: var(--c-muted);
  font-weight: 600;
}
h3:first-of-type {
  margin-top: 8px;
}
ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.stem-list li {
  display: grid;
  grid-template-columns: 56px 32px 40px 1fr;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--c-chip);
  font-size: 13px;
}
.stem-list li.master {
  outline: 1px solid var(--c-primary);
}
.stem {
  font-size: 20px;
  font-weight: 700;
  font-family: 'Songti SC', 'SimSun', serif;
  text-align: center;
}
.wx {
  color: var(--c-muted);
  font-size: 12px;
}
.god {
  font-weight: 600;
}
.branch-list li {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 10px;
  align-items: center;
  font-size: 13px;
  padding: 6px 10px;
  border-radius: 8px;
  background: var(--c-chip);
}
.gods {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  display: inline-flex;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--c-card);
  border: 1px solid var(--c-border);
  font-size: 12px;
}
.chip b {
  font-family: 'Songti SC', 'SimSun', serif;
}
.category-list li {
  display: grid;
  grid-template-columns: 56px 32px 1fr;
  gap: 10px;
  align-items: center;
  font-size: 13px;
  padding: 6px 10px;
  border-radius: 8px;
  background: var(--c-chip);
}
.count {
  font-weight: 700;
  text-align: center;
}
.detail {
  color: var(--c-muted);
  font-size: 12px;
}
.label {
  color: var(--c-muted);
}
</style>
