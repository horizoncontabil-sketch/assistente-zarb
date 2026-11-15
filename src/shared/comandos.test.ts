import { expect, it } from 'vitest'
import { comandoDireto } from './comandos'
import type { Atalho } from './tipos'

const atalhos: Atalho[] = [
  { id: '1', nome: 'Health Score', destino: 'https://os.zarbmedia.com.br/health-score', tipo: 'site' },
  { id: '2', nome: 'Monday', destino: 'https://monday.com', tipo: 'site' },
  { id: '3', nome: 'Zarb OS', destino: 'https://os.zarbmedia.com.br', tipo: 'site' },
  { id: '4', nome: 'Gerenciador de anúncios', destino: 'https://adsmanager.facebook.com', tipo: 'site' },
]

it('abre atalho pelo nome, com acento, artigo e pontuação', () => {
  expect(comandoDireto('Abre o Health Score', atalhos)).toMatchObject({ tipo: 'abrir', atalho: { id: '1' } })
  expect(comandoDireto('abre o monday.', atalhos)).toMatchObject({ tipo: 'abrir', atalho: { id: '2' } })
  expect(comandoDireto('abrir gerenciador de anuncios', atalhos)).toMatchObject({ atalho: { id: '4' } })
  expect(comandoDireto('Ei Zarb, abre o Zarb OS', atalhos)).toMatchObject({ atalho: { id: '3' } })
})

it('nome desconhecido ou ambíguo vai para a IA', () => {
  expect(comandoDireto('abre o drive', atalhos)).toBeNull()
  expect(comandoDireto('abre zarb', [...atalhos, { id: '5', nome: 'Zarb Drive', destino: 'x', tipo: 'pasta' }])).toBeNull()
})

it('reconhece o resumo do dia e as abas', () => {
  expect(comandoDireto('O que eu tenho hoje?', atalhos)).toEqual({ tipo: 'hoje' })
  expect(comandoDireto('tenho tarefa pendente?', atalhos)).toEqual({ tipo: 'aba', aba: 'tarefas' })
  expect(comandoDireto('o que copiei', atalhos)).toEqual({ tipo: 'aba', aba: 'copiados' })
})

it('pedido com mais coisa vai para a IA', () => {
  expect(comandoDireto('me lembra às 15h de ligar pro cliente', atalhos)).toBeNull()
  expect(comandoDireto('o que tenho hoje depois das 15h', atalhos)).toBeNull()
})
