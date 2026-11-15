import { useState } from 'react'
import { diaLocal } from '../../../shared/datas'
import { mediaMovel, pesoAlvo, type Plano, type RegistroCorpo } from '../../../shared/plano'
import type { Dados } from '../usarDados'
import { api } from '../util'
import { Apagar, Mensagem, Titulo, Vazio } from './comum'

const br = (n: number, casas = 1) => n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
const dataBr = (dia: string) => dia.split('-').reverse().slice(0, 2).join('/')

export function Corpo({ dados, agora }: { dados: Dados; agora: Date }) {
  const { plano, corpo } = dados.saude
  const hoje = diaLocal(agora)
  const ultimos = [...corpo].reverse()
  const bio = ultimos.find((r) => r.gordura)
  const pressoes = ultimos.filter((r) => r.pressaoSis && r.pressaoDia).slice(0, 5)
  const mediaPressao = pressoes.length ? { s: Math.round(pressoes.reduce((a, r) => a + r.pressaoSis!, 0) / pressoes.length), d: Math.round(pressoes.reduce((a, r) => a + r.pressaoDia!, 0) / pressoes.length) } : null
  const abd = ultimos.find((r) => r.abdomen)

  return (
    <>
      <Titulo titulo="Corpo" sub="Pese-se ao acordar, depois do banheiro. Vale a média da semana." />
      <div className="rolagem">
        <Registrar hoje={hoje} existente={corpo.find((r) => r.dia === hoje)} />

        <section className="cartao" aria-label="Peso">
          <div className="cartao-topo">
            <strong>Peso</strong>
            <span className="meta">pontos: cada pesagem · linha azul: média de 7 dias · tracejada: a meta</span>
          </div>
          {corpo.some((r) => r.peso) || plano ? <Grafico corpo={corpo} plano={plano} hoje={hoje} /> : <p className="nada">Registre o primeiro peso para ver o gráfico.</p>}
        </section>

        <div className="grade-3">
          <section className="cartao">
            <strong>Bioimpedância</strong>
            {bio ? (
              <>
                <span className="numero-grande">{br(bio.gordura!)}%</span>
                <span className="meta">
                  de gordura em {dataBr(bio.dia)}
                  {bio.musculo ? ` · músculo ${br(bio.musculo)}%` : ''}
                  {bio.visceral ? ` · visceral ${br(bio.visceral, 0)}` : ''}
                </span>
              </>
            ) : (
              <p className="nada">Nenhuma ainda. Uma por mês, sempre nas mesmas condições.</p>
            )}
          </section>
          <section className="cartao">
            <strong>Abdômen</strong>
            {abd ? (
              <>
                <span className="numero-grande">{br(abd.abdomen!, 0)} cm</span>
                <span className="meta">em {dataBr(abd.dia)} · medir todo domingo, na altura do umbigo</span>
              </>
            ) : (
              <p className="nada">Meça no domingo de manhã, na altura do umbigo.</p>
            )}
          </section>
          <section className="cartao">
            <strong>Pressão</strong>
            {mediaPressao ? (
              <>
                <span className="numero-grande" style={mediaPressao.s >= 140 || mediaPressao.d >= 90 ? { color: 'var(--ambar)' } : undefined}>
                  {mediaPressao.s} x {mediaPressao.d}
                </span>
                <span className="meta">
                  média das últimas {pressoes.length}
                  {mediaPressao.s >= 140 || mediaPressao.d >= 90 ? '. Acima de 14 por 9: leve essas medidas a um clínico.' : ''}
                </span>
              </>
            ) : (
              <p className="nada">Meça em casa alguns dias, sentado e descansado, e registre aqui.</p>
            )}
          </section>
        </div>

        <section className="cartao" aria-label="Registros">
          <strong style={{ paddingBottom: 4 }}>Registros</strong>
          {ultimos.length ? (
            <table className="tabela">
              <thead>
                <tr>
                  <th>Dia</th>
                  <th className="num">Peso</th>
                  <th className="num">Abdômen</th>
                  <th className="num">Gordura</th>
                  <th className="num">Pressão</th>
                  <th>Treino</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {ultimos.slice(0, 21).map((r) => (
                  <tr key={r.dia}>
                    <td>{dataBr(r.dia)}</td>
                    <td className="num">{r.peso ? `${br(r.peso)} kg` : '—'}</td>
                    <td className="num">{r.abdomen ? `${br(r.abdomen, 0)} cm` : '—'}</td>
                    <td className="num">{r.gordura ? `${br(r.gordura)}%` : '—'}</td>
                    <td className="num">{r.pressaoSis ? `${r.pressaoSis} x ${r.pressaoDia ?? '?'}` : '—'}</td>
                    <td>{r.treino ? 'treinou' : ''}</td>
                    <td style={{ textAlign: 'right' }}>
                      <Apagar rotulo={`Apagar registro de ${dataBr(r.dia)}`} aoConfirmar={() => api.trocarCorpoDoDia(r.dia, null)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Vazio icone="corpo" titulo="Nenhum registro">
              Pode falar também: "pesei 73,2", "treinei hoje", "pressão 12 por 8".
            </Vazio>
          )}
        </section>
      </div>
    </>
  )
}

function Registrar({ hoje, existente }: { hoje: string; existente?: RegistroCorpo }) {
  const [dia, setDia] = useState(hoje)
  const [aberto, setAberto] = useState(false)
  const [f, setF] = useState({ peso: '', abdomen: '', gordura: '', musculo: '', visceral: '', pressaoSis: '', pressaoDia: '' })
  const [treino, setTreino] = useState(!!existente?.treino)
  const [msg, setMsg] = useState<{ t: string; erro?: boolean } | null>(null)
  const n = (s: string) => (s.trim() ? Number(s.replace(',', '.')) : undefined)
  const campo = (k: keyof typeof f, rotulo: string, largura = 100) => (
    <label className="campo-rotulo" style={{ width: largura }}>
      {rotulo}
      <input className="campo-texto" inputMode="decimal" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
    </label>
  )
  return (
    <form
      className="cartao formulario"
      onSubmit={async (e) => {
        e.preventDefault()
        const reg: RegistroCorpo = { dia, treino }
        for (const k of Object.keys(f) as (keyof typeof f)[]) {
          const v = n(f[k])
          if (v !== undefined) (reg as Record<string, unknown>)[k] = v
        }
        const r = await api.registrarCorpo(reg)
        setMsg(r.ok ? { t: 'Registrado.' } : { t: r.erro, erro: true })
        if (r.ok) setF({ peso: '', abdomen: '', gordura: '', musculo: '', visceral: '', pressaoSis: '', pressaoDia: '' })
      }}
    >
      <div className="cartao-topo" style={{ paddingBottom: 0 }}>
        <strong>Registrar</strong>
        <input type="date" className="campo-texto" style={{ height: 30 }} value={dia} max={hoje} onChange={(e) => setDia(e.target.value)} aria-label="Dia" />
      </div>
      <div className="linha-campos" style={{ alignItems: 'flex-end' }}>
        {campo('peso', 'Peso (kg)')}
        {campo('abdomen', 'Abdômen (cm)')}
        {campo('pressaoSis', 'Pressão (máx.)')}
        {campo('pressaoDia', 'Pressão (mín.)')}
        <label className="interruptor" style={{ minHeight: 36, gap: 8 }}>
          <input type="checkbox" checked={treino} onChange={(e) => setTreino(e.target.checked)} />
          <span className="trilho" aria-hidden="true" />
          <span>Treinei</span>
        </label>
      </div>
      {aberto ? (
        <div className="linha-campos" style={{ alignItems: 'flex-end' }}>
          {campo('gordura', 'Gordura (%)')}
          {campo('musculo', 'Músculo (%)')}
          {campo('visceral', 'Visceral')}
        </div>
      ) : (
        <button type="button" className="link" style={{ alignSelf: 'flex-start' }} onClick={() => setAberto(true)}>
          + dados da bioimpedância
        </button>
      )}
      {msg && <Mensagem erro={msg.erro}>{msg.t}</Mensagem>}
      <div className="botoes">
        <button type="submit" className="botao principal">
          Salvar
        </button>
      </div>
    </form>
  )
}

// Peso no tempo: pesagens, média de 7 dias e a linha da meta, na mesma escala.
function Grafico({ corpo, plano, hoje }: { corpo: RegistroCorpo[]; plano: Plano | null; hoje: string }) {
  const pesos = corpo.filter((r) => r.peso)
  const medias = mediaMovel(corpo)
  const dias = [...pesos.map((r) => r.dia), ...(plano ? [plano.inicio, plano.fim] : []), hoje].sort()
  const ini = new Date(`${dias[0]}T12:00`).getTime()
  const fim = Math.max(new Date(`${dias.at(-1)}T12:00`).getTime(), ini + 7 * 86_400_000)
  const valores = [...pesos.map((r) => r.peso!), ...(plano ? [plano.pesoInicial, pesoAlvo(plano)] : [])]
  const max = Math.ceil(Math.max(...valores) + 0.5)
  const min = Math.floor(Math.min(...valores) - 0.5)
  const W = 640
  const H = 200
  const x = (dia: string) => 40 + ((new Date(`${dia}T12:00`).getTime() - ini) / (fim - ini)) * (W - 56)
  const y = (kg: number) => 12 + ((max - kg) / Math.max(1, max - min)) * (H - 40)
  const passos = Math.max(1, Math.round((max - min) / 4))
  const marcas = Array.from({ length: Math.floor((max - min) / passos) + 1 }, (_, i) => max - i * passos)
  return (
    <svg className="grafico" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Gráfico de peso de ${dataBr(dias[0])} a ${dataBr(dias.at(-1)!)}`} style={{ width: '100%', height: 'auto' }}>
      {marcas.map((m) => (
        <g key={m}>
          <line x1={40} x2={W - 16} y1={y(m)} y2={y(m)} stroke="#1d2024" />
          <text x={34} y={y(m) + 4} textAnchor="end">
            {m}
          </text>
        </g>
      ))}
      {plano && <line x1={x(plano.inicio)} y1={y(plano.pesoInicial)} x2={x(plano.fim)} y2={y(pesoAlvo(plano))} stroke="#8ab8ff" strokeDasharray="5 5" strokeWidth={1.5} />}
      {medias.length > 1 && <polyline points={medias.map((m) => `${x(m.dia)},${y(m.media)}`).join(' ')} fill="none" stroke="#4c9aff" strokeWidth={2.5} strokeLinejoin="round" />}
      {pesos.map((r) => (
        <circle key={r.dia} cx={x(r.dia)} cy={y(r.peso!)} r={3} fill="#ffffff" />
      ))}
      <line x1={x(hoje)} x2={x(hoje)} y1={8} y2={H - 26} stroke="#2f333a" />
      {x(hoje) - 40 > 60 && (
        <text x={40} y={H - 8}>
          {dataBr(dias[0])}
        </text>
      )}
      <text x={x(hoje)} y={H - 8} textAnchor="middle">
        hoje
      </text>
      <text x={W - 16} y={H - 8} textAnchor="end">
        {dataBr(dias.at(-1)!)}
      </text>
    </svg>
  )
}
