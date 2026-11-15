import { useState } from 'react'
import { descreverQuando, descreverRepetir } from '../../../shared/datas'
import type { Cartao, PastaClaude, RascunhoEvento } from '../../../shared/tipos'
import { Icone } from '../icones'
import type { Dados } from '../usarDados'
import { api, doCampo, paraCampo } from '../util'
import { FormAtalho } from './Atalhos'
import { Hoje } from './Hoje'
import { Mensagem } from './comum'

export function CartaoDaResposta({ c, dados, agora }: { c: Cartao; dados: Dados; agora: Date }) {
  const [feito, setFeito] = useState<string | null>(null)
  if (feito) return <p className="cartao-feito">{feito}</p>

  switch (c.tipo) {
    case 'tarefa': {
      const t = c.tarefa
      const rep = descreverRepetir(t.repetir)
      return (
        <div className="cartao">
          <span className={`cartao-icone ${t.quando ? 'lembrete' : 'tarefa'}`}>
            <Icone nome={t.quando ? 'relogio' : 'check'} />
          </span>
          <div className="cartao-texto">
            <strong>{t.titulo}</strong>
            <span>{t.quando ? `${descreverQuando(t.quando, agora)}${rep ? ` · ${rep}` : ''}` : 'Tarefa'}</span>
          </div>
          <button
            className="discreto pequeno"
            onClick={async () => {
              await api.apagarTarefa(t.id)
              setFeito('Desfeito.')
            }}
          >
            Desfazer
          </button>
        </div>
      )
    }
    case 'concluida':
      return (
        <div className="cartao">
          <span className="cartao-icone tarefa">
            <Icone nome="check" />
          </span>
          <div className="cartao-texto">
            <strong>{c.tarefa.titulo}</strong>
            <span>Marcada como feita</span>
          </div>
          <button
            className="discreto pequeno"
            onClick={async () => {
              await api.reabrirTarefa(c.tarefa.id)
              setFeito('Reaberta.')
            }}
          >
            Desfazer
          </button>
        </div>
      )
    case 'aberto':
      return null
    case 'hoje':
      return (
        <div className="cartao bloco">
          <Hoje dados={dados} agora={agora} compacto />
        </div>
      )
    case 'evento':
      return <CartaoEvento inicial={c.rascunho} aoTerminar={(msg) => setFeito(msg ?? 'Descartado.')} />
    case 'claude':
      return <CartaoClaude pedido={c.pedido} pastaId={c.pastaId} pastas={dados.config?.pastasClaude ?? []} aoTerminar={(msg) => setFeito(msg ?? 'Descartado.')} />
    case 'ensinar':
      return (
        <div className="cartao bloco">
          <span className="cartao-rotulo">Atalho novo</span>
          <FormAtalho inicial={{ nome: c.nome, destino: c.destino }} fechar={(salvou) => setFeito(salvou ? 'Atalho salvo.' : 'Descartado.')} />
        </div>
      )
  }
}

// Evento só é criado no Google quando o Paulo clica em Criar.
export function CartaoEvento({ inicial, aoTerminar }: { inicial: RascunhoEvento; aoTerminar: (msg?: string) => void }) {
  const [titulo, setTitulo] = useState(inicial.titulo)
  const [inicio, setInicio] = useState(paraCampo(inicial.inicio))
  const [duracao, setDuracao] = useState(inicial.duracaoMin)
  const [convidados, setConvidados] = useState(inicial.convidados.join(', '))
  const [comMeet, setComMeet] = useState(inicial.comMeet)
  const [erro, setErro] = useState<string | null>(null)
  const [criando, setCriando] = useState(false)

  const criar = async (e: React.FormEvent) => {
    e.preventDefault()
    const iso = doCampo(inicio)
    if (!iso) return setErro('Escolha dia e hora.')
    const lista = convidados.split(/[,;\s]+/).filter(Boolean)
    const invalidos = lista.filter((x) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x))
    if (invalidos.length) return setErro(`E-mail inválido: ${invalidos.join(', ')}`)
    setCriando(true)
    const r = await api.criarEvento({ titulo, inicio: iso, duracaoMin: duracao, convidados: lista, comMeet })
    setCriando(false)
    if (!r.ok) return setErro(r.erro)
    aoTerminar(`Evento criado: ${titulo}.${lista.length ? ' Convites enviados.' : ''}`)
  }

  return (
    <form className="cartao bloco formulario" onSubmit={criar}>
      <span className="cartao-rotulo">
        <Icone nome="agenda" tamanho={15} /> Evento no Google Agenda
      </span>
      <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título" aria-label="Título" />
      <div className="linha-campos">
        <input type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} aria-label="Início" />
        <select value={duracao} onChange={(e) => setDuracao(Number(e.target.value))} aria-label="Duração">
          {[15, 30, 45, 60, 90, 120].map((m) => (
            <option key={m} value={m}>
              {m < 60 ? `${m} min` : `${m / 60}h${m % 60 ? '30' : ''}`}
            </option>
          ))}
          {![15, 30, 45, 60, 90, 120].includes(duracao) && <option value={duracao}>{duracao} min</option>}
        </select>
      </div>
      <input value={convidados} onChange={(e) => setConvidados(e.target.value)} placeholder="Convidados (e-mails, opcional)" aria-label="Convidados" />
      <label className="caixa">
        <input type="checkbox" checked={comMeet} onChange={(e) => setComMeet(e.target.checked)} /> Criar link do Meet
      </label>
      {erro && <Mensagem tipo="erro">{erro}</Mensagem>}
      <div className="botoes">
        <button type="submit" className="primario" disabled={!titulo.trim() || criando}>
          {criando ? 'Criando…' : 'Criar'}
        </button>
        <button type="button" className="discreto" onClick={() => aoTerminar()}>
          Descartar
        </button>
      </div>
    </form>
  )
}

// Claude Code: o pedido aparece inteiro e editável; só vai quando o Paulo clica em Mandar.
function CartaoClaude({ pedido, pastaId, pastas, aoTerminar }: { pedido: string; pastaId: string | null; pastas: PastaClaude[]; aoTerminar: (msg?: string) => void }) {
  const [texto, setTexto] = useState(pedido)
  const [pasta, setPasta] = useState(pastaId ?? pastas[0]?.id ?? '')
  const [erro, setErro] = useState<string | null>(null)
  const mandar = async (e: React.FormEvent) => {
    e.preventDefault()
    const r = await api.mandarClaude(pasta, texto)
    if (!r.ok) return setErro(r.erro)
    aoTerminar(`Claude Code aberto em ${pastas.find((p) => p.id === pasta)?.nome}. Ele vai pedir sua aprovação antes de mexer em algo.`)
  }
  return (
    <form className="cartao bloco formulario" onSubmit={mandar}>
      <span className="cartao-rotulo">
        <Icone nome="terminal" tamanho={15} /> Pedido para o Claude Code
      </span>
      {pastas.length ? (
        <select value={pasta} onChange={(e) => setPasta(e.target.value)} aria-label="Projeto">
          {pastas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome} · {p.caminho}
            </option>
          ))}
        </select>
      ) : (
        <Mensagem tipo="erro">Cadastre a pasta do projeto em Configurações › Claude Code.</Mensagem>
      )}
      <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={4} aria-label="Pedido" />
      {erro && <Mensagem tipo="erro">{erro}</Mensagem>}
      <div className="botoes">
        <button type="submit" className="primario" disabled={!pastas.length || !texto.trim()}>
          Mandar
        </button>
        <button type="button" className="discreto" onClick={() => aoTerminar()}>
          Descartar
        </button>
      </div>
    </form>
  )
}
