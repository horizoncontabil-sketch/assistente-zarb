import { expect, it } from 'vitest'
import { corpoDoPedido, erroDaGroq, LIMITE_HISTORICO, textoDaResposta, type Mensagem } from './groq'

it('monta o pedido com a instrução e os papéis certos', () => {
  const c = corpoDoPedido('m', [{ papel: 'eu', texto: 'oi' }, { papel: 'assistente', texto: 'olá' }])
  expect(c.model).toBe('m')
  expect(c.messages.map((m) => m.role)).toEqual(['system', 'user', 'assistant'])
})

it('manda só as últimas mensagens', () => {
  const muitas: Mensagem[] = Array.from({ length: 30 }, (_, i) => ({ papel: 'eu', texto: String(i) }))
  const c = corpoDoPedido('m', muitas)
  expect(c.messages).toHaveLength(LIMITE_HISTORICO + 1)
  expect(c.messages.at(-1)?.content).toBe('29')
})

it('lê o texto da resposta e recusa resposta vazia ou estranha', () => {
  expect(textoDaResposta({ choices: [{ message: { content: ' oi ' } }] })).toBe('oi')
  expect(textoDaResposta({ choices: [{ message: { content: '  ' } }] })).toBeNull()
  expect(textoDaResposta({})).toBeNull()
  expect(textoDaResposta(null)).toBeNull()
})

it('traduz os erros da Groq', () => {
  expect(erroDaGroq(401)).toMatch(/chave/)
  expect(erroDaGroq(429)).toMatch(/Limite/)
  expect(erroDaGroq(503)).toMatch(/problema/)
  expect(erroDaGroq(418)).toMatch(/418/)
})
