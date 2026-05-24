<script setup>
import { ref, nextTick } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const apiUrl = import.meta.env.VITE_AI_API_URL || 'http://general-server.playit.plus'
const apiMode = (import.meta.env.VITE_AI_API_MODE || 'auto').toLowerCase()
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const getWaitTimeMs = () => Math.floor(30000 + Math.random() * 30001)

const messages = ref([
  {
    id: 1,
    role: 'assistant',
    text: 'Ola! Sou a assistente da plataforma. Posso ajudar com despesas, metas e simulacoes.'
  }
])

const newMessage = ref('')
const fileName = ref('Nenhum arquivo')
const isSending = ref(false)
const chatMessagesRef = ref(null)

const goBack = () => {
  router.push('/')
}

const scrollToBottom = async () => {
  await nextTick()
  const container = chatMessagesRef.value
  if (container) {
    container.scrollTop = container.scrollHeight
  }
}

const extractAnswer = (payload) => {
  if (!payload) return ''
  if (typeof payload === 'string') return payload
  return payload.answer || payload.response || payload.result || payload.message || ''
}

const parseApiResponse = async (response) => {
  if (!response.ok) {
    const errorText = await response.text()
    const error = new Error(errorText || 'Erro na API')
    error.status = response.status
    throw error
  }

  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const data = await response.json()
    const answer = extractAnswer(data)
    if (!answer) throw new Error('Resposta vazia')
    return answer
  }

  const text = (await response.text()).trim()
  if (!text) throw new Error('Resposta vazia')
  return text
}

const requestJson = async (question) => {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ question })
  })

  return parseApiResponse(response)
}

const requestText = async (question) => {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain'
    },
    body: question
  })

  return parseApiResponse(response)
}

const shouldFallbackToText = (error) => [400, 415, 422].includes(error?.status)

const callAiApi = async (question) => {
  if (apiMode === 'json') return requestJson(question)
  if (apiMode === 'text') return requestText(question)

  try {
    return await requestJson(question)
  } catch (error) {
    if (shouldFallbackToText(error)) {
      return requestText(question)
    }
    throw error
  }
}

const sendMessage = async () => {
  const text = newMessage.value.trim()
  if (!text || isSending.value) return

  const stamp = Date.now()
  messages.value.push({ id: stamp, role: 'user', text })
  newMessage.value = ''

  const waitMs = getWaitTimeMs()
  const waitSeconds = Math.max(1, Math.round(waitMs / 1000))
  const loadingMessage = {
    id: stamp + 1,
    role: 'assistant',
    text: 'Processando sua pergunta...',
    loading: true,
    waitSeconds
  }
  messages.value.push(loadingMessage)
  isSending.value = true
  const startTime = Date.now()
  const waitPromise = delay(waitMs)
  await scrollToBottom()

  try {
    const answer = await callAiApi(text)
    await waitPromise
    loadingMessage.text = answer
  } catch (error) {
    await waitPromise
    loadingMessage.text = 'Deu erro ao buscar a resposta.'
  } finally {
    const durationSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000))
    loadingMessage.loading = false
    loadingMessage.durationSeconds = durationSeconds
    isSending.value = false
    await scrollToBottom()
  }
}

const handleFileChange = (event) => {
  const file = event.target.files?.[0]
  fileName.value = file?.name || 'Nenhum arquivo'
}
</script>

<template>
  <div class="bg-scene" aria-hidden="true">
    <span class="glow orb-a"></span>
    <span class="glow orb-b"></span>
    <span class="glow orb-c"></span>
    <span class="noise-layer"></span>
  </div>

  <div class="dashboard-shell ai-chat-shell">
    <span class="particle-stream" aria-hidden="true"></span>

    <div class="dashboard">
      <header class="top-bar chat-top-bar">
        <img
          class="return-icon"
          src="/images/icons/return-svgrepo-com.svg"
          alt="Voltar"
          @click="goBack"
        >
        <div class="top-title">
          <span class="eyebrow">Assistente IA</span>
          <h1>Conversa inteligente</h1>
        </div>
        <div class="chat-status" aria-label="Status da IA">
          <span class="status-dot"></span>
          <span>IA online</span>
        </div>
      </header>

      <section class="chat-layout">
        <div class="chat-history">
          <div class="section-heading">
            <p>Chat</p>
            <h2>Conversa com a IA</h2>
          </div>

          <div ref="chatMessagesRef" class="chat-messages" role="log" aria-live="polite">
            <div
              v-for="message in messages"
              :key="message.id"
              class="chat-message-wrapper"
            >
              <span v-if="message.loading" class="chat-loading-note">Isso pode levar um tempinho</span>
              <div class="chat-message" :class="[message.role, { loading: message.loading }]">
                <span v-if="message.loading" class="chat-loading-indicator" aria-hidden="true"></span>
                <span class="chat-role">
                  {{ message.role === 'assistant' ? 'Assistente' : 'Voce' }}
                </span>
                <p>{{ message.text }}</p>
                <div v-if="message.loading" class="chat-message-progress" aria-hidden="true">
                  <span
                    class="chat-message-progress-bar"
                    :style="{ animationDuration: `${message.waitSeconds}s` }"
                  ></span>
                </div>
                <span v-if="message.durationSeconds" class="chat-duration">
                  Tempo de resposta: {{ message.durationSeconds }}s
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer class="chat-composer">
        <div class="chat-input-wrapper">
          <label class="chat-file-button" :title="fileName">
            <input
              class="chat-file-input"
              type="file"
              @change="handleFileChange"
            >
            <i class="fas fa-paperclip"></i>
            <span>Arquivo</span>
          </label>

          <input
            v-model="newMessage"
            class="chat-text-input"
            type="text"
            placeholder="Digite sua mensagem para a IA"
            @keydown.enter.prevent="sendMessage"
            :disabled="isSending"
          >

          <button class="chat-deploy-button" type="button" @click="sendMessage">
            Enviar
          </button>
        </div>

        <span class="chat-hint">
          Use o campo para perguntar e anexar arquivos.
        </span>
      </footer>
    </div>
  </div>
</template>
