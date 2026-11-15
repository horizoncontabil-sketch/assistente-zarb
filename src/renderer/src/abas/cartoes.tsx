import { useState } from 'react'
import { descreverQuando, descreverRepetir, diaLocal } from '../../../shared/datas'
import { progresso } from '../../../shared/habitos'
import type { Cartao, PastaClaude, RascunhoEvento } from '../../../shared/tipos'
import { Icone } from '../icones'
import type { Dados } from '../usarDados'
import { api, doCampo, paraCampo } from '../util'
import { FormAtalho } from './Atalhos'
import { EditorRefeicao, usarBase } from './Alimentacao'
import { Mensagem } from './comum'

export function CartaoDaResposta({ c, dados, agora }: { c: Cartao; dados: Dados; agora: Date }) {
  const [feito, setFeito] = useState<string | null>(null)
  const base = usarBase(dados.saude.alimentosMeus)
  if (feito) return <p className="meta" style={{ paddingLeft: 4 }}>{feito}</p>

  const linhaUnica = (cor: string, icone: Parameters<typeof Icone>[0]['nome'], titulo: string, sub: string, desfazer?: () => Promise<unknown>) => (
    <div className="cartao-conversa linha-unica">
      <span style={{ color: cor, display: 'grid' }}>
        <Icone nome={icone} tamanho={18} />
      </span>
      <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <span>{titulo}</span>
        <span className="meta">{sub}</span>
      </span>
      {desfazer && (
        <button
          type="button"
          className="link"
          onClick={async () => {
            await desfazer()
            setFeito('Desfeito.')
          }}
        >
          Desfazer
        </button>
      )}
    </div>
  )

  switch (c.tipo) {
    case 'tarefa': {
      const t = c.tarefa
      const rep = descreverRepetir(t.repetir)
      return linhaUnica('var(--ambar)', t.quando ? 'relogio' : 'check', t.titulo, t.quando ? `Lembrete para ${descreverQuando(t.quando, agora)}${rep ? `, ${rep}` : ''}` : 'Tarefa anotada', () => api.apagarTarefa(t.id))
    }
    case 'concluida':
      return linhaUnica('var(--verde)', 'check', c.tarefa.titulo, 'Marcada como feita', () => api.reabrirTarefa(c.tarefa.id))
    case 'habito': {
      const atual = c.habito.registro[diaLocal(agora)] ?? 0
      return linhaUnica('var(--azul)', 'habito', c.habito.nome, c.habito.meta ? progresso(c.habito, agora).texto : 'Feito hoje', () => api.registrarHabito(c.habito.id, c.antes - atual))
    }
    case 'refeicao':
      return <EditorRefeicao inicial={c.rascunho} base={base} compacto aoTerminar={(msg) => setFeito(msg ?? 'Descartado.')} />
    case 'corpo':
      return linhaUnica(
        'var(--azul)',
        'corpo',
        [c.registro.peso && `Peso ${String(c.registro.peso).replace('.', ',')} kg`, c.registro.abdomen && `abdômen ${c.registro.abdomen} cm`, c.registro.gordura && `gordura ${String(c.registro.gordura).replace('.', ',')}%`, c.registro.pressaoSis && `pressão ${c.registro.pressaoSis} x ${c.registro.pressaoDia ?? '?'}`, c.registro.treino && 'treino']
          .filter(Boolean)
          .join(' · '),
        'Anotado em Corpo',
        () => api.trocarCorpoDoDia(c.registro.dia, c.antes),
      )
    case 'volume':
      return linhaUnica('var(--suave)', 'mic', c.mudo ? 'Som no mudo' : `Volume em ${c.volume}%`, 'PC')
    case 'aberto':
      return null
    case 'hoje':
      return <ResumoCurto dados={dados} agora={agora} />
    case 'evento':
      return <CartaoEvento inicial={c.rascunho} aoTerminar={(msg) => setFeito(msg ?? 'Descartado.')} />
    case 'claude':
      return <CartaoClaude pedido={c.pedido} pastaId={c.pastaId} pastas={dados.config?.pastasClaude ?? []} aoTerminar={(msg) => setFeito(msg ?? 'Descartado.')} />
    case 'ensinar':
      return (
        <div style={{ width: '78%' }}>
          <FormAtalho inicial={{ nome: c.nome, destino: c.destino }} fechar={(salvou) => setFeito(salvou ? 'Atalho salvo.' : 'Descartado.')} />
        </div>
      )
    case 'pc': {
      const nome = { bloquear: 'Bloquear', suspender: 'Suspender', reiniciar: 'Reiniciar', desligar: 'Desligar' }[c.acao]
      return (
        <div className="cartao-conversa" role="alertdialog" aria-label={`${nome} o PC?`} style={{ background: 'var(--vermelho-fundo)' }}>
          <span>{nome} o PC?</span>
          <div className="botoes">
            <button
              type="button"
              className="botao perigo"
              onClick={async () => {
                const r = await api.pc({ tipo: 'energia', acao: c.acao, confirmado: true })
                setFeito(r.ok ? `${nome}: pedido enviado ao Windows.` : r.erro)
              }}
            >
              {nome} agora
            </button>
            <button type="button" className="botao leve" onClick={() => setFeito('Cancelado.')}>
              Cancelar
            </button>
          </div>
        </div>
      )
    }
  }
}

function ResumoCurto({ dados, agora }: { dados: Dados; agora: Date }) {
  const pend = dados.tarefas.filter((t) => !t.feita && t.quando && new Date(t.quando).toDateString() === agora.toDateString())
  const evs = dados.agenda.eventos.filter((e) => !e.diaInteiro && new Date(e.inicio).toDateString() === agora.toDateString() && new Date(e.fim) > agora)
  const itens = [...evs.map((e) => ({ t: e.inicio, txt: e.titulo })), ...pend.map((t) => ({ t: t.quando!, txt: t.titulo }))].sort((a, b) => a.t.localeCompare(b.t))
  return (
    <div className="cartao-conversa">
      {itens.length ? (
        itens.slice(0, 6).map((i, n) => (
          <div key={n} className="linha" style={{ minHeight: 30 }}>
            <span className="hora-coluna">{new Date(i.t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
            <span className="principal-texto">{i.txt}</span>
          </div>
        ))
      ) : (
        <span className="meta">Nada pela frente hoje.</span>
      )}
    </div>
  )
}

// Evento só é criado no Google quando o Paulo clica em Criar.
export function CartaoEvento({ inicial, aoTerminar, largo }: { inicial: RascunhoEvento; aoTerminar: (msg?: string) => void; largo?: boolean }) {
  const [titulo, setTitulo] = useState(inicial.titulo)
  const [inicio, setInicio] = useState(paraCampo(inicial.inicio))
  const [duracao, setDuracao] = useState(inicial.duracaoMin)
  const [convidados, setConvidados] = useState(inicial.convidados.join(', '))
  const [comMeet, setComMeet] = useState(inicial.comMeet)
  const [erro, setErro] = useState<string | null>(null)
  const [criando, setCriando] = useState(false)
  const lista = convidados.split(/[,;\s]+/).filter(Boolean)

  return (
    <form
      className="cartao-conversa"
      style={largo ? { width: '100%' } : undefined}
      onSubmit={async (e) => {
        e.preventDefault()
        const iso = doCampo(inicio)
        if (!iso) return setErro('Escolha dia e hora.')
        const invalidos = lista.filter((x) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x))
        if (invalidos.length) return setErro(`E-mail inválido: ${invalidos.join(', ')}`)
        setCriando(true)
        const r = await api.criarEvento({ titulo, inicio: iso, duracaoMin: duracao, convidados: lista, comMeet })
        setCriando(false)
        if (!r.ok) return setErro(r.erro)
        aoTerminar(`Evento criado: ${titulo}.${lista.length ? ' Convite enviado.' : ''}`)
      }}
    >
      <span className="meta">Evento no Google Agenda · confira e crie</span>
      <input className="campo-texto" style={{ fontWeight: 600 }} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título" aria-label="Título" />
      <div className="linha-campos">
        <input type="datetime-local" className="campo-texto" value={inicio} onChange={(e) => setInicio(e.target.value)} aria-label="Início" />
        <select className="selecao" value={duracao} onChange={(e) => setDuracao(Number(e.target.value))} aria-label="Duração">
          {[...new Set([15, 30, 45, 60, 90, 120, duracao])].sort((a, b) => a - b).map((m) => (
            <option key={m} value={m}>
              {m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, '0') : ''}`}
            </option>
          ))}
        </select>
        <button type="button" className={`botao ${comMeet ? '' : 'leve'}`} aria-pressed={comMeet} onClick={() => setComMeet((v) => !v)}>
          <Icone nome="video" tamanho={15} /> {comMeet ? 'Com Meet' : 'Sem Meet'}
        </button>
      </div>
      <input className="campo-texto" value={convidados} onChange={(e) => setConvidados(e.target.value)} placeholder="Convidados (e-mails, opcional)" aria-label="Convidados" />
      {erro && <Mensagem erro>{erro}</Mensagem>}
      <div className="botoes">
        <button type="submit" className="botao principal" disabled={!titulo.trim() || criando}>
          {criando ? 'Criando…' : lista.length ? 'Criar e enviar convite' : 'Criar'}
        </button>
        <button type="button" className="botao leve" onClick={() => aoTerminar()}>
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
  const atual = pastas.find((p) => p.id === pasta)
  return (
    <form
      className="cartao-conversa"
      onSubmit={async (e) => {
        e.preventDefault()
        const r = await api.mandarClaude(pasta, texto)
        if (!r.ok) return setErro(r.erro)
        aoTerminar(`Claude Code aberto em ${atual?.nome}. Ele pede sua aprovação antes de mexer em algo.`)
      }}
    >
      <span className="meta">Pedido para o Claude Code · revise e mande</span>
      {pastas.length ? (
        <div className="linha" style={{ minHeight: 30 }}>
          <span className="meta">Projeto:</span>
          <select className="selecao" style={{ height: 30 }} value={pasta} onChange={(e) => setPasta(e.target.value)} aria-label="Projeto">
            {pastas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
          <span className="meta">{atual?.caminho}</span>
        </div>
      ) : (
        <Mensagem erro>Cadastre a pasta do projeto em Configurações › Claude Code.</Mensagem>
      )}
      <textarea className="campo-texto" rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Pedido" />
      {erro && <Mensagem erro>{erro}</Mensagem>}
      <div className="botoes">
        <button type="submit" className="botao principal" disabled={!pastas.length || !texto.trim()}>
          Mandar
        </button>
        <button type="button" className="botao leve" onClick={() => aoTerminar()}>
          Descartar
        </button>
        <span className="meta">Abre o terminal; o Claude pede aprovação antes de mexer.</span>
      </div>
    </form>
  )
}
