// Conversa com a Groq (API no formato da OpenAI). Só o processo principal chama, porque a chave fica lá.
import { FERRAMENTAS } from './acoes'
import { diaDaSemana, isoLocal } from './datas'
import type { Mensagem } from './tipos'

export const GROQ_CHAT = 'https://api.groq.com/openai/v1/chat/completions'
export const GROQ_AUDIO = 'https://api.groq.com/openai/v1/audio/transcriptions'
export const MODELO_PADRAO = 'llama-3.3-70b-versatile'
export const MODELO_AUDIO = 'whisper-large-v3-turbo'

// Manda só as últimas mensagens: conversa longa gasta o limite grátis à toa.
export const LIMITE_HISTORICO = 10

export function instrucao(agora: Date, atalhos: string[], pastas: string[], habitos: string[] = []): string {
  return [
    'Você é o assistente de mesa do Paulo, Customer Success da Zarb Media (assessoria de marketing e vendas para festas e eventos).',
    `Agora é ${diaDaSemana(agora)}, ${isoLocal(agora)}.`,
    'Responda em português do Brasil, curto e direto, como um colega de trabalho. Sem enrolação, sem listas longas, sem emojis.',
    'Para criar lembrete, tarefa, evento, abrir atalho, pedir algo ao Claude Code ou ensinar atalho, use SEMPRE as ferramentas; nunca diga que fez sem usar a ferramenta.',
    'Lembrete tem horário; tarefa não. Reunião, call ou compromisso marcado com alguém é evento do Google Agenda.',
    'Horários: converta "amanhã às 9", "daqui a 2 horas", "segunda de manhã" (9h), "à tarde" (14h), "à noite" (19h) para ISO com o fuso de agora. Se faltar informação essencial, pergunte em uma frase.',
    `Atalhos cadastrados: ${atalhos.length ? atalhos.join(', ') : 'nenhum'}.`,
    `Pastas do Claude Code: ${pastas.length ? pastas.join(', ') : 'nenhuma'}.`,
    `Hábitos do Paulo: ${habitos.length ? habitos.join(', ') : 'nenhum'}. Quando ele contar que fez algo de um hábito, use registrar_habito.`,
    'Você também controla o volume do PC e pode bloquear, suspender, reiniciar ou desligar (os três últimos o Paulo confirma na tela).',
    'Respostas faladas: no máximo duas frases curtas, sem listas, sem markdown.',
    'Você não tem acesso à internet, a arquivos nem ao Zarb OS. Se pedirem, diga o que não alcança.',
  ].join('\n')
}

export function corpoDoPedido(modelo: string, sistema: string, historico: Mensagem[], texto: string) {
  return {
    model: modelo,
    temperature: 0.3,
    tool_choice: 'auto',
    tools: FERRAMENTAS.map((f) => ({ type: 'function', function: f })),
    messages: [
      { role: 'system', content: sistema },
      ...historico.slice(-LIMITE_HISTORICO).map((m) => ({ role: m.papel === 'eu' ? 'user' : 'assistant', content: m.texto })),
      { role: 'user', content: texto },
    ],
  }
}

export type Chamada = { nome: string; args: string }

export function lerResposta(json: unknown): { texto: string | null; chamadas: Chamada[] } {
  const msg = (json as { choices?: { message?: { content?: unknown; tool_calls?: unknown } }[] })?.choices?.[0]?.message
  const texto = typeof msg?.content === 'string' && msg.content.trim() ? msg.content.trim() : null
  const brutas = Array.isArray(msg?.tool_calls) ? msg.tool_calls : []
  const chamadas = brutas
    .map((c: { function?: { name?: unknown; arguments?: unknown } }) => ({
      nome: typeof c?.function?.name === 'string' ? c.function.name : '',
      args: typeof c?.function?.arguments === 'string' ? c.function.arguments : '{}',
    }))
    .filter((c) => c.nome)
    .slice(0, 5)
  return { texto, chamadas }
}

export function textoTranscrito(json: unknown): string | null {
  const t = (json as { text?: unknown })?.text
  return typeof t === 'string' && t.trim() ? t.trim() : null
}

export function erroDaGroq(status: number): string {
  if (status === 401 || status === 403) return 'A Groq recusou a chave. Confira a chave nas configurações.'
  if (status === 404) return 'A Groq não achou o modelo. Troque o modelo nas configurações.'
  if (status === 413) return 'Áudio longo demais.'
  if (status === 429) return 'Limite do plano grátis da Groq atingido. Tente de novo em alguns minutos.'
  if (status >= 500) return 'A Groq está com problema agora. Tente de novo daqui a pouco.'
  return `A Groq respondeu com erro (${status}).`
}
