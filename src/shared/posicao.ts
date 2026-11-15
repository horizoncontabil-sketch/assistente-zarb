// Onde o entalho fica: numa das quatro bordas, em qualquer ponto dela (fração de 0 a 1).
export type Borda = 'topo' | 'baixo' | 'esquerda' | 'direita'
export type Area = { x: number; y: number; width: number; height: number }
export type Posicao = { borda: Borda; fracao: number }

export const POSICAO_PADRAO: Posicao = { borda: 'topo', fracao: 0.5 }

export const horizontal = (b: Borda) => b === 'topo' || b === 'baixo'

const limitar = (v: number, min: number, max: number) => Math.min(Math.max(v, min), Math.max(min, max))

// Ao soltar o arraste: a borda mais perto do ponteiro e onde ele está ao longo dela.
export function bordaMaisProxima(p: { x: number; y: number }, area: Area): Posicao {
  const d: [Borda, number][] = [
    ['topo', p.y - area.y],
    ['baixo', area.y + area.height - p.y],
    ['esquerda', p.x - area.x],
    ['direita', area.x + area.width - p.x],
  ]
  const borda = d.sort((a, b) => a[1] - b[1])[0][0]
  const fracao = horizontal(borda) ? (p.x - area.x) / area.width : (p.y - area.y) / area.height
  return { borda, fracao: limitar(fracao, 0, 1) }
}

// Onde pôr a janela (transparente, W x H) e a que distância da quina dela fica o entalho,
// que mede "comprimento" ao longo da borda. Nunca sai da tela.
export function posicionarJanela(pos: Posicao, area: Area, W: number, H: number, comprimento: number) {
  const hz = horizontal(pos.borda)
  const inicio = hz ? area.x : area.y
  const tamanho = hz ? area.width : area.height
  const centro = limitar(inicio + pos.fracao * tamanho, inicio + comprimento / 2, inicio + tamanho - comprimento / 2)
  if (hz) {
    const x = Math.round(limitar(centro - W / 2, area.x, area.x + area.width - W))
    const y = pos.borda === 'topo' ? area.y : area.y + area.height - H
    return { x, y, deslocamento: Math.round(centro - comprimento / 2 - x) }
  }
  const y = Math.round(limitar(centro - H / 2, area.y, area.y + area.height - H))
  const x = pos.borda === 'esquerda' ? area.x : area.x + area.width - W
  return { x, y, deslocamento: Math.round(centro - comprimento / 2 - y) }
}

export function posicaoValida(v: unknown): Posicao | null {
  const p = v as Posicao
  if (!p || !['topo', 'baixo', 'esquerda', 'direita'].includes(p.borda) || typeof p.fracao !== 'number' || Number.isNaN(p.fracao)) return null
  return { borda: p.borda, fracao: limitar(p.fracao, 0, 1) }
}
