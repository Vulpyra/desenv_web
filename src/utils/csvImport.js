/**
 * Importação de faturas de cartão em CSV.
 *
 * Funções puras (sem Vue/DOM) para facilitar teste e permitir carregamento sob
 * demanda — nada disso roda até o usuário abrir o importador.
 *
 * As colunas são detectadas por NOME (com apelidos e sem acento), nunca por
 * posição, para que CSVs de bancos diferentes funcionem. Ex.: "Lançamento",
 * "Descrição", "name" e "nome" são todos aceitos como o nome da despesa.
 */

// ---------------------------------------------------------------- normalização

const stripAccents = (s) =>
  String(s).normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Cabeçalho normalizado: sem acento, minúsculo, sem pontuação, espaços colapsados */
export const normalizeHeader = (h) =>
  stripAccents(h)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** Nome normalizado para comparação/deduplicação (bancos preenchem com espaços) */
export const normalizeName = (s) =>
  stripAccents(s).toLowerCase().replace(/\s+/g, ' ').trim()

// ------------------------------------------------------------------- apelidos

// Apelidos por campo. A detecção tenta correspondência exata e depois "contém",
// sempre do apelido mais específico para o mais genérico.
export const COLUMN_ALIASES = {
  date: [
    'data', 'date', 'dia', 'data da compra', 'data compra', 'data de compra',
    'data do lancamento', 'data de lancamento', 'data lancamento', 'data da transacao',
    'data transacao', 'transaction date', 'posted date', 'dt', 'competencia'
  ],
  name: [
    'lancamento', 'lancamentos', 'nome', 'name', 'descricao', 'description',
    'historico', 'estabelecimento', 'titulo', 'title', 'memo', 'detalhe', 'detalhes',
    'referencia', 'merchant', 'item', 'transacao', 'movimentacao'
  ],
  category: [
    'categoria', 'category', 'tipo de gasto', 'classificacao', 'grupo', 'segmento'
  ],
  // "Tipo" no Inter traz "Compra à vista" ou "Parcela 1/4"
  type: [
    'tipo', 'type', 'tipo de transacao', 'modalidade', 'parcela', 'parcelas',
    'installment', 'forma de pagamento'
  ],
  amount: [
    'valor', 'value', 'amount', 'montante', 'preco', 'quantia', 'total',
    'debito', 'credito', 'vlr', 'valor da compra', 'valor r', 'valor brl'
  ]
}

/**
 * Mapeia cabeçalhos do arquivo -> campos internos.
 * @returns {{ map: Object, missing: string[] }} map = { date: idx, name: idx, ... }
 */
export const detectColumns = (headers) => {
  const norm = headers.map(normalizeHeader)
  const map = {}
  const taken = new Set()

  // 1ª passada: correspondência exata
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (let i = 0; i < norm.length; i++) {
      if (taken.has(i) || map[field] !== undefined) continue
      if (aliases.includes(norm[i])) { map[field] = i; taken.add(i) }
    }
  }

  // 2ª passada: "contém", apelidos mais longos (mais específicos) primeiro
  const pairs = []
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (const a of aliases) pairs.push({ field, alias: a })
  }
  pairs.sort((x, y) => y.alias.length - x.alias.length)

  for (const { field, alias } of pairs) {
    if (map[field] !== undefined) continue
    for (let i = 0; i < norm.length; i++) {
      if (taken.has(i)) continue
      if (norm[i].includes(alias)) { map[field] = i; taken.add(i); break }
    }
  }

  const missing = ['date', 'name', 'amount'].filter((f) => map[f] === undefined)
  return { map, missing }
}

// -------------------------------------------------------- assinaturas (aliases)

/**
 * Serviços cobrados por mensalidade. Bancos lançam assinaturas como "compra à
 * vista", então usamos estes apelidos para reconhecê-las na importação e mandá-las
 * para a seção de Assinaturas (recorrentes e canceláveis) em vez de compras únicas.
 *
 * Para ADICIONAR um serviço, basta incluir o texto (sem acento, minúsculo) aqui.
 */
export const SUBSCRIPTION_ALIASES = [
  // streaming / vídeo
  'netflix', 'youtube', 'yt premium', 'disney', 'hbo', 'hbomax', 'max ', 'globoplay',
  'prime video', 'amazon prime', 'paramount', 'star plus', 'starplus', 'telecine',
  'crunchyroll', 'mubi', 'looke', 'apple tv', 'twitch',
  // música / áudio
  'spotify', 'deezer', 'apple music', 'tidal', 'audible', 'kindle unlimited', 'storytel',
  // nuvem / software
  'icloud', 'google one', 'google storage', 'dropbox', 'onedrive', 'adobe',
  'microsoft 365', 'office 365', 'canva', 'notion', 'figma', 'evernote',
  'chatgpt', 'openai', 'anthropic', 'claude', 'github', 'jetbrains', 'zoom',
  '1password', 'lastpass', 'nordvpn', 'expressvpn', 'surfshark',
  // jogos
  'playstation plus', 'ps plus', 'xbox game pass', 'game pass', 'nintendo switch online',
  'ea play', 'ubisoft plus',
  // outros recorrentes
  'gympass', 'totalpass', 'smart fit', 'smartfit', 'duolingo', 'linkedin premium',
  'uber one', 'ifood clube', 'rappi prime', 'tinder', 'patreon', 'medium',
  // palavras genéricas
  'assinatura', 'subscription', 'mensalidade', 'plano mensal', 'recorrente'
]

/** Diz se a descrição parece uma assinatura mensal. */
export const looksLikeSubscription = (name) => {
  const n = normalizeName(name)
  return SUBSCRIPTION_ALIASES.some((alias) => n.includes(alias.trim()))
}

// -------------------------------------------------------------------- parsing

/** Detecta o separador dominante fora de aspas (vírgula, ponto e vírgula ou tab) */
export const detectDelimiter = (text) => {
  const sample = text.slice(0, 5000)
  const counts = { ',': 0, ';': 0, '\t': 0 }
  let inQuotes = false
  for (const ch of sample) {
    if (ch === '"') inQuotes = !inQuotes
    else if (!inQuotes && ch in counts) counts[ch]++
  }
  return Object.keys(counts).reduce((a, b) => (counts[b] > counts[a] ? b : a), ',')
}

/** CSV -> matriz de strings. Suporta aspas, aspas escapadas ("") e CRLF. */
export const parseCSV = (text, delimiter) => {
  const src = String(text).replace(/^﻿/, '') // remove BOM
  const delim = delimiter || detectDelimiter(src)
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else field += ch
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === delim) {
      row.push(field); field = ''
    } else if (ch === '\n') {
      row.push(field); field = ''
      rows.push(row); row = []
    } else if (ch !== '\r') {
      field += ch
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }

  return rows.filter((r) => r.some((c) => String(c).trim() !== ''))
}

/**
 * Valor monetário -> número. Aceita "R$ 21,96", "1.234,56", "1,234.56",
 * "-21.96", "(21,96)" (negativo) e "21".
 */
export const parseAmount = (raw) => {
  if (raw == null) return NaN
  let s = String(raw).trim()
  if (!s) return NaN
  const negative = /^\(.*\)$/.test(s) || s.includes('-')
  s = s.replace(/[^\d.,]/g, '')
  if (!s) return NaN

  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')

  if (lastComma !== -1 && lastDot !== -1) {
    // O separador decimal é o que aparece por último
    if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.')
    else s = s.replace(/,/g, '')
  } else if (lastComma !== -1) {
    // Vírgula é decimal se sobrarem 1-2 dígitos depois dela; senão é milhar
    s = s.length - lastComma - 1 <= 2 ? s.replace(',', '.') : s.replace(/,/g, '')
  } else if (lastDot !== -1) {
    const decimals = s.length - lastDot - 1
    if (decimals === 3 && /^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '')
  }

  const n = Number(s)
  if (isNaN(n)) return NaN
  return negative ? -Math.abs(n) : n
}

/** Data -> 'YYYY-MM-DD'. Aceita DD/MM/YYYY, YYYY-MM-DD, DD-MM-YY, DD.MM.YYYY. */
export const parseDateISO = (raw) => {
  if (!raw) return null
  const s = String(raw).trim().slice(0, 10)

  const iso = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/)
  if (iso) {
    const [, y, m, d] = iso
    return `${y}-${String(+m).padStart(2, '0')}-${String(+d).padStart(2, '0')}`
  }

  const parts = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/)
  if (!parts) return null
  let [, a, b, y] = parts
  a = +a; b = +b; y = +y
  if (y < 100) y += 2000

  // a>12 => dia primeiro; b>12 => mês primeiro (EUA); empate => dia primeiro (pt-BR)
  let day = a, month = b
  if (a <= 12 && b > 12) { day = b; month = a }
  if (month < 1 || month > 12 || day < 1 || day > 31) return null

  return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Extrai "Parcela 1/4" -> { atual: 1, total: 4 }; senão null. */
export const parseInstallment = (...candidates) => {
  for (const raw of candidates) {
    if (!raw) continue
    const m = String(raw).match(/(\d{1,3})\s*\/\s*(\d{1,3})/)
    if (!m) continue
    const atual = +m[1]
    const total = +m[2]
    if (total > 1 && total <= 120 && atual >= 1 && atual <= total) {
      return { atual, total }
    }
  }
  return null
}

// ------------------------------------------------------------------ resultado

/**
 * Converte o texto de um CSV em lançamentos da fatura.
 *
 * @returns {{
 *   entries: Array<{date,name,category,amount,kind,parcelaAtual,parcelaTotal}>,
 *   mapping: Object, missing: string[], skipped: Array<{line,reason,raw}>, total: number
 * }}
 */
export const parseInvoiceCSV = (text) => {
  const rows = parseCSV(text)
  if (!rows.length) {
    return { entries: [], mapping: {}, missing: ['date', 'name', 'amount'], skipped: [], total: 0 }
  }

  const headers = rows[0].map((h) => String(h).trim())
  const { map, missing } = detectColumns(headers)
  const mapping = {}
  for (const [field, i] of Object.entries(map)) mapping[field] = headers[i]

  if (missing.length) return { entries: [], mapping, missing, skipped: [], total: 0 }

  const entries = []
  const skipped = []

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r]
    const get = (field) => (map[field] !== undefined ? (cells[map[field]] ?? '').trim() : '')

    const rawName = get('name')
    const name = rawName.replace(/\s+/g, ' ').trim()
    const date = parseDateISO(get('date'))
    const amount = parseAmount(get('amount'))

    if (!name && !date && isNaN(amount)) continue // linha vazia/rodapé
    if (!date) { skipped.push({ line: r + 1, reason: 'data inválida', raw: get('date') }); continue }
    if (!name) { skipped.push({ line: r + 1, reason: 'sem descrição', raw: rawName }); continue }
    if (isNaN(amount)) { skipped.push({ line: r + 1, reason: 'valor inválido', raw: get('amount') }); continue }
    // Créditos/pagamentos da fatura não são despesas
    if (amount <= 0) { skipped.push({ line: r + 1, reason: 'valor não positivo (crédito/pagamento)', raw: get('amount') }); continue }

    const parcela = parseInstallment(get('type'), name)
    // Parcelamento tem prioridade; senão, serviços conhecidos viram assinatura
    const kind = parcela
      ? 'installment'
      : (looksLikeSubscription(name) ? 'subscription' : 'onetime')

    entries.push({
      date,
      name,
      category: get('category') || null,
      amount,
      kind,
      parcelaAtual: parcela ? parcela.atual : null,
      parcelaTotal: parcela ? parcela.total : null
    })
  }

  return { entries, mapping, missing: [], skipped, total: rows.length - 1 }
}

/**
 * Chave de deduplicação, baseada na data da COMPRA original (não no ciclo), para
 * que mudar o ciclo de faturamento do cartão não gere duplicatas depois.
 *  - Compra única: nome + valor + data.
 *  - Parcela: nome + valor + total + data da 1ª parcela (assim "Parcela 1/4" de
 *    julho e "Parcela 2/4" de agosto — o mesmo parcelamento — têm a mesma chave).
 *
 * @param purchaseDate data da compra original (ISO). Se omitida, usa entry.date.
 */
export const makeFingerprint = (entry, purchaseDate) => {
  const n = normalizeName(entry.name)
  const v = Number(entry.amount).toFixed(2)
  const d = purchaseDate || entry.date
  if (entry.kind === 'installment') {
    return `p|${n}|${v}|${entry.parcelaTotal}|${d}`
  }
  return `u|${n}|${v}|${d}`
}
