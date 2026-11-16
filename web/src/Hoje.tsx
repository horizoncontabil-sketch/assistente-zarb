import { useEffect, useState } from 'react'
import { somar } from '../../src/shared/alimentacao'
import { metaPassos, treinoDoDia } from '../../src/shared/treino'
import { diaIso, erroLegivel, lerDias, lerRefeicoes, lerSeriesDoDia, salvarDia, type Dia, type Refeicao, type Serie } from './dados'
import type { Aba } from './App'
import { META, fmt, saudacao, dataLonga } from './util'
import { Sono } from './Sono'

export function Hoje({ ir }: { ir: (a: Aba) => void }) {
  const hoje = diaIso()
  const [refeicoes, setRefeicoes] = useState<Refeicao[] | null>(null)
  const [series, setSeries] = useState<Serie[]>([])
  const [dia, setDia] = useState<Dia | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [passos, setPassos] = useState('')

  useEffect(() => {
    Promise.all([lerRefeicoes(hoje), lerSeriesDoDia(hoje), lerDias(hoje)])
      .then(([r, s, d]) => {
        setRefeicoes(r)
        setSeries(s)
        setDia(d[0] ?? null)
        setPassos(d[0]?.passos != null ? String(d[0].passos) : '')
      })
      .catch((e) => setErro(erroLegivel(e)))
  }, [hoje])

  const t = somar((refeicoes ?? []).flatMap((r) => r.itens))
  const falta = META.kcal - t.kcal
  const treino = treinoDoDia(new Date())
  const feitas = series.filter((s) => !s.aquecimento).length
  const total = treino?.exercicios.reduce((n, e) => n + e.series, 0) ?? 0
  const { meta, semana } = metaPassos(new Date())

  async function gravarPassos() {
    const n = Number(passos.replace(/\D/g, ''))
    if (!passos.trim() || !Number.isFinite(n)) return
    try {
      await salvarDia({ dia: hoje, passos: n })
      setDia((d) => ({ dia: hoje, peso: d?.peso ?? null, passos: n }))
    } catch (e) {
      setErro(erroLegivel(e))
    }
  }

  return (
    <>
      <div className="cab">
        <small>{dataLonga(new Date())}</small>
        <h1>{saudacao()}, Paulo</h1>
      </div>
      {erro && <div className="aviso erro">{erro}</div>}
      <Sono />

      <section className="bloco">
        <h2>Comida</h2>
        <div className="linha">
          <span className="grande num">{refeicoes ? fmt(t.kcal) : '–'}</span>
          <span className="cinza num">de {fmt(META.kcal)} kcal</span>
        </div>
        <div className={`medidor ${falta < 0 ? 'passou' : ''}`}><i style={{ width: `${Math.min(100, (t.kcal / META.kcal) * 100)}%` }} /></div>
        <div className="linha peq">
          <span className="suave">Proteína <b className="num" style={{ color: 'var(--texto)' }}>{Math.round(t.p)} g</b> de {META.proteina} g</span>
          <span className="cinza num">{falta >= 0 ? `faltam ${fmt(falta)} kcal` : `passou ${fmt(-falta)} kcal`}</span>
        </div>
        <div className="medidor verde"><i style={{ width: `${Math.min(100, (t.p / META.proteina) * 100)}%` }} /></div>
        <button className="botao seg" onClick={() => ir('comida')}>Registrar refeição</button>
      </section>

      <section className="bloco">
        <h2>Treino de hoje</h2>
        {treino ? (
          <>
            <div className="linha">
              <b style={{ fontSize: 18 }}>{treino.nome}</b>
              <span className="peq" style={{ color: feitas >= total ? 'var(--verde)' : 'var(--suave)' }}>
                {feitas >= total ? 'Feito' : feitas ? `${feitas} de ${total} séries` : 'A fazer'}
              </span>
            </div>
            <span className="peq cinza">{treino.foco} · {total} séries</span>
            {feitas < total && <button className="botao" onClick={() => ir('treino')}>{feitas ? 'Continuar treino' : 'Começar treino'}</button>}
          </>
        ) : (
          <span className="suave">Hoje é descanso. Caminhar conta para os passos.</span>
        )}
      </section>

      <section className="bloco">
        <h2>Passos · semana {semana}</h2>
        <div className="linha">
          <span className="grande num">{dia?.passos != null ? fmt(dia.passos) : '–'}</span>
          <span className="cinza num">meta {fmt(meta)}</span>
        </div>
        <div className="medidor"><i style={{ width: `${Math.min(100, ((dia?.passos ?? 0) / meta) * 100)}%` }} /></div>
        <div className="campo">
          <input inputMode="numeric" placeholder="Passos do Garmin agora" value={passos} onChange={(e) => setPassos(e.target.value)} aria-label="Passos de hoje" />
          <button className="botao pequeno" onClick={gravarPassos}>Salvar</button>
        </div>
      </section>

      <section className="bloco">
        <h2>Peso</h2>
        <div className="linha">
          <span className="grande num">{dia?.peso != null ? `${String(dia.peso).replace('.', ',')} kg` : '–'}</span>
          {dia?.peso == null && <button className="botao pequeno seg" onClick={() => ir('corpo')}>Pesar</button>}
        </div>
      </section>
    </>
  )
}
