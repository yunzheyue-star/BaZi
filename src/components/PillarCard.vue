<script setup lang="ts">
/**
 * PillarCard：展示单柱的干支、藏干、十神。
 * 十神与藏干由父组件传入，本组件不计算（技能 §5.4）。
 */
import { computed } from 'vue'

import { GAN_COLOR, ZHI_COLOR } from '../core/constants'
import type { GanName, ZhiName } from '../core/constants'
import type { Pillar } from '../types/bazi'

const props = defineProps<{
  label: string
  pillar: Pillar
  hiddenStems: string[]
  hiddenGods: string[]
  stemTenGod: string
  isDayMaster?: boolean
}>()

const stemColor = computed(() => GAN_COLOR[props.pillar.stem as GanName] ?? '#666')
const branchColor = computed(() => ZHI_COLOR[props.pillar.branch as ZhiName] ?? '#666')
</script>

<template>
  <article class="pillar" :class="{ master: isDayMaster }">
    <header>
      <span class="label">{{ label }}</span>
      <span class="k">k={{ pillar.k }}</span>
    </header>

    <div class="chars">
      <span class="char" :style="{ color: stemColor }">{{ pillar.stem }}</span>
      <span class="char" :style="{ color: branchColor }">{{ pillar.branch }}</span>
    </div>

    <div class="ten-god" :class="{ master: isDayMaster }">{{ stemTenGod }}</div>

    <dl class="hidden">
      <div v-for="(stem, i) in hiddenStems" :key="`${stem}-${i}`" class="hidden-row">
        <dt :style="{ color: GAN_COLOR[stem as GanName] ?? '#666' }">{{ stem }}</dt>
        <dd>{{ hiddenGods[i] ?? '—' }}</dd>
      </div>
      <div v-if="hiddenStems.length === 0" class="hidden-row">
        <dt>—</dt>
        <dd>无藏干</dd>
      </div>
    </dl>

    <footer class="index">干 {{ pillar.stemIndex }} · 支 {{ pillar.branchIndex }}</footer>
  </article>
</template>

<style scoped>
.pillar {
  border: 1px solid var(--c-border);
  border-radius: 12px;
  padding: 14px 12px;
  background: var(--c-card);
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}
.pillar.master {
  border-color: var(--c-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--c-primary) 18%, transparent);
}
header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 12px;
  color: var(--c-muted);
}
.label {
  font-weight: 700;
  color: var(--c-text);
  font-size: 13px;
}
.chars {
  display: flex;
  gap: 10px;
  justify-content: center;
}
.char {
  font-size: 42px;
  line-height: 1.1;
  font-weight: 700;
  font-family: 'Songti SC', 'SimSun', serif;
}
.ten-god {
  text-align: center;
  font-size: 13px;
  padding: 3px 0;
  border-radius: 6px;
  background: var(--c-chip);
  color: var(--c-muted);
}
.ten-god.master {
  background: color-mix(in srgb, var(--c-primary) 16%, transparent);
  color: var(--c-primary);
  font-weight: 700;
}
.hidden {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
}
.hidden-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--c-chip);
}
.hidden-row dt {
  font-weight: 700;
}
.hidden-row dd {
  margin: 0;
  color: var(--c-muted);
}
.index {
  font-size: 11px;
  color: var(--c-muted);
  text-align: center;
}
</style>
