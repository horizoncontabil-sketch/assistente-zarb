import { useState } from 'react'
import { descreverQuando, descreverRepetir, mesmoDia } from '../../../shared/datas'
import type { Repetir, Tarefa } from '../../../shared/tipos'
import { Icone } from '../icones'
import { api, doCampo, paraCampo } from '../util'
import { Apagar, Mensagem, Titulo, Vazio } from './comum'

export const OPCOES_REPETIR = [
  { v: '', nome: 'Não repete' },
  { v: 'diario', nome: 'Todo dia' },
  { v: 'dias_uteis', nome: 'Dias úteis' },
  { v: 'semanal', nome: 'Toda semana' },
  { v: 'mensal', nome: 'Todo mês' },
]

export function Tarefas({ tarefas, agora }: { tarefas: Tarefa[]; agora: Date }) {
  const [ver, setVer] = useState<'pendentes' | 'feitas'>('pendentes')
  const [titulo, setTitulo] = useState('')
  const [comHorario, setComHorario] = useState(false)
  const [quando, setQuando] = useState('')
  const [repetir, setRepetir] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  const pendentes = tarefas.filter((t) => !t.feita)
  const atrasadas = pendentes.filter((t) => t.quando && new Date(t.quando) <= agora)
  const grupos =
    ver === 'feitas'
      ? [{ nome: 'Feitas nos últimos 30 dias', itens: tarefas.filter((t) => t.feita) }]
      : [
          { nome: atrasadas.length === 1 ? 'Atrasada' : 'Atrasadas', itens: atrasadas },
          { nome: 'Hoje', itens: pendentes.filter((t) => t.quando && new Date(t.quando) > agora && mesmoDia(new Date(t.quando), agora)) },
          { nome: 'Próximos dias', itens: pendentes.filter((t) => t.quando && new Date(t.quando) > agora && !mesmoDia(new Date(t.quando), agora)) },
          { nome: 'Sem horário', itens: pendentes.filter((t) => !t.quando) },
        ].filter((g) => g.itens.length)

  const criar = async (e: React.FormEvent) => {
    e.preventDefault()
    const r = await api.criarTarefa(titulo, comHorario ? doCampo(quando) : null, (repetir || null) as Repetir)
    if (!r.ok) return setErro(r.erro)
    setTitulo('')
    setQuando('')
    setRepetir('')
    setComHorario(false)
    setErro(null)
  }

  const primeiraAtrasada = atrasadas[0]?.quando
  return (
    <>
      <Titulo
        titulo="Tarefas"
        sub={`${pendentes.length} ${pendentes.length === 1 ? 'pendente' : 'pendentes'}${atrasadas.length ? `, ${atrasadas.length} ${atrasadas.length === 1 ? 'atrasada' : 'atrasadas'} desde ${descreverQuando(primeiraAtrasada!, agora).replace('hoje, ', 'as ')}` : ''}`}
      >
        <div className="segmentos" role="tablist">
          <button type="button" role="tab" aria-selected={ver === 'pendentes'} className={ver === 'pendentes' ? 'ativo' : ''} onClick={() => setVer('pendentes')}>
            Pendentes {pendentes.length}
          </button>
          <button type="button" role="tab" aria-selected={ver === 'feitas'} className={ver === 'feitas' ? 'ativo' : ''} onClick={() => setVer('feitas')}>
            Feitas
          </button>
        </div>
      </Titulo>

      <form className="barra-campo" onSubmit={criar}>
        <label htmlFor="nova-tarefa" className="so-leitor">
          Nova tarefa
        </label>
        <input id="nova-tarefa" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder='Nova tarefa, ex.: "Ligar para a Bianca"' />
        {comHorario && (
          <>
            <input type="datetime-local" className="campo-texto" style={{ flex: 'none', width: 200 }} value={quando} onChange={(e) => setQuando(e.target.value)} aria-label="Quando" />
            <select className="selecao" value={repetir} onChange={(e) => setRepetir(e.target.value)} aria-label="Repetir">
              {OPCOES_REPETIR.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.nome}
                </option>
              ))}
            </select>
          </>
        )}
        {!comHorario && (
          <button type="button" className="botao" onClick={() => setComHorario(true)}>
            <Icone nome="relogio" tamanho={15} /> Horário
          </button>
        )}
        <button type="submit" className="botao principal" disabled={!titulo.trim()}>
          Adicionar
        </button>
      </form>
      {erro && <Mensagem erro>{erro}</Mensagem>}

      <div className="rolagem">
        {grupos.length ? (
          <section className="cartao" style={{ gap: 0, padding: '6px 18px 10px' }}>
            {grupos.map((g) => (
              <div key={g.nome}>
                <div className="grupo-rotulo">{g.nome}</div>
                {g.itens.map((t) => (
                  <LinhaTarefa key={t.id} t={t} agora={agora} />
                ))}
              </div>
            ))}
          </section>
        ) : ver === 'pendentes' ? (
          <Vazio icone="check" titulo="Tudo em dia">
            Escreva acima ou fale: "me lembra às 15h de ligar pro cliente".
          </Vazio>
        ) : (
          <Vazio icone="lista" titulo="Nada feito nos últimos 30 dias" />
        )}
      </div>
    </>
  )
}

function LinhaTarefa({ t, agora }: { t: Tarefa; agora: Date }) {
  const [editando, setEditando] = useState(false)
  const atrasada = !t.feita && !!t.quando && new Date(t.quando) <= agora
  const rep = descreverRepetir(t.repetir)
  if (editando) return <EditarTarefa t={t} fechar={() => setEditando(false)} />
  return (
    <div className="linha" style={{ minHeight: 42 }}>
      <button type="button" className={`marcar ${t.feita ? 'feito' : ''}`} aria-label={t.feita ? `Reabrir ${t.titulo}` : `Marcar ${t.titulo} como feita`} onClick={() => (t.feita ? api.reabrirTarefa(t.id) : api.concluirTarefa(t.id))}>
        {t.feita && <Icone nome="check" tamanho={12} />}
      </button>
      <span className="principal-texto" style={t.feita ? { color: 'var(--apagado)', textDecoration: 'line-through' } : undefined}>
        {t.titulo}
      </span>
      <span className="acoes">
        {!t.feita && (
          <button type="button" className="icone" onClick={() => setEditando(true)} aria-label="Editar" title="Editar">
            <Icone nome="editar" tamanho={16} />
          </button>
        )}
        <Apagar aoConfirmar={() => api.apagarTarefa(t.id)} />
      </span>
      {rep && <span className="selo">{rep}</span>}
      {t.quando && (
        <span className="meta" style={{ width: 104, textAlign: 'right', color: atrasada ? 'var(--ambar)' : 'var(--suave)' }}>
          {atrasada ? 'era ' : ''}
          {descreverQuando(t.quando, agora)}
        </span>
      )}
      {atrasada && (
        <button type="button" className="botao pequeno" onClick={() => api.adiarTarefa(t.id, 60)}>
          +1 hora
        </button>
      )}
    </div>
  )
}

function EditarTarefa({ t, fechar }: { t: Tarefa; fechar: () => void }) {
  const [titulo, setTitulo] = useState(t.titulo)
  const [quando, setQuando] = useState(paraCampo(t.quando))
  const [repetir, setRepetir] = useState(t.repetir ?? '')
  const [erro, setErro] = useState<string | null>(null)
  return (
    <form
      className="formulario"
      style={{ padding: '8px 0' }}
      onSubmit={async (e) => {
        e.preventDefault()
        const r = await api.editarTarefa(t.id, titulo, doCampo(quando), (repetir || null) as Repetir)
        if (!r.ok) return setErro(r.erro)
        fechar()
      }}
    >
      <input className="campo-texto" value={titulo} onChange={(e) => setTitulo(e.target.value)} aria-label="Tarefa" autoFocus />
      <div className="linha-campos">
        <input type="datetime-local" className="campo-texto" value={quando} onChange={(e) => setQuando(e.target.value)} aria-label="Quando" />
        <select className="selecao" value={repetir} onChange={(e) => setRepetir(e.target.value)} disabled={!quando} aria-label="Repetir">
          {OPCOES_REPETIR.map((o) => (
            <option key={o.v} value={o.v}>
              {o.nome}
            </option>
          ))}
        </select>
      </div>
      {erro && <Mensagem erro>{erro}</Mensagem>}
      <div className="botoes">
        <button type="submit" className="botao principal" disabled={!titulo.trim()}>
          Salvar
        </button>
        <button type="button" className="botao leve" onClick={fechar}>
          Cancelar
        </button>
      </div>
    </form>
  )
}
