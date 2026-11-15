import { useEffect, useState } from 'react'
import { diaIso, erroLegivel, lerDias, salvarDia, type Dia } from './dados'
import { kgTexto, numero } from './util'

const menosDias = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return diaIso(d)
}

// Média dos pesos dos 7 dias até `ate` (inclusive). Pesagem de um dia sozinho oscila; a média é o que conta.
export function mediaSemana(dias: Dia[], ate: string): number | null {
  const d = new Date(`${ate}T12:00:00`)
  d.setDate(d.getDate() - 6)
  const inicio = diaIso(d)
  const p = dias.filter((x) => x.peso != null && x.dia >= inicio && x.dia <= ate).map((x) => Number(x.peso))
  return p.length ? p.reduce((a, b) => a + b, 0) / p.length : null
}

export function Corpo() {
  const hoje = diaIso()
  const [dias, setDias] = useState<Dia[] | null>(null)
  const [peso, setPeso] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [salvo, setSalvo] = useState(false)

  useEffect(() => {
    lerDias(menosDias(60))
      .then((d) => {
        setDias(d)
        const h = d.find((x) => x.dia === hoje)
        if (h?.peso != null) setPeso(kgTexto(Number(h.peso)))
      })
      .catch((e) => setErro(erroLegivel(e)))
  }, [hoje])

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    const n = numero(peso)
    if (n == null || n < 30 || n > 250) return setErro('Confira o peso: use o formato 73,8.')
    setErro(null)
    try {
      await salvarDia({ dia: hoje, peso: n })
      setDias((ds) => [...(ds ?? []).filter((x) => x.dia !== hoje), { dia: hoje, peso: n, passos: ds?.find((x) => x.dia === hoje)?.passos ?? null }].sort((a, b) => a.dia.localeCompare(b.dia)))
      setSalvo(true)
    } catch (err) {
      setErro(erroLegivel(err))
    }
  }

  const comPeso = (dias ?? []).filter((d) => d.peso != null)
  const media = dias ? mediaSemana(dias, hoje) : null
  const mediaAntes = dias ? mediaSemana(dias, menosDias(7)) : null

  return (
    <>
      <div className="cab"><small>Meta: 15% de gordura até 28/02</small><h1>Corpo</h1></div>
      {erro && <div className="aviso erro">{erro}</div>}
      <form className="bloco" onSubmit={salvar}>
        <h2>Peso de hoje</h2>
        <span className="peq cinza">De manhã, em jejum, depois do banheiro.</span>
        <div className="campo">
          <input inputMode="decimal" value={peso} onChange={(e) => { setPeso(e.target.value); setSalvo(false) }} placeholder="74,0" aria-label="Peso em kg" />
          <span className="cinza">kg</span>
          <button className="botao pequeno">{salvo ? 'Salvo' : 'Salvar'}</button>
        </div>
      </form>

      <section className="bloco">
        <h2>Média dos últimos 7 dias</h2>
        <div className="linha">
          <span className="grande num">{media != null ? `${kgTexto(Math.round(media * 10) / 10)} kg` : '–'}</span>
          {media != null && mediaAntes != null && (
            <span className="num" style={{ color: media <= mediaAntes ? 'var(--verde)' : 'var(--ambar)' }}>
              {media <= mediaAntes ? '−' : '+'}{kgTexto(Math.abs(Math.round((media - mediaAntes) * 10) / 10))} kg na semana
            </span>
          )}
        </div>
        <span className="peq cinza">Meta: cair perto de 0,5 kg por semana. Depois de 2 semanas a gente confere se ajusta a comida.</span>
        {comPeso.length >= 2 && <Grafico dias={comPeso} />}
      </section>

      <section className="bloco">
        <h2>Pesagens</h2>
        <div className="lista-dia">
          {!comPeso.length && <span className="vazio">Nenhuma pesagem ainda.</span>}
          {[...comPeso].reverse().slice(0, 14).map((d) => (
            <div key={d.dia}><span>{d.dia.slice(8, 10)}/{d.dia.slice(5, 7)}</span><span className="num">{kgTexto(Number(d.peso))} kg</span></div>
          ))}
        </div>
      </section>
    </>
  )
}

function Grafico({ dias }: { dias: Dia[] }) {
  const L = 320, A = 110, m = 8
  const pesos = dias.map((d) => Number(d.peso))
  const min = Math.min(...pesos) - 0.3, max = Math.max(...pesos) + 0.3
  const x = (i: number) => m + (i * (L - 2 * m)) / (dias.length - 1)
  const y = (p: number) => m + ((max - p) * (A - 2 * m)) / (max - min)
  const pontos = dias.map((d, i) => `${x(i).toFixed(1)},${y(Number(d.peso)).toFixed(1)}`).join(' ')
  return (
    <svg className="grafico" viewBox={`0 0 ${L} ${A}`} role="img" aria-label={`Peso de ${kgTexto(pesos[0])} a ${kgTexto(pesos[pesos.length - 1])} kg`}>
      <polyline points={pontos} fill="none" stroke="var(--azul)" strokeWidth="2" strokeLinejoin="round" />
      <circle cx={x(dias.length - 1)} cy={y(pesos[pesos.length - 1])} r="4" fill="var(--azul)" />
    </svg>
  )
}
