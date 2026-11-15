// Barra centralizada no topo da área útil da tela (sem cobrir a barra de tarefas).
export type Area = { x: number; y: number; width: number; height: number }

export function posicaoNoTopo(area: Area, largura: number, margem = 12) {
  return { x: Math.round(area.x + (area.width - largura) / 2), y: area.y + margem }
}
