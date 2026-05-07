# Estrutura de CSS

Esta pasta contém os estilos separados por responsabilidade:

| Arquivo | Linhas | Descrição |
|---------|--------|-----------|
| `base.css` | ~40 | Reset, variáveis CSS e tipografia base |
| `animations.css` | ~30 | Keyframes e animações |
| `background.css` | ~80 | Efeitos visuais de fundo (orbes, partículas) |
| `layout.css` | ~150 | Grids, containers, dashboard-shell, header |
| `components.css` | ~150 | Botões, inputs, cards reutilizáveis |
| `dashboard.css` | ~200 | Específico do dashboard (stats, gráficos, listas) |
| `simulado.css` | ~80 | Específico da página de simulado |
| `modal.css` | ~50 | Estilos do modal |
| `responsive.css` | ~400 | Todos os media queries |
| `index.css` | ~10 | Importa todos os arquivos |

**Total**: ~1200 linhas distribuídas em 9 arquivos (vs 1500+ no arquivo único)

## Como usar

No `main.js` ou entrada do app:
```js
import './assets/styles/index.css'
```

## Regras para manutenção

1. **base.css**: Nunca adicione seletores específicos de componentes
2. **animations.css**: Apenas keyframes, nenhum seletor de classe
3. **layout.css**: Apenas estrutura de página (grids, containers)
4. **components.css**: Elementos reutilizáveis (botões, inputs)
5. **dashboard.css**: Apenas elementos específicos do dashboard
6. **responsive.css**: Todos os media queries devem ficar aqui
