<script setup lang="ts">
/**
 * TenGodsPanel：展示十神与藏干一览。
 *
 * 每一个天干 / 地支都可点击：点击即把该柱设为「当前选中柱」，
 * 四柱页的详情面板与神煞列表随之切换（状态在 store，组件不自己算）。
 */
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import { GAN_COLOR, GAN_WU_XING_BY_NAME } from '../core/constants'
import type { GanName } from '../core/constants'
import { useChartStore } from '../stores/chart'
import type { PillarKey } from '../types/bazi'

const store = useChartStore()
const { result, selectedPillar } = storeToRefs(store)

const PILLAR_KEYS = ['year', 'month', 'day', 'hour'] as const
const LABELS: Record<PillarKey, { stem: string; branch: string }> = {
  year: { stem: '年干', branch: '年支' },
  month: { stem: '月干', branch: '月支' },
  day: { stem: '日干', branch: '日支' },
  hour: { stem: '时干', branch: '时支' },
}

/** 该柱命中的神煞数量（给个提示徽标） */
function hitCountOf(key: PillarKey): number {
  const current = result.value
  if (!current) return 0
  return current.shensha.hits.filter((hit) => hit.positions.includes(key)).length
}

function pick(key: PillarKey): void {
  store.selectPillar(key)
}

/** 天干十神：年 / 月 / 日 / 时 */
const stemRows = computed(() => {
  const current = result.value
  if (!current) return []
  const gods: Record<PillarKey, string> = {
    year: current.tenGods.yearStem,
    month: current.tenGods.monthStem,
    day: '日主',
    hour: current.tenGods.hourStem,
  }
  return PILLAR_KEYS.map((key) => ({
    key,
    label: LABELS[key].stem,
    stem: current.pillars[key].stem,
    god: gods[key],
    isMaster: key === 'day',
    hitCount: hitCountOf(key),
  }))
})

/** 地支藏干十神 */
const branchRows = computed(() => {
  const current = result.value
  if (!current) return []
  return PILLAR_KEYS.map((key) => ({
    key,
    label: LABELS[key].branch,
    branch: current.pillars[key].branch,
    stems: current.hiddenStems[key],
    gods: current.tenGods.branches[key],
    hitCount: hitCountOf(key),
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
    <header class="head">
      <h2>十神</h2>
      <span class="tip">点击任意天干 / 地支，四柱与神煞同步切换</span>
    </header>

    <h3>天干十神（以日干为「我」）</h3>
    <ul class="stem-list">
      <li
        v-for="row in stemRows"
        :key="row.key"
        class="clickable"
        :class="{ master: row.isMaster, selected: selectedPillar === row.key }"
        role="button"
        tabindex="0"
        @click="pick(row.key)"
        @keydown.enter.prevent="pick(row.key)"
        @keydown.space.prevent="pick(row.key)"
      >
        <span class="label">{{ row.label }}</span>
        <span class="stem" :style="{ color: colorOf(row.stem) }">{{ row.stem }}</span>
        <span class="wx">{{ wuXingOf(row.stem) }}</span>
        <span class="god">{{ row.god }}</span>
        <span v-if="row.hitCount > 0" class="badge">{{ row.hitCount }} 神煞</span>
      </li>
    </ul>

    <h3>地支藏干十神</h3>
    <ul class="branch-list">
      <li
        v-for="row in branchRows"
        :key="row.key"
        class="clickable"
        :class="{ selected: selectedPillar === row.key }"
        role="button"
        tabindex="0"
        @click="pick(row.key)"
        @keydown.enter.prevent="pick(row.key)"
        @keydown.space.prevent="pick(row.key)"
      >
        <span class="label">{{ row.label }}（{{ row.branch }}）</span>
        <span class="gods">
          <span v-for="(stem, i) in row.stems" :key="`${stem}-${i}`" class="chip">
            <b :style="{ color: colorOf(stem) }">{{ stem }}</b>
            {{ row.gods[i] }}
          </span>
        </span>
        <span v-if="row.hitCount > 0" class="badge">{{ row.hitCount }} 神煞</span>
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
.head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.head h2 {
  margin: 0;
}
.tip {
  font-size: 12px;
  color: var(--c-muted);
}
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
.clickable {
  cursor: pointer;
  transition:
    outline-color 0.15s,
    background 0.15s;
}
.clickable:hover {
  outline: 1px solid color-mix(in srgb, var(--c-primary) 55%, transparent);
}
.clickable.selected {
  outline: 2px solid var(--c-primary);
  background: color-mix(in srgb, var(--c-primary) 10%, var(--c-chip));
}
.stem-list li {
  display: grid;
  grid-template-columns: 52px 32px 40px 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--c-chip);
  font-size: 13px;
}
.stem-list li.master .god {
  color: var(--c-primary);
}
.badge {
  font-size: 11px;
  color: #b3261e;
  background: #fdecec;
  border-radius: 999px;
  padding: 1px 8px;
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
  grid-template-columns: 96px 1fr auto;
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
