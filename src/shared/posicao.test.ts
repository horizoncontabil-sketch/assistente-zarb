import { expect, it } from 'vitest'
import { bordaMaisProxima, posicionarJanela } from './posicao'

const tela = { x: 0, y: 0, width: 1920, height: 1040 }

it('gruda na borda mais próxima e guarda onde', () => {
  expect(bordaMaisProxima({ x: 960, y: 10 }, tela)).toEqual({ borda: 'topo', fracao: 0.5 })
  expect(bordaMaisProxima({ x: 1900, y: 520 }, tela)).toEqual({ borda: 'direita', fracao: 0.5 })
  expect(bordaMaisProxima({ x: 30, y: 260 }, tela)).toEqual({ borda: 'esquerda', fracao: 0.25 })
  expect(bordaMaisProxima({ x: 480, y: 1030 }, tela)).toEqual({ borda: 'baixo', fracao: 0.25 })
})

it('no topo, ao centro', () => {
  expect(posicionarJanela({ borda: 'topo', fracao: 0.5 }, tela, 960, 660, 310)).toEqual({ x: 480, y: 0, deslocamento: 325 })
})

it('perto da quina, a janela não sai da tela e o entalho vai para o canto dela', () => {
  const r = posicionarJanela({ borda: 'topo', fracao: 0.99 }, tela, 960, 660, 310)
  expect(r.x).toBe(960)
  expect(r.deslocamento).toBe(960 - 310)
})

it('nas laterais e embaixo, inclusive no segundo monitor', () => {
  const m2 = { x: 1920, y: 0, width: 1280, height: 984 }
  expect(posicionarJanela({ borda: 'direita', fracao: 0.5 }, m2, 960, 660, 200)).toEqual({ x: 2240, y: 162, deslocamento: 230 })
  expect(posicionarJanela({ borda: 'baixo', fracao: 0.5 }, tela, 960, 660, 310).y).toBe(380)
  expect(posicionarJanela({ borda: 'esquerda', fracao: 0 }, tela, 960, 660, 200)).toEqual({ x: 0, y: 0, deslocamento: 0 })
})
