import { useState } from 'react'
import { FERRAMENTAS, validarAcao } from '../../src/shared/acoes'
import { descreverQuando, descreverRepetir, diaDaSemana, isoLocal, mesmoDia } from '../../src/shared/datas'
import { LIMITE_HISTORICO, MODELO_PADRAO, lerResposta } from '../../src/shared/groq'
import { progresso, registrar, type Habito } from '../../src/shared/habitos'
import { concluir, novaTarefa } from '../../src/shared/tarefas'
import type { Mensagem, Tarefa } from '../../src/shared/tipos'
import { diaIso, lerItens, salvarDia, salvarItem, supabase } from './dados'

// Só o que faz sentido no celular; abrir atalho, volume, PC, Claude Code e evento ficam no PC.
const NO_CELULAR = new Set(['criar_lembrete', 'criar_tarefa', 'concluir_tarefa', 'resumo_do_dia', 'registrar_habito', 'registrar_corpo'])

function sistema(agora: Date, habitos: Habito[]) {
  return [
    'Você é o assistente pessoal do Paulo, no celular dele. Ele trabalha como Customer Success na Zarb Media e está numa meta de perder gordura.',
    `Agora é ${diaDaSemana(agora)}, ${isoLocal(agora)} (fuso -03:00).`,
    'Responda em português do Brasil, curto e direto, sem listas longas, sem emojis, sem markdown.',
    'Para criar lembrete ou tarefa, concluir tarefa, marcar hábito ou anotar peso, use SEMPRE as ferramentas; nunca diga que fez sem usar.',
    'Lembrete tem horário; tarefa não. Converta "amanhã às 9", "daqui a 2 horas", "à tarde" (14h), "à noite" (19h) para ISO com o fuso -03:00. Se faltar algo essencial, pergunte em uma frase.',
    `Hábitos: ${habitos.length ? habitos.map((h) => h.nome).join(', ') : 'nenhum'}.`,
    'No celular não dá para abrir atalhos, mexer no PC, criar evento na agenda nem chamar o Claude Code: diga que isso é pelo PC. Comida se registra na aba Comida.',
  ].join('\n')
}

type Linha = Mensagem & { erro?: boolean }

export function Conversa() {
  const [historico, setHistorico] = useState<Linha[]>([])
  const [texto, setTexto] = useState('')
  const [indo, setIndo] = useState(false)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    const pedido = texto.trim().slice(0, 2000)
    if (!pedido || indo) return
    setTexto('')
    setIndo(true)
    const antes = historico.filter((m) => !m.erro)
    setHistorico((h) => [...h, { papel: 'eu', texto: pedido }])
    try {
      const resposta = await responder(pedido, antes)
      setHistorico((h) => [...h, { papel: 'assistente', texto: resposta }])
    } catch (err) {
      setHistorico((h) => [...h, { papel: 'assistente', texto: (err as Error).message || 'Não deu certo. Tente de novo.', erro: true }])
    } finally {
      setIndo(false)
    }
  }

  return (
    <section className="bloco">
      <h2>Assistente</h2>
      {historico.slice(-6).map((m, i) => (
        <div key={i} className={`fala-msg ${m.papel === 'eu' ? 'eu' : ''} ${m.erro ? 'erro' : ''}`}>{m.texto}</div>
      ))}
      {indo && <div className="fala-msg peq cinza">Pensando…</div>}
      <form className="campo" onSubmit={enviar}>
        <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder='"Me lembra às 15h de ligar pro cliente"' aria-label="Falar com o assistente" enterKeyHint="send" />
        <button className="botao pequeno" disabled={!texto.trim() || indo}>Enviar</button>
      </form>
      {!historico.length && <span className="peq cinza">Para falar, use o microfone do teclado.</span>}
    </section>
  )
}

async function responder(pedido: string, historico: Mensagem[]): Promise<string> {
  const agora = new Date()
  const [tarefas, habitos] = await Promise.all([lerItens<Tarefa>('tarefas'), lerItens<Habito>('habitos')])
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Entre de novo no app.')

  const corpo = {
    model: MODELO_PADRAO,
    temperature: 0.3,
    tool_choice: 'auto',
    tools: FERRAMENTAS.filter((f) => NO_CELULAR.has(f.name)).map((f) => ({ type: 'function', function: f })),
    messages: [
      { role: 'system', content: sistema(agora, habitos) },
      ...historico.slice(-LIMITE_HISTORICO).map((m) => ({ role: m.papel === 'eu' ? 'user' : 'assistant', content: m.texto })),
      { role: 'user', content: pedido },
    ],
  }
  const r = await fetch('/api/groq', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'chat', pedido: corpo }) })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(r.status === 429 ? 'Limite do plano grátis da Groq. Tente em alguns minutos.' : (j as { erro?: string }).erro ?? 'A IA não respondeu agora.')
  const { texto, chamadas } = lerResposta(j)

  const feitos: string[] = []
  for (const c of chamadas) {
    if (!NO_CELULAR.has(c.nome)) continue
    const v = validarAcao(c.nome, c.args, { agora, atalhos: [], pastas: [], tarefas, habitos })
    if (!v.ok) {
      feitos.push(v.erro)
      continue
    }
    const a = v.acao
    if (a.tipo === 'criar_tarefa') {
      const quando = a.quando ? isoLocal(new Date(a.quando)) : null
      await salvarItem('tarefas', novaTarefa(crypto.randomUUID(), a.titulo, quando, a.repetir, agora))
      feitos.push(quando ? `Lembrete: ${a.titulo}, ${descreverQuando(quando, agora)}${a.repetir ? `, ${descreverRepetir(a.repetir)}` : ''}.` : `Tarefa anotada: ${a.titulo}.`)
    } else if (a.tipo === 'concluir') {
      await salvarItem('tarefas', concluir(a.tarefa, agora))
      feitos.push(`Feito: ${a.tarefa.titulo}.`)
    } else if (a.tipo === 'habito') {
      const h = registrar(a.habito, agora, a.quantidade)
      await salvarItem('habitos', h)
      feitos.push(`${h.nome}: ${progresso(h, agora).texto}.`)
    } else if (a.tipo === 'corpo') {
      if (a.medidas.peso) {
        await salvarDia({ dia: diaIso(agora), peso: a.medidas.peso })
        feitos.push(`Peso de hoje: ${String(a.medidas.peso).replace('.', ',')} kg.`)
      } else feitos.push('No celular só anoto o peso. Medidas e pressão ficam na aba Corpo do PC.')
    } else if (a.tipo === 'hoje') {
      const hoje = tarefas.filter((t) => !t.feita && t.quando && mesmoDia(new Date(t.quando), agora))
      const soltas = tarefas.filter((t) => !t.feita && !t.quando).length
      feitos.push(
        (hoje.length ? `Hoje: ${hoje.map((t) => `${t.titulo} (${descreverQuando(t.quando!, agora).split(', ')[1]})`).join('; ')}.` : 'Nenhum lembrete para hoje.') +
          (soltas ? ` ${soltas} ${soltas === 1 ? 'tarefa pendente' : 'tarefas pendentes'} sem horário.` : ''),
      )
    }
  }
  return [texto && !feitos.length ? texto : null, ...feitos].filter(Boolean).join(' ') || 'Pronto.'
}
