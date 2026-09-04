<script setup>
import { PER_PAGE_MIN, PER_PAGE_MAX } from '@/composables/usePagedList'

const props = defineProps({
  page: { type: Number, required: true },
  perPage: { type: Number, required: true },
  totalPages: { type: Number, required: true },
  total: { type: Number, required: true }
})

const emit = defineEmits(['update:page', 'update:perPage'])

const go = (delta) => emit('update:page', props.page + delta)
const onPageInput = (e) => emit('update:page', e.target.value)
const onPerPage = (e) => emit('update:perPage', e.target.value)
</script>

<template>
  <div class="pager">
    <div class="pager-nav">
      <button class="pager-btn" :disabled="page <= 1" title="Página anterior" @click="go(-1)">
        <i class="fas fa-chevron-left"></i>
      </button>
      <span class="pager-pos">
        <input
          class="pager-input num"
          type="number"
          :min="1"
          :max="totalPages"
          :value="page"
          aria-label="Número da página"
          @change="onPageInput"
        />
        de {{ totalPages }}
      </span>
      <button class="pager-btn" :disabled="page >= totalPages" title="Próxima página" @click="go(1)">
        <i class="fas fa-chevron-right"></i>
      </button>
    </div>

    <label class="pager-size">
      <span>por página</span>
      <input
        class="pager-input num"
        type="number"
        :min="PER_PAGE_MIN"
        :max="PER_PAGE_MAX"
        :value="perPage"
        aria-label="Itens por página"
        @change="onPerPage"
      />
    </label>

    <span class="pager-total">{{ total }} itens</span>
  </div>
</template>
