import { describe, expect, it } from 'vitest'
import { validarAcao, type Contexto } from './acoes'
import { isoLocal } from './datas'
import { tipoDoDestino } from './destino'

const agora = new Date(2026, 10, 15, 10, 0)
const tarefa = (id: string, titulo: string, feita = false) => ({
  id, titulo, quando: null, repetir: null, feita, feitaEm: null, criadaEm: '', avisada: false,
})
const ctx: Contexto = {
  agora,
  atalhos: [{ id: 'a', nome: 'Monday', destino: 'https://monday.com', tipo: 'site' }],
  pastas: [{ id: 'p', nome: 'zarb-os', caminho: 'C:\\x' }],
  tarefas: [tarefa('1', 'Ligar para a Costare'), tarefa('2', 'Revisar deck'), tarefa('3', 'Revisar planilha'), tarefa('4', 'Pagar boleto', true)],
  habitos: [],
}
const amanha9 = isoLocal(new Date(2026, 10, 16, 9, 0))

it('cria lembrete com horário válido e recusa horário passado', () => {
  const r = validarAcao('criar_lembrete', JSON.stringify({ titulo: 'Ligar', quando: amanha9, repetir: 'semanal' }), ctx)
  expect(r).toEqual({ ok: true, acao: { tipo: 'criar_tarefa', titulo: 'Ligar', quando: amanha9, repetir: 'semanal' } })
  const passado = validarAcao('criar_lembrete', JSON.stringify({ titulo: 'x', quando: isoLocal(new Date(2026, 10, 14, 9)) }), ctx)
  expect(passado.ok).toBe(false)
})

it('conclui só quando acha uma tarefa pendente', () => {
  expect(validarAcao('concluir_tarefa', '{"titulo":"costare"}', ctx)).toMatchObject({ ok: true, acao: { tarefa: { id: '1' } } })
  expect(validarAcao('concluir_tarefa', '{"titulo":"revisar"}', ctx).ok).toBe(false)
  expect(validarAcao('concluir_tarefa', '{"titulo":"boleto"}', ctx).ok).toBe(false)
})

it('evento confere duração e e-mails e liga o Meet para reunião', () => {
  const r = validarAcao(
    'criar_evento',
    JSON.stringify({ titulo: 'Reunião Costare', inicio: amanha9, duracao_min: 99999, convidados: ['a@b.com', 'lixo'] }),
    ctx,
  )
  expect(r).toEqual({
    ok: true,
    acao: { tipo: 'evento', rascunho: { titulo: 'Reunião Costare', inicio: amanha9, duracaoMin: 30, convidados: ['a@b.com'], comMeet: true } },
  })
})

it('Claude Code escolhe a pasta pelo nome ou a única', () => {
  expect(validarAcao('pedir_claude_code', '{"pedido":"olhar erro"}', ctx)).toMatchObject({ acao: { pastaId: 'p' } })
})

it('recusa ferramenta desconhecida, JSON quebrado e atalho com comando', () => {
  expect(validarAcao('rodar_comando', '{}', ctx).ok).toBe(false)
  expect(validarAcao('criar_tarefa', '{quebrado', ctx).ok).toBe(false)
  expect(validarAcao('ensinar_atalho', '{"nome":"x","destino":"cmd /c del *"}', ctx).ok).toBe(false)
  expect(validarAcao('abrir_atalho', '{"nome":"drive"}', ctx).ok).toBe(false)
})

it('destino aceita só https e caminho do Windows', () => {
  expect(tipoDoDestino('https://os.zarbmedia.com.br/sinais')).toBe('site')
  expect(tipoDoDestino('http://x.com')).toBeNull()
  expect(tipoDoDestino('javascript:alert(1)')).toBeNull()
  expect(tipoDoDestino('C:\\Users\\Paulo\\Desktop')).toBe('pasta')
  expect(tipoDoDestino('C:\\Program Files\\App\\app.exe')).toBe('programa')
  expect(tipoDoDestino('C:\\x" & calc')).toBeNull()
})

describe('ferramentas novas', () => {
  const agua = { id: 'a', nome: 'Beber 2 litros de água', dias: [0, 1, 2, 3, 4, 5, 6], meta: { total: 2, unidade: 'L', passo: 0.25 }, lembrete: null, registro: {}, criadoEm: '' }
  const c2 = { ...ctx, habitos: [agua] }
  it('registra hábito com a quantidade ou o passo padrão', () => {
    expect(validarAcao('registrar_habito', '{"habito":"água","quantidade":0.5}', c2)).toMatchObject({ ok: true, acao: { quantidade: 0.5 } })
    expect(validarAcao('registrar_habito', '{"habito":"água"}', c2)).toMatchObject({ ok: true, acao: { quantidade: 0.25 } })
    expect(validarAcao('registrar_habito', '{"habito":"yoga"}', c2).ok).toBe(false)
  })
  it('volume limitado de 0 a 100 e ação de PC só da lista', () => {
    expect(validarAcao('volume', '{"nivel":250}', c2)).toMatchObject({ acao: { mudanca: { nivel: 100 } } })
    expect(validarAcao('volume', '{}', c2).ok).toBe(false)
    expect(validarAcao('acao_pc', '{"acao":"desligar"}', c2)).toMatchObject({ acao: { tipo: 'pc', acao: 'desligar' } })
    expect(validarAcao('acao_pc', '{"acao":"formatar"}', c2).ok).toBe(false)
  })
})

it('corpo: só números plausíveis', () => {
  expect(validarAcao('registrar_corpo', '{"peso":73.24,"treino":true}', ctx)).toEqual({ ok: true, acao: { tipo: 'corpo', medidas: { peso: 73.2, treino: true } } })
  expect(validarAcao('registrar_corpo', '{"peso":7}', ctx).ok).toBe(false)
  expect(validarAcao('registrar_refeicao', '{"itens":[]}', ctx).ok).toBe(false)
})
