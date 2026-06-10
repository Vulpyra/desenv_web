<script setup>
import { ref, nextTick } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const GUIDE_KEY = 'rf_aiChatGuideDismissed'
const showGuide = ref(localStorage.getItem(GUIDE_KEY) !== 'true')
const dontShowGuide = ref(false)
const closeGuide = () => {
  if (dontShowGuide.value) localStorage.setItem(GUIDE_KEY, 'true')
  showGuide.value = false
}

const apiUrl = import.meta.env.VITE_AI_API_URL || 'http://127.0.0.1:8008'
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
  console.log(`Initiating request for: ${question}`)
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

  console.log(`initiating delivery of message: ${text}`)

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

  <!-- Setup guide modal -->
  <Teleport to="body">
    <div v-if="showGuide" class="modal-overlay" role="dialog" aria-modal="true" aria-label="Guia de configuração">
      <div class="glass-panel modal-content ai-guide-modal">

        <div class="ai-guide-wip-banner">
          <i class="fas fa-triangle-exclamation"></i>
          <div>
            <strong>Funcionalidade em desenvolvimento</strong>
            <p>
              O assistente de IA está em fase experimental. O processo de configuração abaixo é temporário —
              estamos trabalhando para torná-lo automático em versões futuras.
              Se você não tem experiência técnica, tudo bem pular por agora.
            </p>
          </div>
        </div>

        <h3 class="panel-title" style="margin: 0 0 6px">Como ativar o chat local</h3>
        <p style="color: var(--text-soft); font-size: 0.85rem; margin-bottom: 20px">
          O assistente usa um modelo de linguagem rodando no <strong>seu computador</strong>.
          Siga os passos abaixo para configurá-lo.
        </p>

        <div class="ai-guide-steps">

          <div class="ai-guide-step">
            <span class="ai-guide-step-num">1</span>
            <div>
              <p class="ai-guide-step-title">Baixe o aplicativo de IA local</p>
              <p class="ai-guide-step-desc">
                O aplicativo hospeda o modelo no seu computador e disponibiliza um servidor local
                que este chat utiliza. Faça o download e execute o arquivo.
              </p>
              <a
                href="https://github.com/Valkorz/slm-rag-assistant/releases"
                target="_blank"
                rel="noopener"
                class="btn-main-action ai-guide-download-btn"
              >
                <i class="fab fa-github" style="margin-right: 8px"></i>
                Baixar no GitHub
              </a>
            </div>
          </div>

          <div class="ai-guide-step">
            <span class="ai-guide-step-num">2</span>
            <div>
              <p class="ai-guide-step-title">Baixe um modelo de linguagem (.GGUF)</p>
              <p class="ai-guide-step-desc">
                Acesse <strong>huggingface.co/models</strong> e procure por modelos com a tag
                <code>Q4_K</code> no nome — versões comprimidas e leves (4–8B parâmetros
                funcionam bem em computadores comuns). Salve o arquivo <code>.gguf</code> em uma
                pasta de sua escolha.
              </p>
              <img src="/images/huggingface-models.png" alt="Modelos no HuggingFace" class="ai-guide-img" />
            </div>
          </div>

          <div class="ai-guide-step">
            <span class="ai-guide-step-num">3</span>
            <div>
              <p class="ai-guide-step-title">Selecione a pasta dos modelos</p>
              <p class="ai-guide-step-desc">
                No aplicativo, clique em <strong>"Select models root folder"</strong> e aponte para
                a pasta onde salvou o arquivo <code>.gguf</code>. O modelo aparecerá automaticamente
                nos menus.
              </p>
              <img src="/images/select-models-folder.png" alt="Selecionar pasta dos modelos" class="ai-guide-img" />
            </div>
          </div>

          <div class="ai-guide-step">
            <span class="ai-guide-step-num">4</span>
            <div>
              <p class="ai-guide-step-title">Ative o servidor TCP</p>
              <p class="ai-guide-step-desc">
                No aplicativo, ative o switch <strong>"TCP"</strong> para iniciar o servidor local.
                Mantenha o aplicativo aberto enquanto usa o chat.
              </p>
              <img src="/images/enable-server.png" alt="Ativar servidor TCP" class="ai-guide-img" />
            </div>
          </div>

          <div class="ai-guide-step">
            <span class="ai-guide-step-num">5</span>
            <div>
              <p class="ai-guide-step-title">Pronto — use o chat!</p>
              <p class="ai-guide-step-desc">
                Com o servidor ativo, as mensagens daqui são processadas pelo modelo local.
                Seus dados não saem do seu computador.
              </p>
            </div>
          </div>

        </div>

        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 12px; margin-top: 24px">
          <label class="ai-guide-checkbox-label">
            <input type="checkbox" v-model="dontShowGuide" />
            Não mostrar novamente
          </label>
          <button class="btn-main-action" style="padding: 10px 28px; font-size: 1rem; width: auto" @click="closeGuide">
            Entendido
          </button>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.ai-guide-modal {
  width: min(620px, 95vw);
  max-height: 88vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.ai-guide-wip-banner {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  background: rgba(255, 180, 60, 0.1);
  border: 1px solid rgba(255, 180, 60, 0.35);
  border-radius: 10px;
  padding: 14px 16px;
  margin-bottom: 22px;
  color: #f0a84a;
}

.ai-guide-wip-banner i {
  font-size: 1.4rem;
  flex-shrink: 0;
  margin-top: 2px;
}

.ai-guide-wip-banner strong {
  display: block;
  font-size: 0.95rem;
  margin-bottom: 4px;
}

.ai-guide-wip-banner p {
  margin: 0;
  font-size: 0.82rem;
  color: rgba(240, 168, 74, 0.85);
  line-height: 1.5;
}

.ai-guide-steps {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.ai-guide-step {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.ai-guide-step-num {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(113, 194, 217, 0.15);
  border: 1px solid rgba(113, 194, 217, 0.4);
  color: var(--accent-cyan);
  font-size: 0.8rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 2px;
}

.ai-guide-step-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-title, #e8f1fa);
  margin: 0 0 5px;
}

.ai-guide-step-desc {
  font-size: 0.82rem;
  color: var(--text-soft);
  line-height: 1.55;
  margin: 0 0 10px;
}

.ai-guide-step-desc code {
  background: rgba(113, 194, 217, 0.12);
  border-radius: 4px;
  padding: 1px 5px;
  font-size: 0.8rem;
  color: var(--accent-cyan);
}

.ai-guide-img {
  width: 100%;
  border-radius: 8px;
  border: 1px solid rgba(130, 185, 230, 0.2);
  margin-top: 4px;
}

.ai-guide-download-btn {
  display: inline-flex;
  align-items: center;
  padding: 8px 18px;
  font-size: 0.85rem;
  width: auto;
  text-decoration: none;
  margin-top: 4px;
}

.ai-guide-checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: var(--text-soft);
  font-size: 0.85rem;
}

.ai-guide-checkbox-label input {
  width: 14px;
  height: 14px;
  cursor: pointer;
}
</style>
