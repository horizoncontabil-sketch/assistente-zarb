import { useEffect, useRef, useState } from 'react'
import { TREINOS, acharTreino, cargaAquecimento, sugerirCarga, treinoDoDia, type Exercicio, type Treino } from '../../src/shared/treino'
import { apagarSerie, diaIso, erroLegivel, lerSeriesDoDia, salvarSerie, ultimaVez, type Serie } from './dados'
import { kgTexto, numero } from './util'

type Linha = { numero: number; aquecimento: boolean; rotulo: string; kg: string; reps: string; feita: boolean; dicaReps: string }

export function TreinoTela() {
  const hoje = diaIso()
  const [treino, setTreino] = useState<Treino | null>(() => treinoDoDia(new Date()))
  const [series, setSeries] = useState<Serie[] | null>(null)
  const [aberto, setAberto] = useState<number | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [fimDescanso, setFimDescanso] = useState<number | null>(null)

  useEffect(() => {
    lerSeriesDoDia(hoje)
      .then((s) => {
        setSeries(s)
        // Se já começou outro treino hoje, abre esse.
        const outro = s.find((x) => x.treino !== treino?.id)
        if (s.length && outro && !s.some((x) => x.treino === treino?.id)) setTreino(acharTreino(outro.treino))
      })
      .catch((e) => setErro(erroLegivel(e)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoje])

  if (!treino)
    return (
      <>
        <div className="cab"><small>Hoje é descanso</small><h1>Escolha um treino</h1></div>
        <span className="suave peq">Segunda, terça, quinta e sábado o treino abre sozinho. Hoje, só se você quiser repor um dia.</span>
        <div className="exs">
          {TREINOS.map((t) => (
            <button key={t.id} className="ex" onClick={() => setTreino(t)}>
              <span className="bola">›</span><div><b>{t.nome}</b><small>{t.foco}</small></div><span />
            </button>
          ))}
        </div>
      </>
    )

  const doTreino = (series ?? []).filter((s) => s.treino === treino.id)
  const feitasDe = (ex: Exercicio) => doTreino.filter((s) => s.exercicio === ex.id && !s.aquecimento).length
  const atual = treino.exercicios.findIndex((ex) => feitasDe(ex) < ex.series)

  const aoMudar = (s: Serie, remover: boolean) =>
    setSeries((lista) => {
      const sem = (lista ?? []).filter((x) => !(x.exercicio === s.exercicio && x.numero === s.numero && x.aquecimento === s.aquecimento))
      return remover ? sem : [...sem, s]
    })

  return (
    <>
      {aberto === null ? (
        <>
          <div className="cab"><small>{treino.foco}</small><h1>{treino.nome}</h1></div>
          {erro && <div className="aviso erro">{erro}</div>}
          <details>
            <summary>Antes de começar · 5 min</summary>
            <ul>{treino.antes.map((a) => <li key={a}>{a}</li>)}</ul>
          </details>
          <div className="exs">
            {treino.exercicios.map((ex, i) => {
              const f = feitasDe(ex)
              const ok = f >= ex.series
              return (
                <button key={ex.id} className={`ex ${ok ? 'ok' : i === atual ? 'agora' : ''}`} onClick={() => setAberto(i)}>
                  <span className="bola">{ok ? '✓' : i + 1}</span>
                  <div><b>{ex.nome}</b><small>{ex.series} x {ex.faixa[0]}-{ex.faixa[1]}{ex.porLado ? ' cada perna' : ''} · {ex.descansoTexto}</small></div>
                  <span className="ser num">{f}/{ex.series}</span>
                </button>
              )
            })}
          </div>
          {atual === -1 && series !== null && <div className="aviso">Treino completo. Bom trabalho.</div>}
          <details>
            <summary>Trocar o treino de hoje</summary>
            <ul style={{ listStyle: 'none', paddingLeft: 14 }}>
              {TREINOS.filter((t) => t.id !== treino.id).map((t) => (
                <li key={t.id}><button className="link" onClick={() => setTreino(t)}>{t.nome} · {t.foco}</button></li>
              ))}
            </ul>
          </details>
        </>
      ) : (
        <ExercicioTela
          key={treino.exercicios[aberto].id}
          treino={treino}
          indice={aberto}
          feitas={doTreino.filter((s) => s.exercicio === treino.exercicios[aberto].id)}
          voltar={() => setAberto(null)}
          proximo={aberto < treino.exercicios.length - 1 ? () => setAberto(aberto + 1) : null}
          aoMudar={aoMudar}
          descansar={(seg) => setFimDescanso(seg > 0 ? Date.now() + seg * 1000 : null)}
        />
      )}
      {fimDescanso && <Descanso fim={fimDescanso} mudar={setFimDescanso} />}
    </>
  )
}

function ExercicioTela(props: {
  treino: Treino
  indice: number
  feitas: Serie[]
  voltar: () => void
  proximo: (() => void) | null
  aoMudar: (s: Serie, remover: boolean) => void
  descansar: (seg: number) => void
}) {
  const { treino, indice, feitas } = props
  const ex = treino.exercicios[indice]
  const hoje = diaIso()
  const [ultima, setUltima] = useState<{ dia: string; series: Serie[] } | null | undefined>(undefined)
  const [linhas, setLinhas] = useState<Linha[]>([])
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    ultimaVez(ex.id, hoje)
      .then((u) => setUltima(u))
      .catch(() => setUltima(null))
  }, [ex.id, hoje])

  const sugestao = ultima ? sugerirCarga(ex, ultima.series) : null

  // Monta as linhas quando a última vez chega: carga sugerida ou a já feita hoje.
  useEffect(() => {
    if (ultima === undefined) return
    const feitaHoje = (n: number, aq: boolean) => feitas.find((s) => s.numero === n && s.aquecimento === aq)
    const base = sugestao?.kg ?? null
    const reps = `${ex.faixa[0]}-${ex.faixa[1]}`
    setLinhas([
      ...ex.aquecimento.map((a, i): Linha => {
        const f = feitaHoje(i + 1, true)
        const kg = f?.kg ?? cargaAquecimento(base, a.pct)
        return { numero: i + 1, aquecimento: true, rotulo: a.pct === 0 ? 'Barra' : `Aq. ${a.pct}%`, kg: kg != null ? kgTexto(kg) : '', reps: String(f?.reps ?? a.reps), feita: !!f, dicaReps: String(a.reps) }
      }),
      ...Array.from({ length: ex.series }, (_, i): Linha => {
        const f = feitaHoje(i + 1, false)
        return { numero: i + 1, aquecimento: false, rotulo: `Série ${i + 1}`, kg: f?.kg != null ? kgTexto(f.kg) : base != null ? kgTexto(base) : '', reps: f?.reps != null ? String(f.reps) : '', feita: !!f, dicaReps: reps }
      }),
    ])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ultima])

  const mudar = (i: number, campo: 'kg' | 'reps', v: string) =>
    setLinhas((ls) =>
      ls.map((l, j) => {
        if (j === i) return { ...l, [campo]: v }
        // A carga digitada numa série de trabalho desce para as seguintes ainda não feitas.
        if (campo === 'kg' && !ls[i].aquecimento && !l.aquecimento && j > i && !l.feita) return { ...l, kg: v }
        return l
      }),
    )

  async function marcar(i: number) {
    const l = linhas[i]
    setErro(null)
    const kg = numero(l.kg)
    const reps = numero(l.reps || (l.aquecimento ? l.dicaReps : String(ex.faixa[1])))
    const s = { dia: hoje, treino: treino.id, exercicio: ex.id, numero: l.numero, aquecimento: l.aquecimento, kg, reps: reps != null ? Math.round(reps) : null }
    try {
      if (l.feita) {
        await apagarSerie(hoje, ex.id, l.numero, l.aquecimento)
        props.aoMudar({ ...s, id: '' }, true)
        setLinhas((ls) => ls.map((x, j) => (j === i ? { ...x, feita: false } : x)))
        return
      }
      await salvarSerie(s)
      props.aoMudar({ ...s, id: '' }, false)
      setLinhas((ls) => ls.map((x, j) => (j === i ? { ...x, feita: true, reps: String(s.reps ?? '') } : x)))
      const restam = linhas.filter((x, j) => j !== i && !x.feita && !x.aquecimento).length
      if (!l.aquecimento && restam > 0) props.descansar(ex.descanso)
      if (!l.aquecimento && restam === 0) props.descansar(0)
    } catch (e) {
      setErro(erroLegivel(e))
    }
  }

  const trabalho = linhas.filter((l) => !l.aquecimento)
  const todas = trabalho.length > 0 && trabalho.every((l) => l.feita)
  const fechouTopo = todas && trabalho.every((l) => (numero(l.reps) ?? 0) >= ex.faixa[1])

  return (
    <>
      <button className="link" onClick={props.voltar}>‹ {treino.nome}</button>
      <div className="cab"><small>{indice + 1} de {treino.exercicios.length}</small><h1>{ex.nome}</h1></div>
      <div className="linha peq">
        <span className="suave">{ex.series} x {ex.faixa[0]}-{ex.faixa[1]}{ex.porLado ? ' cada perna' : ''} · descanso {ex.descansoTexto}</span>
      </div>
      <div className="peq cinza">
        {ultima === undefined
          ? 'Buscando a última vez…'
          : ultima
            ? `Última vez (${ultima.dia.slice(8, 10)}/${ultima.dia.slice(5, 7)}): ${ultima.series.map((s) => `${s.kg != null ? kgTexto(s.kg) : '?'} kg x ${s.reps ?? '?'}`).join(', ')}`
            : 'Primeira vez: anote a carga que usar.'}
      </div>
      {sugestao?.subir && <div className="aviso">Você fechou o topo da faixa da última vez. Hoje: {kgTexto(sugestao.kg)} kg.</div>}
      <details>
        <summary>Como fazer</summary>
        <ul>{ex.dicas.map((d) => <li key={d}>{d}</li>)}</ul>
      </details>
      {erro && <div className="aviso erro">{erro}</div>}
      <div className="series">
        <div className="serie titulo"><span /><span>kg</span><span>reps</span><span /></div>
        {linhas.map((l, i) => (
          <div key={`${l.aquecimento}-${l.numero}`} className={`serie ${l.aquecimento ? 'aq' : ''}`}>
            <span className="nome">{l.rotulo}</span>
            <input inputMode="decimal" value={l.kg} placeholder="kg" onChange={(e) => mudar(i, 'kg', e.target.value)} aria-label={`Carga, ${l.rotulo}`} />
            <input inputMode="numeric" value={l.reps} placeholder={l.dicaReps} onChange={(e) => mudar(i, 'reps', e.target.value)} aria-label={`Repetições, ${l.rotulo}`} />
            <button className={`check ${l.feita ? 'ok' : ''}`} onClick={() => marcar(i)} aria-label={l.feita ? `Desmarcar ${l.rotulo}` : `Marcar ${l.rotulo} feita`}>✓</button>
          </div>
        ))}
      </div>
      {fechouTopo && ex.passo > 0 && <div className="aviso">Fechou todas no topo da faixa. Na próxima vez o app sugere {kgTexto((numero(trabalho[0].kg) ?? 0) + ex.passo)} kg.</div>}
      {todas && (props.proximo ? <button className="botao" onClick={props.proximo}>Próximo exercício</button> : <button className="botao" onClick={props.voltar}>Ver o treino</button>)}
    </>
  )
}

function Descanso({ fim, mudar }: { fim: number; mudar: (f: number | null) => void }) {
  const [agora, setAgora] = useState(Date.now())
  const tocou = useRef(false)
  useEffect(() => {
    tocou.current = false
    const t = setInterval(() => setAgora(Date.now()), 250)
    return () => clearInterval(t)
  }, [fim])
  const resta = Math.max(0, Math.ceil((fim - agora) / 1000))
  useEffect(() => {
    if (resta === 0 && !tocou.current) {
      tocou.current = true
      apitar()
      const t = setTimeout(() => mudar(null), 4000)
      return () => clearTimeout(t)
    }
  }, [resta, mudar])
  return (
    <div className="descanso" role="timer" aria-live="polite">
      <div className="linha peq"><span className="suave">Descanso</span><span className="cinza">{resta === 0 ? 'Próxima série' : ''}</span></div>
      <div className="relogio">{Math.floor(resta / 60)}:{String(resta % 60).padStart(2, '0')}</div>
      <div className="dois">
        <button className="botao seg" onClick={() => mudar(Math.max(fim, Date.now()) + 30000)}>+30 s</button>
        <button className="botao" onClick={() => mudar(null)}>{resta === 0 ? 'Fechar' : 'Pular'}</button>
      </div>
    </div>
  )
}

// O iPhone não vibra pela página; no fim do descanso toca um bipe curto (se o som estiver ligado).
function apitar() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    ;[0, 0.25].forEach((t) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.frequency.value = 880
      g.gain.setValueAtTime(0.25, ctx.currentTime + t)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2)
      o.connect(g).connect(ctx.destination)
      o.start(ctx.currentTime + t)
      o.stop(ctx.currentTime + t + 0.2)
    })
  } catch {
    // sem som: o relógio na tela continua avisando
  }
}
