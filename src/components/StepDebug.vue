<script setup lang="ts">
/**
 * StepDebug：展示 core 输出的中间量 steps。只读，不修改 steps。
 */
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'

import { useChartStore } from '../stores/chart'

const store = useChartStore()
const { result } = storeToRefs(store)

const expanded = ref<number[]>([0])

function toggle(index: number): void {
  expanded.value = expanded.value.includes(index)
    ? expanded.value.filter((i) => i !== index)
    : [...expanded.value, index]
}

/** 把 unknown 输出格式化成可读 JSON */
function pretty(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

const json = computed(() => store.exportJson())

function copyJson(): void {
  const text = json.value
  if (!text) return
  void navigator.clipboard?.writeText(text)
}

function downloadJson(): void {
  const text = json.value
  if (!text) return
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `bazi-${result.value?.input.birthDatetime.replace(/[: ]/g, '-') ?? 'chart'}.json`
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <section v-if="result" class="card">
    <header class="head">
      <h2>计算过程（steps）</h2>
      <div class="btns">
        <button type="button" @click="copyJson">复制 JSON</button>
        <button type="button" @click="downloadJson">下载 JSON</button>
      </div>
    </header>

    <ol class="steps">
      <li v-for="(step, index) in result.steps" :key="step.name">
        <button type="button" class="step-head" @click="toggle(index)">
          <span class="idx">{{ index + 1 }}</span>
          <span class="name">{{ step.name }}</span>
          <span class="formula">{{ step.formula }}</span>
          <span class="arrow">{{ expanded.includes(index) ? '−' : '+' }}</span>
        </button>
        <div v-if="expanded.includes(index)" class="step-body">
          <div class="pane">
            <h4>inputs</h4>
            <pre>{{ pretty(step.inputs) }}</pre>
          </div>
          <div class="pane">
            <h4>output</h4>
            <pre>{{ pretty(step.output) }}</pre>
          </div>
        </div>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.btns {
  display: flex;
  gap: 8px;
}
.btns button {
  padding: 7px 12px;
  border: 1px solid var(--c-border);
  border-radius: 8px;
  background: var(--c-input);
  color: var(--c-text);
  cursor: pointer;
  font-size: 12px;
}
.btns button:hover {
  border-color: var(--c-primary);
}
.steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.steps > li {
  border: 1px solid var(--c-border);
  border-radius: 10px;
  overflow: hidden;
}
.step-head {
  width: 100%;
  display: grid;
  grid-template-columns: 24px 116px 1fr 20px;
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
  border: 0;
  background: var(--c-chip);
  color: var(--c-text);
  cursor: pointer;
  text-align: left;
  font-size: 13px;
}
.idx {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--c-primary);
  color: #fff;
  font-size: 11px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.name {
  font-weight: 700;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.formula {
  color: var(--c-muted);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.arrow {
  text-align: center;
  color: var(--c-muted);
}
.step-body {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  padding: 12px;
  border-top: 1px solid var(--c-border);
}
.pane h4 {
  margin: 0 0 6px;
  font-size: 12px;
  color: var(--c-muted);
  font-weight: 600;
}
pre {
  margin: 0;
  padding: 10px;
  border-radius: 8px;
  background: var(--c-code);
  font-size: 12px;
  line-height: 1.5;
  overflow-x: auto;
  max-height: 320px;
}
@media (max-width: 720px) {
  .step-body {
    grid-template-columns: minmax(0, 1fr);
  }
  .step-head {
    grid-template-columns: 24px 1fr 20px;
  }
  .formula {
    display: none;
  }
}
</style>
