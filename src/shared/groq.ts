// Conversa com a Groq (API no formato da OpenAI). Só o processo principal chama, porque a chave fica lá.

export const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
export const MODELO_PADRAO = 'llama-3.3-70b-versatile'

export type Mensagem = { papel: 'eu' | 'assistente'; texto: string }

const INSTRUCAO =
  'Você é o assistente de mesa do Paulo, que trabalha na Zarb Media (marketing e vendas para festas e eventos). ' +
  'Responda em português do Brasil, curto e direto, sem enrolação. ' +
  'Por enquanto você só conversa: ainda não cria tarefas, lembretes nem abre programas. ' +
  'Se pedirem isso, diga que essa função chega nas próximas versões.'

// Manda só as últimas mensagens: conversa longa gasta o limite grátis à toa.
export const LIMITE_HISTORICO = 12

export function corpoDoPedido(modelo: string, historico: Mensagem[]) {
  return {
    model: modelo,
    temperature: 0.4,
    messages: [
      { role: 'system', content: INSTRUCAO },
      ...historico.slice(-LIMITE_HISTORICO).map((m) => ({
        role: m.papel === 'eu' ? 'user' : 'assistant',
        content: m.texto,
      })),
    ],
  }
}

export function textoDaResposta(json: unknown): string | null {
  const texto = (json as { choices?: { message?: { content?: unknown } }[] })?.choices?.[0]?.message?.content
  return typeof texto === 'string' && texto.trim() ? texto.trim() : null
}

export function erroDaGroq(status: number): string {
  if (status === 401 || status === 403) return 'A Groq recusou a chave. Confira a chave nas configurações.'
  if (status === 404) return 'A Groq não achou o modelo. Troque o modelo nas configurações.'
  if (status === 429) return 'Limite do plano grátis da Groq atingido. Tente de novo em alguns minutos.'
  if (status >= 500) return 'A Groq está com problema agora. Tente de novo daqui a pouco.'
  return `A Groq respondeu com erro (${status}).`
}
