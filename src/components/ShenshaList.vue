<script setup lang="ts">
/**
 * ShenshaList：展示神煞。不查表（数据来自 store.result.shensha）。
 */
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import { useChartStore } from '../stores/chart'

const store = useChartStore()
const { result } = storeToRefs(store)

/** 全部五类神煞的命中状态（含未命中的，便于对照） */
const flagRows = computed(() => {
  const flags = result.value?.shensha.flags
  if (!flags) return []
  return Object.entries(flags).map(([name, hit]) => ({ name, hit }))
})
</script>

<template>
  <section v-if="result" class="card">
    <h2>神煞</h2>

    <ul class="flags">
      <li v-for="row in flagRows" :key="row.name" :class="{ on: row.hit }">
        <span class="dot" />
        <span class="name">{{ row.name }}</span>
        <span class="state">{{ row.hit ? '命中' : '无' }}</span>
      </li>
    </ul>

    <h3>命中说明</h3>
    <ul v-if="result.shensha.hits.length" class="hits">
      <li v-for="hit in result.shensha.hits" :key="hit.name">
        <b>{{ hit.name }}</b>
        <span class="branches">{{ hit.branches.join(' · ') }}</span>
        <span class="reason">{{ hit.reason }}</span>
        <span class="pos">{{ hit.positions.length }} 处</span>
      </li>
    </ul>
    <p v-else class="empty">本盘未命中基础版神煞表中的任何一项。</p>
  </section>
</template>

<style scoped>
.flags {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.flags li {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid var(--c-border);
  background: var(--c-chip);
  font-size: 13px;
  color: var(--c-muted);
}
.flags li.on {
  border-color: #b3261e;
  background: #fdecec;
  color: #b3261e;
  font-weight: 700;
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.5;
}
.flags li.on .dot {
  opacity: 1;
}
h3 {
  margin: 18px 0 8px;
  font-size: 13px;
  color: var(--c-muted);
  font-weight: 600;
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
  grid-template-columns: 72px 84px 1fr 48px;
  gap: 10px;
  align-items: center;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--c-chip);
  font-size: 13px;
}
.branches {
  font-family: 'Songti SC', 'SimSun', serif;
  font-size: 15px;
}
.reason {
  color: var(--c-muted);
  font-size: 12px;
}
.pos {
  text-align: right;
  font-size: 12px;
  color: var(--c-muted);
}
.empty {
  margin: 0;
  font-size: 13px;
  color: var(--c-muted);
}
</style>
