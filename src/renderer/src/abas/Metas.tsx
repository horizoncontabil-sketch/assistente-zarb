import { useState } from 'react'
import { diaNaMeta, totaisDoDia } from '../../../shared/alimentacao'
import { diaLocal } from '../../../shared/datas'
import { gorduraPeloPeso, marcos, mediaMovel, pesoAlvo, pesoEsperado, resumoSemana, semanasDoPlano, sugerirMetas, type Plano } from '../../../shared/plano'
import { Icone } from '../icones'
import type { Dados } from '../usarDados'
import { api } from '../util'
import { Mensagem, Titulo } from './comum'

const br = (n: number, casas = 1) => n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
const dataBr = (dia: string) => dia.split('-').reverse().slice(0, 2).join('/')

export function Metas({ dados, agora }: { dados: Dados; agora: Date }) {
  const [editando, setEditando] = useState(false)
  const { plano, corpo, refeicoes } = dados.saude
  if (!plano || editando) return <MontarMeta plano={plano} fechar={() => setEditando(false)} />

  const hoje = diaLocal(agora)
  const medias = mediaMovel(corpo)
  const pesoAtual = medias.at(-1)?.media ?? null
  const bio = [...corpo].reverse().find((r) => r.gordura)
  const gorduraAtual = bio && bio.dia >= (medias.at(-1)?.dia ?? '') ? bio.gordura! : pesoAtual ? gorduraPeloPeso(plano, pesoAtual) : plano.gorduraInicial
  const fonteGordura = bio && bio.dia >= (medias.at(-1)?.dia ?? '') ? `bioimpedância de ${dataBr(bio.dia)}` : pesoAtual ? 'estimada pelo peso médio' : 'do começo da meta'
  const caminho = Math.min(1, Math.max(0, (plano.gorduraInicial - gorduraAtual) / (plano.gorduraInicial - plano.gorduraAlvo)))
  const semanasRestantes = Math.max(0, Math.ceil((new Date(`${plano.fim}T12:00`).getTime() - agora.getTime()) / (7 * 86_400_000)))
  const naMeta = (dia: string) => diaNaMeta(totaisDoDia(refeicoes, dia), { kcal: plano.kcal, proteina: plano.proteina })
  const sem = resumoSemana(plano, corpo, naMeta, hoje)
  const mesAtual = marcos(plano).find((m) => m.dia >= hoje) ?? marcos(plano).at(-1)!
  const esperadoHoje = pesoEsperado(plano, hoje)
  const tHoje = totaisDoDia(refeicoes, hoje)
  const regHoje = corpo.find((r) => r.dia === hoje)
  const livres = refeicoes.filter((r) => sem.dias.includes(r.dia) && r.tipo === 'livre').length

  return (
    <>
      <Titulo titulo="Metas" sub={`${br(plano.gorduraAlvo, 0)}% de gordura até ${dataBr(plano.fim)}/${plano.fim.slice(2, 4)} · faltam ${semanasRestantes} ${semanasRestantes === 1 ? 'semana' : 'semanas'}`}>
        <button type="button" className="botao" onClick={() => setEditando(true)}>
          <Icone nome="editar" tamanho={15} /> Editar a meta
        </button>
      </Titulo>
      <div className="rolagem">
        <section className="cartao" aria-label="Meta geral" style={{ gap: 12 }}>
          <div className="cartao-topo" style={{ paddingBottom: 0 }}>
            <strong>Meta geral</strong>
            <span className="meta">
              Gordura agora: {br(gorduraAtual)}% ({fonteGordura})
            </span>
          </div>
          <div className="linha" style={{ gap: 18, alignItems: 'flex-end' }}>
            <span className="numero-grande">{br(plano.gorduraInicial)}%</span>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 8 }}>
              <span className="barra-progresso" style={{ height: 10 }}>
                <span style={{ width: `${Math.round(caminho * 100)}%` }} />
              </span>
              <span className="meta">{Math.round(caminho * 100)}% do caminho</span>
            </div>
            <span className="numero-grande" style={{ color: 'var(--azul-texto)' }}>
              {br(plano.gorduraAlvo, 0)}%
            </span>
          </div>
          <span className="meta">
            Peso: {br(plano.pesoInicial)} kg no começo · {pesoAtual ? `${br(pesoAtual)} kg agora (média de 7 dias)` : 'pese-se para acompanhar'} · alvo {br(pesoAlvo(plano))} kg
          </span>
        </section>

        <div className="grade-3">
          <section className="cartao" aria-label="Este mês">
            <strong>{mesAtual.mes}</strong>
            <span className="meta">Fechar o mês em</span>
            <span className="numero-grande">{br(mesAtual.peso)} kg</span>
            <span className="meta">
              ~{br(mesAtual.gordura)}% de gordura em {dataBr(mesAtual.dia)}
            </span>
            <Ritmo atual={pesoAtual} esperado={esperadoHoje} />
          </section>

          <section className="cartao" aria-label="Esta semana" style={{ gap: 10 }}>
            <strong>
              Semana de {dataBr(sem.dias[0])} a {dataBr(sem.dias[6])}
            </strong>
            <LinhaMeta rotulo="Peso médio" valor={sem.mediaPeso ? `${br(sem.mediaPeso)} kg` : 'sem pesagem'} meta={`alvo ${br(sem.alvoMedia)}`} fracao={sem.mediaPeso ? (sem.mediaPeso <= sem.alvoMedia ? 1 : 0.5) : 0} />
            <LinhaMeta rotulo="Treinos" valor={`${sem.treinos} de ${plano.treinosSemana}`} fracao={sem.treinos / plano.treinosSemana} />
            <LinhaMeta rotulo="Dias na meta (alvo 6)" valor={`${sem.diasNaMeta} de ${sem.diasContados}`} fracao={sem.diasNaMeta / 6} />
            <span className="meta">Refeição livre: {livres ? 'usada' : 'ainda não usada'}</span>
          </section>

          <section className="cartao" aria-label="Hoje" style={{ gap: 10 }}>
            <strong>Hoje</strong>
            <LinhaMeta rotulo="Calorias" valor={`${tHoje.kcal.toLocaleString('pt-BR')} de ${plano.kcal.toLocaleString('pt-BR')}`} fracao={tHoje.kcal / plano.kcal} passou={tHoje.kcal > plano.kcal * 1.05} />
            <LinhaMeta rotulo="Proteína" valor={`${br(tHoje.p, 0)} de ${plano.proteina} g`} fracao={tHoje.p / plano.proteina} />
            <div className="botoes" style={{ flexWrap: 'wrap' }}>
              <button type="button" className={`botao pequeno ${regHoje?.treino ? 'principal' : ''}`} onClick={() => api.registrarCorpo({ dia: hoje, treino: !regHoje?.treino })} aria-pressed={!!regHoje?.treino}>
                {regHoje?.treino ? 'Treinei hoje' : 'Marcar treino'}
              </button>
              <span className="meta">{regHoje?.peso ? `Pesou ${br(regHoje.peso)} kg` : 'Ainda não pesou hoje'}</span>
            </div>
          </section>
        </div>

        <section className="cartao" aria-label="Marcos por mês">
          <strong style={{ paddingBottom: 4 }}>Marcos</strong>
          <table className="tabela">
            <thead>
              <tr>
                <th>Mês</th>
                <th>Até</th>
                <th className="num">Peso-alvo</th>
                <th className="num">Gordura</th>
                <th className="num">Seu peso</th>
              </tr>
            </thead>
            <tbody>
              {marcos(plano).map((m) => {
                const perto = medias.filter((x) => x.dia <= m.dia).at(-1)
                const passou = m.dia < hoje
                return (
                  <tr key={m.dia}>
                    <td>{m.mes}</td>
                    <td>{dataBr(m.dia)}</td>
                    <td className="num">{br(m.peso)} kg</td>
                    <td className="num">~{br(m.gordura)}%</td>
                    <td className="num">
                      {passou && perto ? (
                        <span className={`chip ${perto.media <= m.peso + 0.3 ? 'verde' : 'ambar'}`}>{br(perto.media)} kg</span>
                      ) : m.dia >= hoje && pesoAtual && m === mesAtual ? (
                        <span className="meta">{br(pesoAtual)} kg agora</span>
                      ) : (
                        <span className="meta">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <span className="meta" style={{ paddingTop: 6 }}>
            Peso-alvo em linha reta até {dataBr(plano.fim)}; gordura calculada mantendo a massa magra do começo. Vale a tendência, não um número solto.
          </span>
        </section>
      </div>
    </>
  )
}

function Ritmo({ atual, esperado }: { atual: number | null; esperado: number }) {
  if (!atual) return <span className="meta">Pese-se para ver o ritmo.</span>
  const dif = Math.round((atual - esperado) * 10) / 10
  if (dif <= 0.3) return <span className="chip verde" style={{ alignSelf: 'flex-start' }}>No ritmo{dif < -0.3 ? `, ${br(-dif)} kg à frente` : ''}</span>
  return (
    <span className="chip ambar" style={{ alignSelf: 'flex-start' }}>
      {br(dif)} kg acima do esperado para hoje
    </span>
  )
}

function LinhaMeta({ rotulo, valor, meta, fracao, passou }: { rotulo: string; valor: string; meta?: string; fracao: number; passou?: boolean }) {
  return (
    <div className="barra-meta">
      <div className="linha-valor">
        <span>{rotulo}</span>
        <b>
          {valor}
          {meta && <span className="meta"> · {meta}</span>}
        </b>
      </div>
      <span className={`barra-progresso ${passou ? 'alto' : ''}`}>
        <span style={{ width: `${Math.round(Math.min(1, Math.max(0, fracao)) * 100)}%` }} />
      </span>
    </div>
  )
}

// Primeira vez (ou editar): os dados do Paulo entram aqui e ficam só no PC.
function MontarMeta({ plano, fechar }: { plano: Plano | null; fechar: () => void }) {
  const hoje = diaLocal(new Date())
  const [f, setF] = useState({
    inicio: plano?.inicio ?? hoje,
    fim: plano?.fim ?? '',
    pesoInicial: plano ? String(plano.pesoInicial) : '',
    gorduraInicial: plano ? String(plano.gorduraInicial) : '',
    gorduraAlvo: plano ? String(plano.gorduraAlvo) : '',
    alturaCm: plano ? String(plano.alturaCm) : '',
    idade: plano ? String(plano.idade) : '',
    treinosSemana: String(plano?.treinosSemana ?? 4),
    refeicaoLivreKcal: String(plano?.refeicaoLivreKcal ?? 1100),
  })
  const [metas, setMetas] = useState(plano ? { kcal: String(plano.kcal), proteina: String(plano.proteina), carbo: String(plano.carbo), gordura: String(plano.gordura) } : null)
  const [erro, setErro] = useState<string | null>(null)
  const n = (s: string) => Number(s.replace(',', '.'))
  const base = () => ({ inicio: f.inicio, fim: f.fim, pesoInicial: n(f.pesoInicial), gorduraInicial: n(f.gorduraInicial), gorduraAlvo: n(f.gorduraAlvo), alturaCm: n(f.alturaCm), idade: n(f.idade), treinosSemana: n(f.treinosSemana), refeicaoLivreKcal: n(f.refeicaoLivreKcal) })
  const campo = (k: keyof typeof f, rotulo: string, tipo = 'text', dica?: string) => (
    <label className="campo-rotulo">
      {rotulo}
      <input className="campo-texto" type={tipo} inputMode={tipo === 'text' ? 'decimal' : undefined} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} placeholder={dica} />
    </label>
  )
  return (
    <>
      <Titulo titulo={plano ? 'Editar a meta' : 'Montar minha meta'} sub="Seus números ficam só neste PC. O assistente calcula os marcos e as metas do dia." />
      <div className="rolagem">
        <form
          className="cartao formulario"
          style={{ gap: 14 }}
          onSubmit={async (e) => {
            e.preventDefault()
            const b = base()
            if (!metas) {
              if ([b.pesoInicial, b.gorduraInicial, b.gorduraAlvo, b.alturaCm, b.idade].some((x) => !(x > 0)) || !b.fim) return setErro('Preencha todos os campos.')
              const s = sugerirMetas(b)
              return setMetas({ kcal: String(s.kcal), proteina: String(s.proteina), carbo: String(s.carbo), gordura: String(s.gordura) })
            }
            const r = await api.salvarPlano({ ...b, kcal: n(metas.kcal), proteina: n(metas.proteina), carbo: n(metas.carbo), gordura: n(metas.gordura) })
            if (!r.ok) return setErro(r.erro)
            fechar()
          }}
        >
          <strong>A meta</strong>
          <div className="grade-3">
            {campo('gorduraInicial', 'Gordura hoje (%)', 'text', 'ex.: 23,5')}
            {campo('gorduraAlvo', 'Gordura-alvo (%)', 'text', 'ex.: 15')}
            {campo('fim', 'Até quando', 'date')}
          </div>
          <strong>Você</strong>
          <div className="grade-3">
            {campo('pesoInicial', 'Peso hoje (kg)', 'text', 'ex.: 73,8')}
            {campo('alturaCm', 'Altura (cm)', 'text', 'ex.: 169')}
            {campo('idade', 'Idade', 'text')}
            {campo('treinosSemana', 'Treinos por semana')}
            {campo('refeicaoLivreKcal', 'Refeição livre (kcal)')}
            {campo('inicio', 'Começa em', 'date')}
          </div>
          {metas && (
            <>
              <strong>Metas do dia (sugeridas, pode mudar)</strong>
              <div className="grade-3" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
                {(['kcal', 'proteina', 'carbo', 'gordura'] as const).map((k) => (
                  <label key={k} className="campo-rotulo">
                    {{ kcal: 'Calorias', proteina: 'Proteína (g)', carbo: 'Carboidrato (g)', gordura: 'Gordura (g)' }[k]}
                    <input className="campo-texto" inputMode="numeric" value={metas[k]} onChange={(e) => setMetas({ ...metas, [k]: e.target.value })} />
                  </label>
                ))}
              </div>
              <span className="meta">Gasto estimado pela fórmula de Mifflin-St Jeor para quem treina 3 a 4 vezes; déficit do tamanho que a meta pede, entre 300 e 750 kcal; proteína 2,1 g e gordura 0,8 g por kg. Nunca abaixo de 1.700 kcal.</span>
            </>
          )}
          {erro && <Mensagem erro>{erro}</Mensagem>}
          <div className="botoes">
            <button type="submit" className="botao principal">
              {metas ? 'Salvar a meta' : 'Calcular'}
            </button>
            {plano && (
              <button type="button" className="botao leve" onClick={fechar}>
                Cancelar
              </button>
            )}
            {metas && !plano && (
              <button type="button" className="botao leve" onClick={() => setMetas(null)}>
                Recalcular
              </button>
            )}
          </div>
        </form>
      </div>
    </>
  )
}
