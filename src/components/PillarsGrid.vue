<script setup lang="ts">
/**
 * PillarsGrid：四柱布局。数据全部由 store 的 pillarList 提供，本组件不访问 core。
 */
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import PillarCard from './PillarCard.vue'
import { WU_XING_COLOR } from '../core/constants'
import type { WuXingName } from '../core/constants'
import { useChartStore } from '../stores/chart'

const store = useChartStore()
const { result, pillarList, clockTriplet } = storeToRefs(store)

/** 地支十神按柱位取 */
const godsOf = computed(() => {
  const map: Record<string, string[]> = {}
  const current = result.value
  if (!current) return map
  map.year = current.tenGods.branches.year
  map.month = current.tenGods.branches.month
  map.day = current.tenGods.branches.day
  map.hour = current.tenGods.branches.hour
  return map
})

const wuXingRows = computed(() => {
  const tally: Record<WuXingName, number> = store.wuXingCount
  const total = Object.values(tally).reduce((sum, n) => sum + n, 0) || 1
  return (Object.entries(tally) as [WuXingName, number][]).map(([name, count]) => ({
    name,
    count,
    percent: Math.round((count / total) * 100),
    color: WU_XING_COLOR[name],
  }))
})
</script>

<template>
  <section v-if="result" class="card">
    <header class="head">
      <div>
        <h2>四柱</h2>
        <p class="bazi">{{ result.bazi }}</p>
      </div>
      <dl class="meta">
        <div>
          <dt>时辰所用（{{ result.trueSolarTime.standardLabel }}）</dt>
          <dd>{{ store.trueSolarLabel }}</dd>
        </div>
        <div>
          <dt>节气</dt>
          <dd>{{ result.solarTerm.termName }} · 月令 {{ result.solarTerm.monthOrder }}</dd>
        </div>
        <div>
          <dt>太阳黄经</dt>
          <dd>{{ result.solarTerm.lambda }}°</dd>
        </div>
      </dl>
    </header>

    <div class="clocks">
      <div
        v-for="item in clockTriplet"
        :key="item.key"
        class="clock"
        :class="{ used: item.key === result.trueSolarTime.standard }"
      >
        <span class="clock-label">{{ item.label }}</span>
        <span class="clock-value">{{ item.clock }}</span>
      </div>
    </div>

    <div class="grid">
      <PillarCard
        v-for="item in pillarList"
        :key="item.key"
        :label="item.label"
        :pillar="item.pillar"
        :hidden-stems="item.hiddenStems"
        :hidden-gods="godsOf[item.key] ?? []"
        :stem-ten-god="item.stemTenGod"
        :is-day-master="item.key === 'day'"
      />
    </div>

    <div class="balance">
      <h3>五行计数（天干 + 地支本气）</h3>
      <div v-for="row in wuXingRows" :key="row.name" class="balance-row">
        <span class="name">{{ row.name }}</span>
        <span class="bar">
          <i :style="{ width: `${row.percent}%`, background: row.color }" />
        </span>
        <span class="count">{{ row.count }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-end;
  margin-bottom: 16px;
}
.bazi {
  margin: 6px 0 0;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 4px;
  font-family: 'Songti SC', 'SimSun', serif;
}
.meta {
  display: flex;
  gap: 22px;
  margin: 0;
  font-size: 12px;
}
.meta dt {
  color: var(--c-muted);
}
.meta dd {
  margin: 4px 0 0;
  font-weight: 600;
}
.grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}
/** 三种时钟对照条：标出时柱实际采用的那一档 */
.clocks {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 16px;
}
.clock {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 10px;
  background: var(--c-chip);
  border: 1px solid transparent;
}
.clock.used {
  border-color: var(--c-primary);
  background: color-mix(in srgb, var(--c-primary) 12%, transparent);
}
.clock-label {
  font-size: 12px;
  color: var(--c-muted);
}
.clock-value {
  font-size: 17px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.balance {
  margin-top: 18px;
}
.balance h3 {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--c-muted);
  font-weight: 600;
}
.balance-row {
  display: grid;
  grid-template-columns: 24px 1fr 28px;
  gap: 10px;
  align-items: center;
  font-size: 12px;
  margin-bottom: 6px;
}
.bar {
  height: 8px;
  border-radius: 4px;
  background: var(--c-chip);
  overflow: hidden;
}
.bar i {
  display: block;
  height: 100%;
  border-radius: 4px;
}
.count {
  text-align: right;
  color: var(--c-muted);
}
@media (max-width: 900px) {
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .clocks {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 520px) {
  .grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .clocks {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
