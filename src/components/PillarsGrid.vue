<script setup lang="ts">
/**
 * PillarsGrid：四柱布局 + 计时口径切换 + 选中柱详情。
 *
 * 数据全部由 store 的 pillarList / selectedPillarDetail 提供，本组件不访问 core 算法。
 * 唯一"非展示"的动作是调用 store.setTimeStandard()（重排一次）——
 * 因为口径切换本身就要求重算时柱，放在这里才能做到"点一下即时看真/平太阳时"。
 */
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'

import PillarCard from './PillarCard.vue'
import { WU_XING_COLOR } from '../core/constants'
import type { WuXingName } from '../core/constants'
import { useChartStore } from '../stores/chart'
import type { PillarKey, TimeStandard } from '../types/bazi'

const store = useChartStore()
const {
  result,
  pillarList,
  clockPair,
  selectedPillar,
  selectedPillarDetail,
  selectedShenshaNames,
  input,
} = storeToRefs(store)

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

/** 是否展开「含藏干」的细算视图 */
const showHidden = ref(false)

/** 把计数表转成条形图行数据 */
function toRows(tally: Record<WuXingName, number>) {
  const total = Object.values(tally).reduce((sum, n) => sum + n, 0) || 1
  return (Object.entries(tally) as [WuXingName, number][]).map(([name, count]) => ({
    name,
    count,
    percent: Math.round((count / total) * 100),
    color: WU_XING_COLOR[name],
  }))
}

/** 本气计数：四柱天干 + 四柱地支本气，各计 1（合计 8） */
const wuXingRows = computed(() => toRows(store.wuXingCount))

/** 细算：天干 + 地支全部藏干（合计 > 8） */
const wuXingRowsAll = computed(() => toRows(store.wuXingCountAll))

const activeRows = computed(() => (showHidden.value ? wuXingRowsAll.value : wuXingRows.value))

/** 当前视图的计数合计（本气视图恒为 8；藏干视图更大） */
const activeTotal = computed(() => activeRows.value.reduce((sum, row) => sum + row.count, 0))

/** 计时口径切换项 */
const CLOCKS: { value: TimeStandard; label: string; note: string }[] = [
  { value: 'true_solar', label: '真太阳时', note: '平太阳时 + 均时差 EoT' },
  { value: 'standard', label: '平太阳时', note: '钟表时（北京时间），不做修正' },
]

function onPickPillar(key: PillarKey): void {
  store.selectPillar(key)
}

function onPickClock(value: TimeStandard): void {
  store.setTimeStandard(value)
}
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
          <dt>时柱所用（{{ result.trueSolarTime.standardLabel }}）</dt>
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

    <!-- 计时口径：点一下即时重排时柱，两档自由对照 -->
    <div class="clock-switch">
      <span class="switch-label">计时口径</span>
      <div class="segmented">
        <button
          v-for="item in CLOCKS"
          :key="item.value"
          type="button"
          :class="{ active: input.timeStandard === item.value }"
          :title="item.note"
          @click="onPickClock(item.value)"
        >
          {{ item.label }}
        </button>
      </div>
      <div class="clocks">
        <div
          v-for="item in clockPair"
          :key="item.key"
          class="clock"
          :class="{ used: item.key === input.timeStandard }"
        >
          <span class="clock-label">{{ item.label }}</span>
          <span class="clock-value">{{ item.clock }}</span>
        </div>
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
        :selected="selectedPillar === item.key"
        clickable
        @select="onPickPillar(item.key)"
      />
    </div>

    <!-- 选中柱详情：十神 + 神煞 -->
    <div v-if="selectedPillarDetail" class="detail">
      <header class="detail-head">
        <h3>
          {{ selectedPillarDetail.label }}详情 ·
          <span class="detail-ganzhi">{{ selectedPillarDetail.pillar.ganzhi }}</span>
        </h3>
        <span class="detail-hint">点击上方任意柱切换</span>
      </header>

      <div class="detail-body">
        <dl class="detail-list">
          <div>
            <dt>天干</dt>
            <dd>
              {{ selectedPillarDetail.pillar.stem }}
              <span class="god">{{ selectedPillarDetail.stemTenGod }}</span>
            </dd>
          </div>
          <div>
            <dt>地支</dt>
            <dd>
              {{ selectedPillarDetail.pillar.branch }}
              <span class="muted">（{{ selectedPillarDetail.pillar.branchIndex }}）</span>
            </dd>
          </div>
          <div>
            <dt>藏干十神</dt>
            <dd class="chips">
              <span
                v-for="(stem, i) in selectedPillarDetail.hiddenStems"
                :key="`${stem}-${i}`"
                class="chip"
              >
                <b>{{ stem }}</b>
                {{ selectedPillarDetail.hiddenGods[i] }}
              </span>
            </dd>
          </div>
          <div>
            <dt>六十甲子序号</dt>
            <dd class="muted">k = {{ selectedPillarDetail.pillar.k }}</dd>
          </div>
        </dl>

        <div class="detail-shensha">
          <h4>本柱神煞（{{ selectedShenshaNames.length }}）</h4>
          <p v-if="selectedShenshaNames.length === 0" class="empty">本柱未命中神煞。</p>
          <div v-else class="names">
            <span v-for="name in selectedShenshaNames" :key="name" class="name-chip">{{ name }}</span>
          </div>
          <p class="empty hint">判定依据见右侧「神煞」面板</p>
        </div>
      </div>
    </div>

    <div class="balance">
      <header class="balance-head">
        <h3>
          五行计数 ·
          {{ showHidden ? '天干 + 地支全部藏干' : '天干 + 地支本气' }}
          <span class="total">合计 {{ activeTotal }}</span>
        </h3>
        <button type="button" class="toggle" @click="showHidden = !showHidden">
          {{ showHidden ? '只看本气' : '展开藏干细算' }}
        </button>
      </header>
      <div v-for="row in activeRows" :key="row.name" class="balance-row">
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
/** 计时口径切换条 */
.clock-switch {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 10px 12px;
  margin-bottom: 16px;
  border-radius: 10px;
  background: var(--c-chip);
}
.switch-label {
  font-size: 12px;
  color: var(--c-muted);
}
.segmented {
  display: inline-flex;
  border: 1px solid var(--c-border);
  border-radius: 8px;
  overflow: hidden;
}
.segmented button {
  border: 0;
  padding: 6px 14px;
  background: var(--c-input);
  color: var(--c-muted);
  cursor: pointer;
  font-size: 13px;
}
.segmented button.active {
  background: var(--c-primary);
  color: #fff;
  font-weight: 600;
}
.clocks {
  display: flex;
  gap: 10px;
  flex: 1;
  min-width: 260px;
}
.clock {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  flex: 1;
  padding: 6px 12px;
  border-radius: 8px;
  background: var(--c-card);
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
  font-size: 16px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}
/** 选中柱详情 */
.detail {
  margin-top: 16px;
  padding: 14px 16px;
  border: 1px solid var(--c-border);
  border-radius: 12px;
  background: var(--c-chip);
}
.detail-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.detail h3 {
  margin: 0;
  font-size: 15px;
}
.detail-ganzhi {
  font-family: 'Songti SC', 'SimSun', serif;
  font-size: 18px;
}
.detail-hint {
  font-size: 12px;
  color: var(--c-muted);
}
.detail-body {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  gap: 18px;
}
.detail-list {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.detail-list > div {
  display: grid;
  grid-template-columns: 92px 1fr;
  gap: 8px;
  font-size: 13px;
  align-items: baseline;
}
.detail-list dt {
  color: var(--c-muted);
  font-size: 12px;
}
.detail-list dd {
  margin: 0;
}
.detail-list .god {
  margin-left: 6px;
  font-weight: 600;
  color: var(--c-primary);
}
.chips {
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
.detail-shensha h4 {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--c-muted);
  font-weight: 600;
}
.detail-shensha .names {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.detail-shensha .name-chip {
  padding: 3px 10px;
  border-radius: 999px;
  background: #fdecec;
  color: #b3261e;
  font-size: 12px;
  font-weight: 600;
}
.detail-shensha .hint {
  margin-top: 8px;
}
.hits,
.all {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.hits li {
  display: grid;
  grid-template-columns: 72px 80px 1fr;
  gap: 8px;
  align-items: center;
  font-size: 12px;
  padding: 6px 8px;
  border-radius: 6px;
  background: var(--c-card);
}
.all li {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 6px;
  background: var(--c-card);
}
.branches {
  font-family: 'Songti SC', 'SimSun', serif;
}
.reason {
  color: var(--c-muted);
}
.empty {
  margin: 0;
  font-size: 12px;
  color: var(--c-muted);
}
.muted {
  color: var(--c-muted);
}
.balance {
  margin-top: 18px;
}
.balance-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}
.balance h3 {
  margin: 0;
  font-size: 13px;
  color: var(--c-muted);
  font-weight: 600;
}
.balance .total {
  margin-left: 6px;
  color: var(--c-text);
}
.toggle {
  padding: 4px 10px;
  border: 1px solid var(--c-border);
  border-radius: 999px;
  background: var(--c-input);
  color: var(--c-text);
  font-size: 12px;
  cursor: pointer;
}
.toggle:hover {
  border-color: var(--c-primary);
  color: var(--c-primary);
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
@media (max-width: 960px) {
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .detail-body {
    grid-template-columns: minmax(0, 1fr);
  }
}
@media (max-width: 520px) {
  .grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
