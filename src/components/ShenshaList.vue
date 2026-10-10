<script setup lang="ts">
/**
 * ShenshaList：展示神煞。
 *
 * **主区域随「当前选中柱」切换** —— 点四柱或十神面板的任意柱，这里就显示该柱命中的神煞，
 * 每条都带判定依据。下方「全盘命中」给出整张盘的所有神煞，可折叠。
 *
 * 判定规则在 `core/shenshaMore.ts`，本组件只负责展示与切换。
 */
import { ref } from 'vue'
import { storeToRefs } from 'pinia'

import { useChartStore } from '../stores/chart'
import type { PillarKey } from '../types/bazi'

const store = useChartStore()
const { result, selectedPillar, selectedShenshaHits, allShenshaHits, shenshaPerPillar } =
  storeToRefs(store)

/** 全盘命中是否展开 */
const showAll = ref(false)

const PILLAR_KEYS: PillarKey[] = ['year', 'month', 'day', 'hour']

const PILLAR_LABEL: Record<PillarKey, string> = {
  year: '年柱',
  month: '月柱',
  day: '日柱',
  hour: '时柱',
}

/** 柱位 → 该柱命中的神煞数（切换按钮上的角标） */
function countOf(key: PillarKey): number {
  return shenshaPerPillar.value?.byPillar[key].length ?? 0
}

function pick(key: PillarKey): void {
  store.selectPillar(key)
}
</script>

<template>
  <section v-if="result" class="card">
    <header class="head">
      <h2>神煞</h2>
      <span class="tip">随选中柱变化</span>
    </header>

    <!-- 柱切换：与四柱 / 十神面板共享同一个选中态 -->
    <div class="tabs">
      <button
        v-for="key in PILLAR_KEYS"
        :key="key"
        type="button"
        :class="{ active: selectedPillar === key }"
        @click="pick(key)"
      >
        {{ PILLAR_LABEL[key] }}
        <span class="badge" :class="{ zero: countOf(key) === 0 }">{{ countOf(key) }}</span>
      </button>
    </div>

    <div class="current">
      <h3>
        {{ PILLAR_LABEL[selectedPillar] }}（{{ result.pillars[selectedPillar].ganzhi }}）命中神煞
        <span class="count">{{ selectedShenshaHits.length }} 项</span>
      </h3>

      <ul v-if="selectedShenshaHits.length > 0" class="hits">
        <li v-for="hit in selectedShenshaHits" :key="hit.name">
          <span class="name">{{ hit.name }}</span>
          <span class="target">{{ hit.targetName }}</span>
          <span class="reason">{{ hit.reason }}</span>
        </li>
      </ul>
      <p v-else class="empty">本柱未命中神煞。</p>
    </div>

    <button type="button" class="toggle" @click="showAll = !showAll">
      {{ showAll ? '收起全盘命中' : `展开全盘命中（${allShenshaHits.length} 条）` }}
    </button>

    <ul v-if="showAll" class="all">
      <li v-for="(hit, i) in allShenshaHits" :key="`${hit.name}-${i}`">
        <span class="name">{{ hit.name }}</span>
        <span class="target">{{ hit.targetName }}</span>
        <span class="positions">{{ hit.positions.map((k) => PILLAR_LABEL[k]).join('、') }}</span>
        <span class="reason">{{ hit.reason }}</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}
.head h2 {
  margin: 0;
}
.tip {
  font-size: 12px;
  color: var(--c-muted);
}
/** 柱切换按钮：与四柱选中态同步 */
.tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 14px;
}
.tabs button {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 7px 10px;
  border: 1px solid var(--c-border);
  border-radius: 8px;
  background: var(--c-input);
  color: var(--c-muted);
  font-size: 13px;
  cursor: pointer;
}
.tabs button:hover {
  border-color: var(--c-primary);
}
.tabs button.active {
  border-color: var(--c-primary);
  background: color-mix(in srgb, var(--c-primary) 14%, transparent);
  color: var(--c-primary);
  font-weight: 700;
}
.badge {
  min-width: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: #fdecec;
  color: #b3261e;
  font-size: 11px;
  line-height: 16px;
  text-align: center;
}
.badge.zero {
  background: var(--c-chip);
  color: var(--c-muted);
}
.current h3 {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
}
.current .count {
  margin-left: 6px;
  color: var(--c-muted);
  font-weight: 400;
}
.hits {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.hits li {
  display: grid;
  grid-template-columns: 80px 76px 1fr;
  gap: 8px;
  align-items: baseline;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--c-chip);
  font-size: 12px;
}
.hits .name {
  font-weight: 700;
}
.hits .target {
  font-family: 'Songti SC', 'SimSun', serif;
  font-size: 15px;
  color: var(--c-primary);
}
.reason {
  color: var(--c-muted);
}
.empty {
  margin: 0;
  font-size: 12px;
  color: var(--c-muted);
}
.toggle {
  margin-top: 14px;
  padding: 5px 12px;
  border: 1px solid var(--c-border);
  border-radius: 999px;
  background: var(--c-input);
  color: var(--c-muted);
  font-size: 12px;
  cursor: pointer;
}
.toggle:hover {
  border-color: var(--c-primary);
  color: var(--c-primary);
}
.all {
  list-style: none;
  margin: 12px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.all li {
  display: grid;
  grid-template-columns: 80px 76px 84px 1fr;
  gap: 8px;
  align-items: baseline;
  padding: 6px 10px;
  border-radius: 8px;
  background: var(--c-chip);
  font-size: 12px;
}
.all .name {
  font-weight: 600;
}
.all .target {
  font-family: 'Songti SC', 'SimSun', serif;
  color: var(--c-primary);
}
.all .positions {
  color: var(--c-text);
}
@media (max-width: 640px) {
  .hits li,
  .all li {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
