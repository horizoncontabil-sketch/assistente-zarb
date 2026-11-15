// Tipos que passam entre a tela (renderer) e o processo principal.

export type Repetir = 'diario' | 'dias_uteis' | 'semanal' | 'mensal' | null

export type Tarefa = {
  id: string
  titulo: string
  quando: string | null // ISO; com horário vira lembrete
  repetir: Repetir
  feita: boolean
  feitaEm: string | null
  criadaEm: string
  avisada: boolean // já avisou para o "quando" atual
}

export type Evento = {
  id: string
  titulo: string
  inicio: string // ISO, ou AAAA-MM-DD quando é dia inteiro
  fim: string
  diaInteiro: boolean
  local: string | null
  meet: string | null
  link: string | null
}

export type Copia = { id: string; texto: string; em: string; fixada: boolean }

export type TipoAtalho = 'site' | 'pasta' | 'programa'
export type Atalho = { id: string; nome: string; destino: string; tipo: TipoAtalho }

export type PastaClaude = { id: string; nome: string; caminho: string }

export type Configuracoes = {
  atalhoAbrir: string
  atalhoFalar: string
  atalhoCopiados: string
  modelo: string
  temChaveGroq: boolean
  iniciarComWindows: boolean
  entalhoSempreVisivel: boolean
  responderFalando: boolean
  chamadoPorVoz: boolean
  copiasAtivas: boolean
  google: { temCliente: boolean; conectado: boolean; email: string | null }
  avisoEventoMin: number
  copiarLembretesParaAgenda: boolean
  pastasClaude: PastaClaude[]
  modeloVozDisponivel: boolean
}

export type MudancaConfig = Partial<
  Pick<
    Configuracoes,
    | 'modelo'
    | 'entalhoSempreVisivel'
    | 'responderFalando'
    | 'chamadoPorVoz'
    | 'copiasAtivas'
    | 'avisoEventoMin'
    | 'copiarLembretesParaAgenda'
  >
>

export type QualAtalho = 'atalhoAbrir' | 'atalhoFalar' | 'atalhoCopiados'

// Cartões que a resposta do assistente pode trazer. Os que mudam algo fora do app
// (evento, Claude Code, atalho novo, apagar) só acontecem quando o Paulo clica no botão.
export type Cartao =
  | { tipo: 'tarefa'; tarefa: Tarefa } // criada; tem Desfazer
  | { tipo: 'hoje' }
  | { tipo: 'evento'; rascunho: RascunhoEvento }
  | { tipo: 'claude'; pedido: string; pastaId: string | null }
  | { tipo: 'ensinar'; nome: string; destino: string }
  | { tipo: 'aberto'; atalho: Atalho }
  | { tipo: 'concluida'; tarefa: Tarefa }

export type RascunhoEvento = {
  titulo: string
  inicio: string
  duracaoMin: number
  convidados: string[]
  comMeet: boolean
}

export type Resposta = { texto: string; cartoes: Cartao[]; erro?: boolean; aba?: Aba }

export type Ok = { ok: true } | { ok: false; erro: string }

export type Mensagem = { papel: 'eu' | 'assistente'; texto: string }

export type Mudou = 'tarefas' | 'eventos' | 'copias' | 'atalhos' | 'config'

export type ApiAssistente = {
  // estado
  configuracoes(): Promise<Configuracoes>
  tarefas(): Promise<Tarefa[]>
  eventos(): Promise<{ eventos: Evento[]; lidoEm: string | null; erro: string | null }>
  copias(): Promise<Copia[]>
  atalhos(): Promise<Atalho[]>
  // conversa
  conversar(texto: string, historico: Mensagem[]): Promise<Resposta>
  transcrever(audio: Uint8Array): Promise<{ ok: true; texto: string } | { ok: false; erro: string }>
  // tarefas
  criarTarefa(titulo: string, quando: string | null, repetir: Repetir): Promise<Ok>
  editarTarefa(id: string, titulo: string, quando: string | null, repetir: Repetir): Promise<Ok>
  concluirTarefa(id: string): Promise<void>
  reabrirTarefa(id: string): Promise<void>
  adiarTarefa(id: string, minutos: number): Promise<void>
  apagarTarefa(id: string): Promise<void>
  // agenda
  criarEvento(r: RascunhoEvento): Promise<Ok>
  atualizarAgenda(): Promise<void>
  conectarGoogle(): Promise<Ok>
  desconectarGoogle(): Promise<void>
  definirClienteGoogle(clientId: string, clientSecret: string): Promise<Ok>
  // atalhos e abrir
  abrir(id: string): Promise<Ok>
  abrirLink(url: string): Promise<Ok>
  salvarAtalho(nome: string, destino: string, id?: string): Promise<Ok>
  apagarAtalho(id: string): Promise<void>
  escolherPasta(): Promise<string | null>
  // copiados
  copiar(id: string): Promise<void>
  fixarCopia(id: string, fixada: boolean): Promise<void>
  apagarCopia(id: string): Promise<void>
  limparCopias(): Promise<void>
  // claude code
  mandarClaude(pastaId: string, pedido: string): Promise<Ok>
  salvarPastaClaude(nome: string, caminho: string): Promise<Ok>
  apagarPastaClaude(id: string): Promise<void>
  // configurações
  definirAtalho(qual: QualAtalho, acc: string): Promise<Ok>
  pausarAtalhos(pausar: boolean): Promise<void>
  definirChaveGroq(chave: string): Promise<Ok>
  apagarChaveGroq(): Promise<void>
  mudarConfig(m: MudancaConfig): Promise<void>
  definirIniciarComWindows(ligar: boolean): Promise<void>
  modeloVoz(): Promise<Uint8Array | null>
  atualizacao(): Promise<Atualizacao>
  // janela
  expandido(sim: boolean): Promise<void>
  mouseSobre(sim: boolean): Promise<void>
  sair(): Promise<void>
  // eventos vindos do principal
  aoMudar(cb: (o: Mudou) => void): () => void
  aoComando(cb: (c: ComandoJanela) => void): () => void
}

export type ComandoJanela =
  | { tipo: 'alternar' }
  | { tipo: 'expandir'; aba?: Aba }
  | { tipo: 'recolher' }
  | { tipo: 'falar' }
  | { tipo: 'aviso'; aviso: Aviso }

export type Aba = 'hoje' | 'tarefas' | 'agenda' | 'copiados' | 'atalhos' | 'config'

export type Aviso =
  | { tipo: 'lembrete'; tarefa: Tarefa; atrasado: boolean }
  | { tipo: 'evento'; evento: Evento; minutos: number }

export type EstadoAtualizacao =
  | { tipo: 'desligada'; motivo: string }
  | { tipo: 'em-dia'; conferidoEm: string | null }
  | { tipo: 'baixando'; versao: string; porcento: number }
  | { tipo: 'pronta'; versao: string }
  | { tipo: 'recusada'; versao: string; motivo: string }
  | { tipo: 'erro'; motivo: string }

export type Atualizacao = EstadoAtualizacao & { versao_atual: string }
