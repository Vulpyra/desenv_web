/**
 * Paletas de cores do RendaFácil.
 *
 * Cada paleta é um objeto { id, name, swatch, vars } onde `vars` mapeia TODAS as
 * variáveis do contrato de tema (as mesmas do :root em base.css). Trocar de paleta
 * reaplica todas essas variáveis em <html>, repintando o site inteiro.
 *
 * Para ADICIONAR uma paleta nova: copie um bloco abaixo, troque id/name/swatch e
 * os valores de `vars`. Nada mais precisa mudar — a lista de temas no perfil é
 * gerada a partir deste array.
 *
 * `swatch`: 3 cores [destaque, meio, fundo] usadas só na pré-visualização da lista.
 * `--danger-soft`/`--rgb-danger` ficam num tom rosado em todas as paletas (cor de
 * "valor negativo"), mas você pode trocá-los por paleta se quiser.
 */

const danger = {
  '--danger-soft': '#ff8599',
  '--rgb-danger': '255, 133, 153'
}

export const palettes = [
  {
    id: 'oceano',
    name: 'Oceano',
    swatch: ['#78c8e7', '#355a95', '#10213f'],
    vars: {
      '--rgb-surface': '38, 67, 120',
      '--rgb-surface-deep': '10, 22, 52',
      '--rgb-border': '130, 185, 230',
      '--rgb-border-soft': '184, 212, 245',
      '--rgb-accent': '113, 194, 217',
      '--rgb-brand': '95, 145, 204',
      '--rgb-glow': '116, 166, 223',
      '--bg-deep': '#040b1d',
      '--bg-mid': '#10213f',
      '--bg-end': '#07122f',
      '--text-main': '#d4e0f2',
      '--text-soft': '#97abc7',
      '--text-title': '#f4f9ff',
      '--accent-cyan': '#78c8e7',
      '--accent-sky': '#90afd9',
      '--accent-deep': '#355a95',
      '--chart-a': '#7ea7d9',
      '--chart-b': '#71c2d9',
      '--button-a': '#6b99d1',
      '--button-b': '#7fb9d0',
      ...danger
    }
  },
  {
    id: 'turquesa',
    name: 'Turquesa',
    swatch: ['#5fd3c4', '#2f7d70', '#0b2a26'],
    vars: {
      '--rgb-surface': '24, 80, 72',
      '--rgb-surface-deep': '8, 32, 28',
      '--rgb-border': '95, 200, 185',
      '--rgb-border-soft': '175, 232, 222',
      '--rgb-accent': '95, 211, 196',
      '--rgb-brand': '45, 150, 135',
      '--rgb-glow': '70, 190, 170',
      '--bg-deep': '#04140f',
      '--bg-mid': '#0b2a26',
      '--bg-end': '#06201a',
      '--text-main': '#d2eee8',
      '--text-soft': '#8fbfb5',
      '--text-title': '#f0fffb',
      '--accent-cyan': '#5fd3c4',
      '--accent-sky': '#7fccbe',
      '--accent-deep': '#2f7d70',
      '--chart-a': '#5fd3c4',
      '--chart-b': '#43c0ab',
      '--button-a': '#3fb3a3',
      '--button-b': '#5fd3c4',
      ...danger
    }
  },
  {
    id: 'violeta',
    name: 'Violeta',
    swatch: ['#a99cf2', '#5a4d95', '#201040'],
    vars: {
      '--rgb-surface': '78, 60, 130',
      '--rgb-surface-deep': '24, 16, 48',
      '--rgb-border': '170, 150, 235',
      '--rgb-border-soft': '210, 198, 248',
      '--rgb-accent': '160, 140, 240',
      '--rgb-brand': '120, 100, 200',
      '--rgb-glow': '140, 120, 225',
      '--bg-deep': '#0f0a1d',
      '--bg-mid': '#201040',
      '--bg-end': '#160a30',
      '--text-main': '#e0daf5',
      '--text-soft': '#a89fc0',
      '--text-title': '#f7f4ff',
      '--accent-cyan': '#a99cf2',
      '--accent-sky': '#b0a9e0',
      '--accent-deep': '#5a4d95',
      '--chart-a': '#9a8fe0',
      '--chart-b': '#b58fe6',
      '--button-a': '#8b7fd1',
      '--button-b': '#a79bf0',
      ...danger
    }
  },
  {
    id: 'esmeralda',
    name: 'Esmeralda',
    swatch: ['#6ed79a', '#2f7d50', '#0c2c1a'],
    vars: {
      '--rgb-surface': '40, 95, 60',
      '--rgb-surface-deep': '10, 34, 20',
      '--rgb-border': '120, 205, 150',
      '--rgb-border-soft': '190, 235, 205',
      '--rgb-accent': '110, 215, 150',
      '--rgb-brand': '60, 160, 100',
      '--rgb-glow': '90, 200, 130',
      '--bg-deep': '#06170d',
      '--bg-mid': '#0c2c1a',
      '--bg-end': '#072012',
      '--text-main': '#d6efdd',
      '--text-soft': '#93bfa0',
      '--text-title': '#f2fff6',
      '--accent-cyan': '#6ed79a',
      '--accent-sky': '#8fd4a8',
      '--accent-deep': '#2f7d50',
      '--chart-a': '#6ed79a',
      '--chart-b': '#4fc888',
      '--button-a': '#3fb36f',
      '--button-b': '#6ed79a',
      ...danger
    }
  },
  {
    id: 'por-do-sol',
    name: 'Pôr do Sol',
    swatch: ['#f0a35f', '#955a2f', '#3a1e12'],
    vars: {
      '--rgb-surface': '120, 75, 45',
      '--rgb-surface-deep': '48, 26, 14',
      '--rgb-border': '230, 175, 120',
      '--rgb-border-soft': '248, 220, 190',
      '--rgb-accent': '240, 160, 95',
      '--rgb-brand': '200, 120, 70',
      '--rgb-glow': '225, 150, 95',
      '--bg-deep': '#1d0f08',
      '--bg-mid': '#3a1e12',
      '--bg-end': '#2a1409',
      '--text-main': '#f2e2d4',
      '--text-soft': '#c0a893',
      '--text-title': '#fff8f0',
      '--accent-cyan': '#f0a35f',
      '--accent-sky': '#e0b48f',
      '--accent-deep': '#955a2f',
      '--chart-a': '#f0a35f',
      '--chart-b': '#e6805f',
      '--button-a': '#d68a4a',
      '--button-b': '#f0a35f',
      ...danger
    }
  },
  {
    id: 'programador',
    name: 'Programador',
    swatch: ['#3ae080', '#0d8050', '#04120b'],
    vars: {
      '--rgb-surface': '20, 55, 38',
      '--rgb-surface-deep': '10, 26, 18',
      '--rgb-border': '40, 130, 85',
      '--rgb-border-soft': '70, 175, 110',
      '--rgb-accent': '58, 224, 128',
      '--rgb-brand': '22, 150, 90',
      '--rgb-glow': '40, 190, 110',
      '--bg-deep': '#020805',
      '--bg-mid': '#05140c',
      '--bg-end': '#010604',
      '--text-main': '#c8ecd6',
      '--text-soft': '#7ba98c',
      '--text-title': '#eafff4',
      '--accent-cyan': '#3ae080',
      '--accent-sky': '#5fbf90',
      '--accent-deep': '#0d8050',
      '--chart-a': '#3ae080',
      '--chart-b': '#1f9d5c',
      '--button-a': '#1aa860',
      '--button-b': '#3ae07f',
      ...danger
    }
  }
]

export const DEFAULT_PALETTE_ID = 'oceano'
