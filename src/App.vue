<script setup lang="ts">
/**
 * App：排盘页外壳。只负责布局与组件编排，不写算法。
 */
import { onMounted } from 'vue'

import AnnualFortuneTable from './components/AnnualFortuneTable.vue'
import BirthForm from './components/BirthForm.vue'
import LuckCyclesTable from './components/LuckCyclesTable.vue'
import PillarsGrid from './components/PillarsGrid.vue'
import ShenshaList from './components/ShenshaList.vue'
import StepDebug from './components/StepDebug.vue'
import TenGodsPanel from './components/TenGodsPanel.vue'
import { useChartStore } from './stores/chart'

const store = useChartStore()

// 首次进入即用默认输入排一次，避免空白页
onMounted(() => {
  if (!store.hasResult) store.calculate()
})
</script>

<template>
  <div class="page">
    <header class="hero">
      <div>
        <h1>四柱八字排盘</h1>
        <p class="sub">六十甲子编码 · 太阳黄经定节气 · 儒略日定日柱 · 真太阳时定时柱</p>
      </div>
      <nav class="links">
        <a href="https://vite.dev" target="_blank" rel="noreferrer">Vite</a>
        <a href="https://vuejs.org" target="_blank" rel="noreferrer">Vue 3</a>
        <a href="https://pinia.vuejs.org" target="_blank" rel="noreferrer">Pinia</a>
      </nav>
    </header>

    <main>
      <BirthForm />

      <p v-if="!store.hasResult && !store.error" class="placeholder">
        填写出生信息后点击「排盘」。
      </p>

      <template v-else-if="store.hasResult">
        <PillarsGrid />
        <div class="two-col">
          <TenGodsPanel />
          <ShenshaList />
        </div>
        <LuckCyclesTable />
        <AnnualFortuneTable />
        <StepDebug />
      </template>
    </main>

    <footer class="foot">
      <span>节气与太阳黄经为简化解析式，误差约 ±0.5°（≈30 分钟），出生时刻临近节气请人工复核。</span>
      <span>大运起运按「3 天 = 1 年」换算，不足一年进位；神煞为技能 §3.9 通用版。</span>
    </footer>
  </div>
</template>

<style scoped>
.page {
  max-width: 1160px;
  margin: 0 auto;
  padding: 28px 20px 56px;
}
.hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
h1 {
  margin: 0;
  font-size: 26px;
  letter-spacing: 2px;
}
.sub {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--c-muted);
}
.links {
  display: flex;
  gap: 14px;
  font-size: 13px;
}
.links a {
  color: var(--c-primary);
  text-decoration: none;
}
.links a:hover {
  text-decoration: underline;
}
main {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.two-col {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
  gap: 18px;
}
.placeholder {
  margin: 0;
  padding: 40px;
  text-align: center;
  border: 1px dashed var(--c-border);
  border-radius: 12px;
  color: var(--c-muted);
  font-size: 14px;
}
.foot {
  margin-top: 28px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: var(--c-muted);
}
@media (max-width: 980px) {
  .two-col {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
