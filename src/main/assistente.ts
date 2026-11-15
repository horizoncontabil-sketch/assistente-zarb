// Recebe o que o Paulo falou ou escreveu e devolve a resposta com os cartões.
import * as acoes from './acoes'
import * as config from './config'
import * as dados from './dados'
import * as google from './google'
import * as groq from './groq'
import * as pc from './pc'
import { validarAcao } from '../shared/acoes'
import { comandoDireto } from '../shared/comandos'
import { descreverQuando, descreverRepetir, diaLocal } from '../shared/datas'
import { instrucao } from '../shared/groq'
import { progresso, registrar } from '../shared/habitos'
import { concluir } from '../shared/tarefas'
import { ALIMENTOS_TACO, totaisDoDia } from '../shared/alimentacao'
import { montarRascunho } from '../shared/refeicaoIa'
import type { Aba, Cartao, Mensagem, Resposta } from '../shared/tipos'

const NOME_ABA: Record<Exclude<Aba, 'hoje'>, string> = {
  metas: 'Metas',
  alimentacao: 'Alimentação',
  corpo: 'Corpo',
  tarefas: 'Tarefas',
  habitos: 'Hábitos',
  agenda: 'Agenda',
  copiados: 'Copiados',
  atalhos: 'Atalhos',
  pc: 'PC',
  config: 'Configurações',
}

// Cartões que não pedem nada ao Paulo: a resposta cabe no entalho, sem abrir o painel.
const SO_AVISO = new Set<Cartao['tipo']>(['tarefa', 'concluida', 'aberto', 'habito', 'volume', 'corpo'])

function fechar(r: Resposta): Resposta {
  const rapida = !r.erro && !r.aba && r.texto.length <= 140 && r.cartoes.every((c) => SO_AVISO.has(c.tipo))
  return { ...r, rapida }
}

async function volume(m: { nivel?: number; mudar?: number; mudo?: boolean }): Promise<Resposta> {
  const r = await pc.mudarVolume(m)
  if (!r) return { texto: process.platform === 'win32' ? 'Não consegui mudar o volume.' : 'Volume só funciona no Windows.', cartoes: [], erro: true }
  return { texto: r.mudo ? 'Som no mudo.' : `Volume em ${r.volume}%.`, cartoes: [{ tipo: 'volume', volume: r.volume, mudo: r.mudo }] }
}

// O que a IA recebe sobre a dieta de hoje (só números, para responder "quanto ainda cabe").
function dietaDeHoje(agora: Date): string | null {
  const p = dados.ler.plano()
  if (!p) return null
  const t = totaisDoDia(dados.ler.refeicoes(), diaLocal(agora))
  return `comeu ${t.kcal} de ${p.kcal} kcal, ${t.p} de ${p.proteina} g de proteína, ${t.c} de ${p.carbo} g de carboidrato, ${t.g} de ${p.gordura} g de gordura`
}

const baseDeAlimentos = () => [...dados.ler.alimentosMeus(), ...ALIMENTOS_TACO]

export async function interpretarRefeicao(texto: string, dia: string) {
  const agora = new Date()
  const r = await groq.perguntar(
    instrucao(agora, [], [], []) + '\nAgora só registre a refeição descrita com registrar_refeicao.',
    [],
    texto.slice(0, 2000),
  )
  if (!r.ok) return r
  const ch = r.chamadas.find((c) => c.nome === 'registrar_refeicao')
  if (!ch) return { ok: false as const, erro: r.texto ?? 'Não entendi a refeição. Diga os alimentos e as quantidades.' }
  let args: { tipo?: unknown; itens?: unknown }
  try {
    args = JSON.parse(ch.args)
  } catch {
    return { ok: false as const, erro: 'Não entendi a refeição.' }
  }
  const rascunho = montarRascunho(args, baseDeAlimentos(), dia, agora)
  return rascunho ? { ok: true as const, rascunho } : { ok: false as const, erro: 'Não entendi a refeição.' }
}

export async function conversar(texto: string, historico: Mensagem[]): Promise<Resposta> {
  const pedido = texto.trim().slice(0, 4000)
  if (!pedido) return { texto: '', cartoes: [] }

  const direto = comandoDireto(pedido, dados.ler.atalhos())
  if (direto?.tipo === 'abrir') {
    const r = await acoes.abrirAtalho(direto.atalho)
    return fechar(r.ok ? { texto: `Abrindo ${direto.atalho.nome}.`, cartoes: [{ tipo: 'aberto', atalho: direto.atalho }] } : { texto: r.erro, cartoes: [], erro: true })
  }
  if (direto?.tipo === 'hoje') return fechar({ texto: 'Seu dia:', cartoes: [{ tipo: 'hoje' }] })
  if (direto?.tipo === 'aba') return fechar({ texto: `Abrindo ${NOME_ABA[direto.aba]}.`, cartoes: [], aba: direto.aba })
  if (direto?.tipo === 'volume') return fechar(await volume(direto.mudanca))
  if (direto?.tipo === 'bloquear') {
    const r = await pc.executar({ tipo: 'energia', acao: 'bloquear', confirmado: false })
    return fechar(r.ok ? { texto: 'Bloqueando o PC.', cartoes: [] } : { texto: r.erro, cartoes: [], erro: true })
  }

  const agora = new Date()
  const c = config.ler()
  const r = await groq.perguntar(
    instrucao(
      agora,
      dados.ler.atalhos().map((a) => a.nome),
      c.pastasClaude.map((p) => p.nome),
      dados.ler.habitos().map((h) => (h.meta ? `${h.nome} (meta ${h.meta.total} ${h.meta.unidade})` : h.nome)),
      dietaDeHoje(agora),
    ),
    historico,
    pedido,
  )
  if (!r.ok) return { texto: r.erro, cartoes: [], erro: true }

  const cartoes: Cartao[] = []
  const falas: string[] = []
  for (const ch of r.chamadas) {
    const v = validarAcao(ch.nome, ch.args, { agora, atalhos: dados.ler.atalhos(), pastas: c.pastasClaude, tarefas: dados.ler.tarefas(), habitos: dados.ler.habitos() })
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
        falas.push(t.quando ? `Lembrete para ${descreverQuando(t.quando, agora)}${rep ? `, ${rep}` : ''}.` : `Anotado: ${t.titulo}.`)
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
          falas.push('Para marcar na agenda, entre com o Google em Configurações.')
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
      case 'habito': {
        const antes = a.habito.registro[diaLocal(agora)] ?? 0
        let novo = a.habito
        dados.mudarHabitos((l) => l.map((h) => (h.id === a.habito.id ? (novo = registrar(h, agora, a.quantidade)) : h)))
        cartoes.push({ tipo: 'habito', habito: novo, antes })
        falas.push(novo.meta ? `${novo.nome}: ${progresso(novo, agora).texto}.` : `${novo.nome}: feito.`)
        break
      }
      case 'volume': {
        const res = await volume(a.mudanca)
        cartoes.push(...res.cartoes)
        falas.push(res.texto)
        break
      }
      case 'refeicao': {
        const rascunho = montarRascunho(a.args, baseDeAlimentos(), diaLocal(agora), agora)
        if (rascunho) {
          cartoes.push({ tipo: 'refeicao', rascunho })
          falas.push('Confira a refeição e salve.')
        } else falas.push('Não entendi a refeição.')
        break
      }
      case 'corpo': {
        const registro = { dia: diaLocal(agora), ...a.medidas }
        const antes = dados.registrarCorpo(registro)
        cartoes.push({ tipo: 'corpo', registro, antes })
        const partes = [
          a.medidas.peso && `peso ${String(a.medidas.peso).replace('.', ',')} kg`,
          a.medidas.abdomen && `abdômen ${a.medidas.abdomen} cm`,
          a.medidas.gordura && `gordura ${String(a.medidas.gordura).replace('.', ',')}%`,
          a.medidas.pressaoSis && `pressão ${a.medidas.pressaoSis} por ${a.medidas.pressaoDia ?? '?'}`,
          a.medidas.treino && 'treino do dia',
        ].filter(Boolean)
        falas.push(`Anotado: ${partes.join(', ')}.`)
        acoes.avisarSaude()
        break
      }
      case 'pc':
        if (a.acao === 'bloquear') {
          const o = await pc.executar({ tipo: 'energia', acao: 'bloquear', confirmado: false })
          falas.push(o.ok ? 'Bloqueando o PC.' : o.erro)
        } else {
          cartoes.push({ tipo: 'pc', acao: a.acao })
          falas.push(`Confirme na tela para ${a.acao}.`)
        }
        break
    }
  }
  if (cartoes.some((x) => x.tipo === 'habito' || x.tipo === 'tarefa')) acoes.avisarMudanca()
  // Quando houve ação, a frase vem do código (o que de fato aconteceu); senão, a resposta da IA.
  if (r.chamadas.length) return fechar({ texto: falas.join(' '), cartoes })
  const resposta = r.texto ?? 'Não entendi. Pode repetir de outro jeito?'
  return { ...fechar({ texto: resposta, cartoes: [] }), pergunta: /\?\s*$/.test(resposta) }
}
