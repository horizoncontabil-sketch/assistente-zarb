import { useEffect, useState } from 'react'
import { adiar, concluir, novaTarefa, ordenar } from '../../src/shared/tarefas'
import { descreverQuando, descreverRepetir, isoLocal } from '../../src/shared/datas'
import type { Repetir, Tarefa } from '../../src/shared/tipos'
import { apagarItem, erroLegivel, lerItens, salvarItem } from './dados'

const REPETIR: [Repetir, string][] = [[null, 'Não repete'], ['diario', 'Todo dia'], ['dias_uteis', 'Dias úteis'], ['semanal', 'Toda semana'], ['mensal', 'Todo mês']]

const amanha9 = () => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(9, 0, 0, 0)
  return (d.getTime() - Date.now()) / 60000
}

export function Tarefas() {
  const [lista, setLista] = useState<Tarefa[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [titulo, setTitulo] = useState('')
  const [quando, setQuando] = useState('')
  const [repetir, setRepetir] = useState<Repetir>(null)
  const [aberta, setAberta] = useState<string | null>(null)

  useEffect(() => {
    lerItens<Tarefa>('tarefas').then((l) => setLista(ordenar(l))).catch((e) => setErro(erroLegivel(e)))
  }, [])

  async function trocar(t: Tarefa) {
    setErro(null)
    try {
      await salvarItem('tarefas', t)
      setLista((l) => ordenar([...(l ?? []).filter((x) => x.id !== t.id), t]))
      setAberta(null)
    } catch (e) {
      setErro(erroLegivel(e))
    }
  }

  async function criar(e: React.FormEvent) {
    e.preventDefault()
    if (!titulo.trim()) return
    const q = quando ? isoLocal(new Date(quando)) : null
    await trocar(novaTarefa(crypto.randomUUID(), titulo.trim().slice(0, 200), q, q ? repetir : null, new Date()))
    setTitulo('')
    setQuando('')
    setRepetir(null)
  }

  async function apagar(t: Tarefa) {
    if (!confirm(`Apagar "${t.titulo}"?`)) return
    try {
      await apagarItem('tarefas', t.id)
      setLista((l) => (l ?? []).filter((x) => x.id !== t.id))
    } catch (e) {
      setErro(erroLegivel(e))
    }
  }

  const agora = new Date()
  const pendentes = (lista ?? []).filter((t) => !t.feita)
  const feitas = (lista ?? []).filter((t) => t.feita).slice(0, 10)

  return (
    <>
      <div className="cab"><small>Iguais no PC</small><h1>Tarefas</h1></div>
      {erro && <div className="aviso erro">{erro}</div>}
      <form className="bloco" onSubmit={criar}>
        <input className="entrada" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Nova tarefa ou lembrete" aria-label="Nova tarefa" />
        <div className="dois">
          <label className="peq cinza">Quando (opcional)<input className="entrada" type="datetime-local" value={quando} onChange={(e) => setQuando(e.target.value)} /></label>
          <label className="peq cinza">Repetir<select className="entrada" value={repetir ?? ''} disabled={!quando} onChange={(e) => setRepetir((e.target.value || null) as Repetir)}>
            {REPETIR.map(([v, n]) => <option key={n} value={v ?? ''}>{n}</option>)}
          </select></label>
        </div>
        <button className="botao" disabled={!titulo.trim()}>Adicionar</button>
      </form>
      {lista === null && !erro && <span className="peq cinza">Carregando…</span>}
      {lista && !pendentes.length && <span className="suave">Nada pendente.</span>}
      <div className="exs">
        {pendentes.map((t) => {
          const atrasada = !!t.quando && new Date(t.quando) < agora
          return (
            <div key={t.id} className="tarefa">
              <button className="ex" onClick={() => setAberta(aberta === t.id ? null : t.id)} aria-expanded={aberta === t.id}>
                <span className="bola" aria-hidden="true" />
                <div>
                  <b>{t.titulo}</b>
                  {t.quando && <small style={{ color: atrasada ? 'var(--ambar)' : undefined }}>{descreverQuando(t.quando, agora)}{t.repetir ? ` · ${descreverRepetir(t.repetir)}` : ''}</small>}
                </div>
                <span />
              </button>
              {aberta === t.id && (
                <div className="acoes-tarefa">
                  <button className="botao pequeno" onClick={() => trocar(concluir(t, new Date()))}>Feito</button>
                  <button className="botao pequeno seg" onClick={() => trocar(adiar(t, 60, new Date()))}>+1 hora</button>
                  <button className="botao pequeno seg" onClick={() => trocar(adiar(t, amanha9(), new Date()))}>Amanhã 9h</button>
                  <button className="link" style={{ color: 'var(--vermelho)' }} onClick={() => apagar(t)}>Apagar</button>
                </div>
              )}
            </div>
          )
        })}
      </div>
      {feitas.length > 0 && (
        <details>
          <summary>Feitas</summary>
          <div className="exs">
            {feitas.map((t) => (
              <button key={t.id} className="ex ok" onClick={() => trocar({ ...t, feita: false, feitaEm: null })} aria-label={`Reabrir ${t.titulo}`}>
                <span className="bola">✓</span><div><b style={{ color: 'var(--suave)' }}>{t.titulo}</b></div><span />
              </button>
            ))}
          </div>
        </details>
      )}
    </>
  )
}
