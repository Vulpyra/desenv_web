# Renda Fácil

> Projeto desenvolvido para a disciplina de Desenvolvimento Web do 5º Semestre do curso de Engenharia de Computação.

---

## Prefácio do Projeto e Finalidade

O **Renda Fácil** é uma aplicação web full-stack projetada para, além de auxiliar usuários no gerenciamento de suas finanças pessoais, sugerir através de Inteligência Artificial maneiras de otimizar declaração de imposto de renda e identificar oportunidades de elisão fiscal dentro dos limites legais. A ferramenta permite acompanhar patrimônio, renda mensal, despesas e metas financeiras de forma visual e intuitiva.

A finalidade principal é democratizar o acesso à consultoria tributária, simplificando a complexidade do sistema fiscal brasileiro através de uma interface moderna com consultoria estratégica baseada em IA, entregando informações vitais de forma imediata e intuitiva.

---

## Funcionalidades

### Dashboard Principal (`index.html`)

- **Visão Geral Financeira**: Cards exibindo Patrimônio, Renda Mensal, Despesas Mensais e Limite de Isenção de Imposto de Renda
- **Gráfico de Renda**: Visualização em doughnut chart mostrando proporção entre renda dedutível e não dedutível
- **Gestão de Receitas e Despesas Fixas**: CRUD completo para cadastro de receitas e despesas recorrentes
- **Evolução Patrimonial**: Gráfico de linha para acompanhar o crescimento do patrimônio ao longo dos meses
- **Metas Financeiras**: Sistema de cadastro e acompanhamento de metas com barras de progresso
- **Histórico de Transações**: Lista de transações recentes com data, descrição e valor
- **Ocultar/Exibir Valores**: Botão para alternar visibilidade dos valores financeiros na tela
- **Consultoria com IA**: Painel com sugestões proativas da IA que validam limites legais e indicam oportunidades de elisão fiscal para o usuário

### Simulado Financeiro (`src/pages/simulado/`)

- **Cadastro do Contribuinte**: Formulário para entrada de dados pessoais para simulação de IR
- **Cálculo de Imposto**: Simulação de imposto de renda baseado na renda declarada

---

## Como Utilizar

### Dashboard Principal

1. Ao abrir a aplicação, você verá o dashboard com os cards principais
2. Clique no ícone de **lápis** no card "Patrimônio" para definir seu patrimônio inicial
3. Use o botão **+** no card "Renda Mensal" para adicionar novas fontes de renda
4. Adicione despesas fixas através do botão **+** no card "Despesas Mensais"
5. Na seção "Receitas e Despesas Fixas", gerencie itens recorrentes
6. Na seção "Evolução Patrimonial", adicione meses para visualizar seu progresso
7. Cadastre metas na seção "Metas Financeiras" para acompanhar objetivos
8. Todas as transações aparecerão automaticamente no histórico
9. Use o ícone de **olho** no topo para ocultar/exibir valores sensíveis
10. Clique em **"Novo Simulado"** para acessar a página de simulação de IR

### Simulado Financeiro

1. Clique em "Novo Simulado" no dashboard
2. Preencha os dados pessoais no formulário
3. Informe as deduções e dependentes
4. Visualize o resultado da simulação de imposto

---

## Dependências, Ferramentas e Metodologia

### Tecnologias Utilizadas - Frontend

| Categoria | Tecnologia | Versão |
|-----------|------------|--------|
| Linguagem | HTML5 | - |
| Estilização | CSS3 (Glassmorphism) | - |
| Lógica | JavaScript (Vanilla) / Vue.js | ES6+ |
| Build Tool | Vite | - |
| Fontes | Google Fonts (Plus Jakarta Sans) | - |
| Ícones | Font Awesome | 6.0.0 |
| Gráficos | Chart.js | (via CDN) |

### Tecnologias Utilizadas - Backend e IA

| Categoria | Tecnologia | Finalidade |
|-----------|------------|------------|
| Linguagem | Python 3.x | API REST |
| Banco de Dados Vetorial | ChromaDB | Armazenamento de embeddings e RAG |
| Modelo de IA | Ollama (SLM) | Processamento de linguagem natural |
| Embeddings | Sentence Transformer | Vetorização de textos |
| Banco de Dados | Supabase | Autenticação e dados dos usuários |
| Deploy | Vercel | Hospedagem e CI/CD |

### Arquitetura da API (RAG Pipeline)

A API implementa um sistema **RAG (Resource Augmented Generation)** com as seguintes etapas:

1. **Ingestão de Dados**: Recebe dados do usuário, conteúdo didático e regras de negócio
2. **Vetorização**: O ChromaDB quebra textos em tokens e armazena como vetores no SQLite3
3. **Consulta**: Recebe perguntas do usuário e gera lista de queries
4. **Busca Semântica**: Sentence Transformer compara similaridade entre palavras da pergunta e conteúdo vetorizado
5. **Resposta**: Ollama resolve a pergunta utilizando apenas as fontes encontradas no banco

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│   Usuário   │---->│   Dados     │---->│  ChromaDB    │
│  (Pergunta) │     │  (Contexto) │     │ (Vetorização)│
└─────────────┘     └─────────────┘     └──────┬───────┘
                                               │
                                               v
                                        ┌─────────────┐
                                        │   Ollama    │
                                        │   (IA/LLM)  │
                                        │   Resposta  │
                                        └─────────────┘
```

### Metodologia

- **Arquitetura**: Aplicação full-stack com frontend SPA e backend Python
- **Design System**: Glassmorphism com temas de cores definidos em `colors.css`
- **Padrão de Projeto**: Foco na Clareza Cognitiva - interface simplificada que entrega 75% das informações vitais de forma imediata
- **Gestão Ágil**: Metodologia Kanban com organização de tarefas no Trello
- **Organização CSS**: Separação de responsabilidades:
  - `colors.css`: Variáveis de cores e tema
  - `global.css`: Estilos globais, componentes e utilitários
  - `index.css`: Estilos específicos da página principal
  - `simulado.css`: Estilos específicos da página de simulação

### Estrutura de Pastas

```
desenv_web/
├── index.html              # Página principal (Dashboard)
├── index.js                # Lógica do dashboard
├── index.css               # Estilos do dashboard
├── colors.css              # Variáveis de cores
├── global.css              # Estilos globais
├── favicon.svg             # Logo/Ícone
├── README.md               # Documentação
├── api/                    # Backend Python (opcional)
│   ├── main.py             # API FastAPI/Flask
│   ├── chroma_db/          # Banco vetorial ChromaDB
│   └── requirements.txt    # Dependências Python
├── images/
│   └── icons/              # Ícones SVG
└── src/
    └── pages/
        └── simulado/
            ├── simulado.html    # Página de simulação
            ├── simulado.js      # Lógica da simulação
            └── simulado.css     # Estilos da simulação
```

---

## Como Instalar e Rodar Localmente

### Pré-requisitos

- Navegador web moderno (Chrome, Firefox, Edge, Safari)
- [Opcional] Extensão Live Server para VS Code ou qualquer servidor HTTP local

### Instalação

1. Clone ou baixe o repositório:
   ```bash
   git clone <url-do-repositorio>
   cd desenv_web
   ```

2. Para o frontend, não há dependências npm (projeto usa CDN). Para o backend Python (se aplicável):
   ```bash
   cd api
   pip install -r requirements.txt
   ```

### Executar Localmente

#### Opção 1: Abrir diretamente no navegador

Simplesmente abra o arquivo `index.html` no seu navegador:
```bash
# Windows
start index.html

# macOS
open index.html

# Linux
xdg-open index.html
```

#### Opção 2: Usando Live Server (Recomendado)

Se estiver usando VS Code:
1. Instale a extensão "Live Server"
2. Clique com botão direito em `index.html`
3. Selecione "Open with Live Server"

#### Opção 3: Usando Python (servidor HTTP simples)

```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

Depois acesse: `http://localhost:8000`

#### Opção 4: Usando Node.js (npx serve)

```bash
npx serve .
```

Depois acesse a URL indicada no terminal.

---

## Considerações Finais

Este projeto foi desenvolvido para fins acadêmicos e demonstra conceitos de:
- **Frontend**: Estruturação semântica HTML5, CSS3 moderno (flexbox, grid, glassmorphism), JavaScript ES6+
- **Backend**: API Python com RAG (Retrieval Augmented Generation), vetorização com ChromaDB, integração com Ollama
- **IA**: Implementação de SLM (Small Language Model) para consultoria fiscal personalizada
- **DevOps**: Integração contínua com Vercel e gestão ágil com GitHub + Trello

### Problemas que o Renda Fácil Resolve

1. **Complexidade Tributária**: Plataformas oficiais possuem interfaces densas e pouco intuitivas
2. **Ausência de Inteligência**: Sistemas atuais focam apenas no preenchimento de dados, sem oferecer análises preditivas ou orientações estratégicas

Para dúvidas ou sugestões, consulte a documentação do código ou entre em contato com a equipe de desenvolvimento.

