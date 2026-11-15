import { expect, it } from 'vitest'
import { corpoDoPedido, erroDaGroq, instrucao, LIMITE_HISTORICO, lerResposta, textoTranscrito } from './groq'
import type { Mensagem } from './tipos'

it('instrução leva a data de agora, atalhos e pastas', () => {
  const s = instrucao(new Date(2026, 10, 15, 10, 0), ['Monday'], ['zarb-os'])
  expect(s).toContain('domingo, 2026-11-15T10:00:00')
  expect(s).toContain('Monday')
  expect(s).toContain('zarb-os')
})

it('monta o pedido com ferramentas e só as últimas mensagens', () => {
  const muitas: Mensagem[] = Array.from({ length: 30 }, (_, i) => ({ papel: 'eu', texto: String(i) }))
  const c = corpoDoPedido('m', 'sis', muitas, 'agora')
  expect(c.messages).toHaveLength(LIMITE_HISTORICO + 2)
  expect(c.messages.at(-1)).toEqual({ role: 'user', content: 'agora' })
  expect(c.tools.map((t) => t.function.name)).toContain('criar_lembrete')
})

it('lê texto e chamadas de ferramenta', () => {
  const r = lerResposta({
    choices: [{ message: { content: null, tool_calls: [{ function: { name: 'criar_tarefa', arguments: '{"titulo":"x"}' } }, { function: {} }] } }],
  })
  expect(r).toEqual({ texto: null, chamadas: [{ nome: 'criar_tarefa', args: '{"titulo":"x"}' }] })
  expect(lerResposta({ choices: [{ message: { content: ' oi ' } }] })).toEqual({ texto: 'oi', chamadas: [] })
  expect(lerResposta(null)).toEqual({ texto: null, chamadas: [] })
})

it('lê a transcrição e traduz erros', () => {
  expect(textoTranscrito({ text: ' me lembra ' })).toBe('me lembra')
  expect(textoTranscrito({ text: '' })).toBeNull()
  expect(erroDaGroq(401)).toMatch(/chave/)
  expect(erroDaGroq(429)).toMatch(/Limite/)
})
