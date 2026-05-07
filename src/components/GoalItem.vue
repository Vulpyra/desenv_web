<script setup>
import { computed } from 'vue'

const props = defineProps({
  meta: Object,
  isHidden: Boolean
})

const emit = defineEmits(['remove'])

const porcentagem = computed(() => 
  Math.min((props.meta.atual / props.meta.alvo) * 100, 100).toFixed(1)
)
</script>

<template>
  <div class="goal-item">
    <div class="goal-header">
      <span>
        <i class="fas" :class="meta.icone" style="margin-right: 8px"></i>
        {{ meta.nome }}
      </span>
      <div>
        <span :class="{ 'value-hidden': isHidden }">
          R$ {{ meta.atual }} / R$ {{ meta.alvo }}
        </span>
        <button class="btn-remove" @click="$emit('remove', meta.id)" style="margin-left: 5px">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
    <div class="progress-container">
      <div
        class="progress-bar"
        :style="{
          width: porcentagem + '%',
          background: `linear-gradient(90deg, ${meta.cor1}, ${meta.cor2})`
        }"
      ></div>
    </div>
  </div>
</template>
