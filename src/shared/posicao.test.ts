import { expect, it } from 'vitest'
import { posicaoNoTopo } from './posicao'

it('centraliza no topo da área útil, inclusive no segundo monitor', () => {
  expect(posicaoNoTopo({ x: 0, y: 0, width: 1920, height: 1040 }, 680)).toEqual({ x: 620, y: 12 })
  expect(posicaoNoTopo({ x: 1920, y: 40, width: 1280, height: 984 }, 680)).toEqual({ x: 2220, y: 52 })
})
