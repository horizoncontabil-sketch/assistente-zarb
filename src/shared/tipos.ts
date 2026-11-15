import type { Mensagem } from './groq'

export type Configuracoes = {
  atalhoAbrir: string
  modelo: string
  temChaveGroq: boolean
  iniciarComWindows: boolean
}

export type ResultadoAtalho = { ok: true } | { ok: false; erro: string }
export type ResultadoConversa = { ok: true; texto: string } | { ok: false; erro: string }

export type ApiAssistente = {
  configuracoes(): Promise<Configuracoes>
  definirAtalho(acc: string): Promise<ResultadoAtalho>
  pausarAtalho(pausar: boolean): Promise<void>
  definirChaveGroq(chave: string): Promise<void>
  apagarChaveGroq(): Promise<void>
  definirModelo(modelo: string): Promise<void>
  definirIniciarComWindows(ligar: boolean): Promise<void>
  conversar(historico: Mensagem[]): Promise<ResultadoConversa>
  esconder(): Promise<void>
  aoAbrir(cb: (tela: 'conversa' | 'configuracoes') => void): () => void
}
