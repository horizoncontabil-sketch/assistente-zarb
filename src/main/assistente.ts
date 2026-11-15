// Recebe o que o Paulo falou ou escreveu e devolve a resposta com os cartões.
import * as acoes from './acoes'
import * as config from './config'
import * as dados from './dados'
import * as google from './google'
import * as groq from './groq'
import { validarAcao } from '../shared/acoes'
import { comandoDireto } from '../shared/comandos'
import { descreverQuando, descreverRepetir } from '../shared/datas'
import { instrucao } from '../shared/groq'
import { concluir } from '../shared/tarefas'
import type { Cartao, Mensagem, Resposta } from '../shared/tipos'

const NOME_ABA = { tarefas: 'Tarefas', agenda: 'Agenda', copiados: 'Copiados', atalhos: 'Atalhos', config: 'Configurações' } as const

export async function conversar(texto: string, historico: Mensagem[]): Promise<Resposta> {
  const pedido = texto.trim().slice(0, 4000)
  if (!pedido) return { texto: '', cartoes: [] }

  const direto = comandoDireto(pedido, dados.ler.atalhos())
  if (direto?.tipo === 'abrir') {
    const r = await acoes.abrirAtalho(direto.atalho)
    return r.ok ? { texto: `Abrindo ${direto.atalho.nome}.`, cartoes: [{ tipo: 'aberto', atalho: direto.atalho }] } : { texto: r.erro, cartoes: [], erro: true }
  }
  if (direto?.tipo === 'hoje') return { texto: 'Seu dia:', cartoes: [{ tipo: 'hoje' }] }
  if (direto?.tipo === 'aba') return { texto: `Abrindo ${NOME_ABA[direto.aba]}.`, cartoes: [], aba: direto.aba }

  const agora = new Date()
  const c = config.ler()
  const r = await groq.perguntar(
    instrucao(agora, dados.ler.atalhos().map((a) => a.nome), c.pastasClaude.map((p) => p.nome)),
    historico,
    pedido,
  )
  if (!r.ok) return { texto: r.erro, cartoes: [], erro: true }

  const cartoes: Cartao[] = []
  const falas: string[] = []
  for (const ch of r.chamadas) {
    const v = validarAcao(ch.nome, ch.args, { agora, atalhos: dados.ler.atalhos(), pastas: c.pastasClaude, tarefas: dados.ler.tarefas() })
    if (!v.ok) {
      falas.push(v.erro)
      continue
    }
    const a = v.acao
    switch (a.tipo) {
      case 'criar_tarefa': {
        const t = acoes.criarTarefa(a.titulo, a.quando, a.repetir)
        cartoes.push({ tipo: 'tarefa', tarefa: t })
        const rep = descreverRepetir(t.repetir)
        falas.push(t.quando ? `Lembrete para ${descreverQuando(t.quando, agora)}${rep ? ` (${rep})` : ''}: ${t.titulo}.` : `Tarefa anotada: ${t.titulo}.`)
        break
      }
      case 'concluir': {
        dados.mudarTarefas((l) => l.map((t) => (t.id === a.tarefa.id ? concluir(t, agora) : t)))
        cartoes.push({ tipo: 'concluida', tarefa: a.tarefa })
        falas.push(`Feito: ${a.tarefa.titulo}.`)
        break
      }
      case 'hoje':
        cartoes.push({ tipo: 'hoje' })
        falas.push('Seu dia:')
        break
      case 'abrir': {
        const o = await acoes.abrirAtalho(a.atalho)
        if (o.ok) cartoes.push({ tipo: 'aberto', atalho: a.atalho })
        falas.push(o.ok ? `Abrindo ${a.atalho.nome}.` : o.erro)
        break
      }
      case 'evento':
        if (!google.estado().conectado) {
          falas.push('Para marcar na agenda, conecte o Google Agenda em Configurações.')
          break
        }
        cartoes.push({ tipo: 'evento', rascunho: a.rascunho })
        falas.push('Confira e clique em Criar.')
        break
      case 'claude':
        cartoes.push({ tipo: 'claude', pedido: a.pedido, pastaId: a.pastaId })
        falas.push(c.pastasClaude.length ? 'Revise o pedido e clique em Mandar.' : 'Cadastre a pasta do projeto em Configurações para mandar ao Claude Code.')
        break
      case 'ensinar':
        cartoes.push({ tipo: 'ensinar', nome: a.nome, destino: a.destino })
        falas.push('Confira o atalho e clique em Salvar.')
        break
    }
  }
  // Quando houve ação, a frase vem do código (o que de fato aconteceu); senão, a resposta da IA.
  const final = r.chamadas.length ? falas.join(' ') : (r.texto ?? 'Não entendi. Pode repetir de outro jeito?')
  return { texto: final, cartoes }
}
