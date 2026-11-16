import { useEffect, useState } from 'react'
import { TODO_DIA, descreverDias, ehDiaDele, feitoNoDia, numero, progresso, registrar, semana, sequencia, type Habito } from '../../src/shared/habitos'
import { erroLegivel, lerItens, salvarItem } from './dados'

const LETRAS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']
const ESTADO: Record<string, string> = { feito: 'feito', perdido: 'não feito', fora: 'fora da agenda', pendente: 'hoje, a fazer', futuro: 'ainda vem' }

export function Habitos() {
  const [lista, setLista] = useState<Habito[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [nome, setNome] = useState('')

  useEffect(() => {
    lerItens<Habito>('habitos')
      .then((l) => setLista(l.sort((a, b) => a.criadoEm.localeCompare(b.criadoEm))))
      .catch((e) => setErro(erroLegivel(e)))
  }, [])

  async function trocar(h: Habito) {
    setErro(null)
    try {
      await salvarItem('habitos', h)
      setLista((l) => {
        const atual = l ?? []
        return atual.some((x) => x.id === h.id) ? atual.map((x) => (x.id === h.id ? h : x)) : [...atual, h]
      })
    } catch (e) {
      setErro(erroLegivel(e))
    }
  }

  function criar(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return
    void trocar({ id: crypto.randomUUID(), nome: nome.trim().slice(0, 80), dias: TODO_DIA, meta: null, lembrete: null, registro: {}, criadoEm: new Date().toISOString() })
    setNome('')
  }

  const hoje = new Date()
  const deHoje = (lista ?? []).filter((h) => ehDiaDele(h, hoje))
  const outros = (lista ?? []).filter((h) => !ehDiaDele(h, hoje))

  const cartao = (h: Habito) => {
    const p = progresso(h, hoje)
    const seq = sequencia(h, hoje)
    const feito = feitoNoDia(h, hoje)
    return (
      <section key={h.id} className="bloco">
        <div className="linha">
          <b>{h.nome}</b>
          <span className="peq cinza">{seq > 0 ? `${seq} seguidos` : descreverDias(h.dias)}</span>
        </div>
        <div className="semana">
          {semana(h, hoje).map((d, i) => (
            <span key={i} className={`dia ${d.estado}`} aria-label={`${LETRAS[i]}: ${ESTADO[d.estado]}`}>{LETRAS[i]}</span>
          ))}
        </div>
        {ehDiaDele(h, hoje) &&
          (h.meta ? (
            <>
              <div className="medidor verde"><i style={{ width: `${p.fracao * 100}%` }} /></div>
              <span className="peq suave">{p.texto}</span>
              <div className="dois">
                <button className="botao seg" disabled={!p.fracao} onClick={() => trocar(registrar(h, new Date(), -h.meta!.passo))}>− {numero(h.meta.passo)}</button>
                <button className="botao" onClick={() => trocar(registrar(h, new Date(), h.meta!.passo))}>+ {numero(h.meta.passo)} {h.meta.unidade}</button>
              </div>
            </>
          ) : (
            <button className={`botao ${feito ? 'seg' : ''}`} onClick={() => trocar(registrar(h, new Date(), feito ? -1 : 1))}>
              {feito ? 'Feito hoje (desfazer)' : 'Marcar feito'}
            </button>
          ))}
      </section>
    )
  }

  return (
    <>
      <div className="cab"><small>Iguais no PC</small><h1>Hábitos</h1></div>
      {erro && <div className="aviso erro">{erro}</div>}
      {lista === null && !erro && <span className="peq cinza">Carregando…</span>}
      {lista && !lista.length && <span className="suave">Nenhum hábito ainda.</span>}
      {deHoje.map(cartao)}
      {outros.length > 0 && (
        <details>
          <summary>Fora de hoje</summary>
          <div style={{ display: 'grid', gap: 12 }}>{outros.map(cartao)}</div>
        </details>
      )}
      <form className="campo" onSubmit={criar}>
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Novo hábito (todo dia)" aria-label="Novo hábito" />
        <button className="botao pequeno" disabled={!nome.trim()}>Criar</button>
      </form>
      <span className="peq cinza">Meta em números, dias e lembrete se ajustam no PC.</span>
    </>
  )
}
