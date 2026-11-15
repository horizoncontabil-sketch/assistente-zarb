import { useState } from 'react'
import { descreverDias, descreverLembrete, ehDiaDele, feitoNoDia, numero, progresso, semana, sequencia, TODO_DIA, type Habito } from '../../../shared/habitos'
import type { NovoHabito } from '../../../shared/tipos'
import { Icone } from '../icones'
import { api } from '../util'
import { Apagar, Mensagem, Titulo, Vazio } from './comum'

const LETRAS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

export function Habitos({ habitos, agora }: { habitos: Habito[]; agora: Date }) {
  const [visao, setVisao] = useState<'dia' | 'semana'>('dia')
  const [editando, setEditando] = useState<Habito | 'novo' | null>(null)
  const deHoje = habitos.filter((h) => ehDiaDele(h, agora))
  const faltam = deHoje.filter((h) => !feitoNoDia(h, agora))
  const sub = !habitos.length
    ? 'Marque o que faz todo dia e acompanhe a sequência.'
    : `${deHoje.length - faltam.length} de ${deHoje.length} hoje.${
        faltam.length
          ? ` Faltam ${faltam
              .slice(0, 2)
              .map((h) => (h.meta ? `${numero(Math.max(0, h.meta.total - (h.registro[chaveDia(agora)] ?? 0)))} ${h.meta.unidade} de ${h.nome.toLowerCase()}` : h.nome.toLowerCase()))
              .join(' e ')}.`
          : ' Tudo feito.'
      }`

  return (
    <>
      <Titulo titulo="Hábitos" sub={sub}>
        <div className="segmentos" role="tablist" aria-label="Visão">
          <button type="button" role="tab" aria-selected={visao === 'dia'} className={visao === 'dia' ? 'ativo' : ''} onClick={() => setVisao('dia')}>
            Dia
          </button>
          <button type="button" role="tab" aria-selected={visao === 'semana'} className={visao === 'semana' ? 'ativo' : ''} onClick={() => setVisao('semana')}>
            Semana
          </button>
        </div>
        <button type="button" className="botao principal alto" onClick={() => setEditando('novo')}>
          <Icone nome="mais" tamanho={16} /> Novo hábito
        </button>
      </Titulo>

      <div className="rolagem">
        {editando && <FormHabito habito={editando === 'novo' ? null : editando} fechar={() => setEditando(null)} />}
        {!habitos.length && !editando && (
          <Vazio icone="habito" titulo="Nenhum hábito ainda">
            Pode ser de sim ou não ("revisar o Health Score") ou com quantidade ("2 litros de água", "30 minutos de caminhada"). Depois é só falar: "bebi 500 ml".
          </Vazio>
        )}
        {visao === 'dia' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...deHoje, ...habitos.filter((h) => !ehDiaDele(h, agora))].map((h) => (
              <LinhaDia key={h.id} h={h} agora={agora} editar={() => setEditando(h)} />
            ))}
          </div>
        ) : (
          habitos.length > 0 && <Semana habitos={habitos} agora={agora} editar={setEditando} />
        )}
      </div>
    </>
  )
}

const dias = (n: number) => `${n} ${n === 1 ? 'dia' : 'dias'}`
// "1 páginas" vira "1 página"; unidades curtas (L, min, ml) ficam como estão.
export const unidade = (n: number, u: string) => (n === 1 && u.length > 3 && u.endsWith('s') ? u.slice(0, -1) : u)

const chaveDia = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function LinhaDia({ h, agora, editar }: { h: Habito; agora: Date; editar: () => void }) {
  const hoje = ehDiaDele(h, agora)
  const feito = feitoNoDia(h, agora)
  const p = progresso(h, agora)
  const meta = [descreverDias(h.dias), hoje ? descreverLembrete(h.lembrete) : 'hoje não é dia'].filter(Boolean).join(' · ')
  return (
    <div className="linha" style={{ minHeight: 66, padding: '0 18px', borderRadius: 16, background: 'var(--painel)', opacity: hoje ? 1 : 0.5 }}>
      {hoje && !h.meta ? (
        <button type="button" className={`marcar ${feito ? 'feito' : ''}`} style={{ width: 26, height: 26, borderRadius: 8 }} aria-label={feito ? `Desmarcar ${h.nome}` : `Marcar ${h.nome}`} onClick={() => api.registrarHabito(h.id, feito ? -1 : 1)}>
          {feito && <Icone nome="check" tamanho={14} />}
        </button>
      ) : (
        <span className={`marcar ${feito ? 'feito' : ''}`} style={{ width: 26, height: 26, borderRadius: 8, borderColor: hoje ? undefined : 'transparent' }} aria-hidden="true">
          {feito && <Icone nome="check" tamanho={14} />}
        </span>
      )}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ color: feito ? 'var(--suave)' : undefined }}>{h.nome}</span>
        <span className="meta">{meta}</span>
      </div>
      {hoje && h.meta && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 170 }}>
            <span style={{ fontSize: 13, textAlign: 'right' }}>{p.texto}</span>
            <span className="barra-progresso">
              <span style={{ width: `${Math.round(p.fracao * 100)}%` }} />
            </span>
          </div>
          <button type="button" className="redondo" style={{ width: 32, height: 32 }} aria-label={`Tirar ${numero(h.meta.passo)} ${h.meta.unidade}`} onClick={() => api.registrarHabito(h.id, -h.meta!.passo)}>
            −
          </button>
          <button type="button" className="botao" style={{ height: 32 }} onClick={() => api.registrarHabito(h.id, h.meta!.passo)}>
            + {numero(h.meta.passo)} {unidade(h.meta.passo, h.meta.unidade)}
          </button>
        </div>
      )}
      <span className="acoes">
        <button type="button" className="icone" onClick={editar} aria-label={`Editar ${h.nome}`}>
          <Icone nome="editar" tamanho={16} />
        </button>
      </span>
      <span style={{ width: 70, textAlign: 'right', fontSize: 13, color: 'var(--suave)' }}>
        {dias(sequencia(h, agora))}
      </span>
    </div>
  )
}

function Semana({ habitos, agora, editar }: { habitos: Habito[]; agora: Date; editar: (h: Habito) => void }) {
  const s0 = semana(habitos[0], agora)
  const inicio = s0[0].data
  const fim = s0[6].data
  const hojeIdx = s0.findIndex((d) => d.data.toDateString() === agora.toDateString())
  return (
    <section className="cartao" aria-label="Semana dos hábitos">
      <div className="semana-cab meta" style={{ height: 36 }}>
        <span style={{ flex: 1 }}>
          Esta semana · {inicio.getDate()}/{inicio.getMonth() + 1} a {fim.getDate()}/{fim.getMonth() + 1}
        </span>
        <div className="semana-dias">
          {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((l, i) => (
            <span key={i} style={{ color: i === hojeIdx ? '#fff' : undefined, fontWeight: i === hojeIdx ? 600 : undefined, height: 'auto' }}>
              {l}
            </span>
          ))}
        </div>
        <span style={{ width: 84, textAlign: 'right' }}>Sequência</span>
      </div>
      {habitos.map((h) => (
        <div key={h.id} className="semana-linha linha" style={{ minHeight: 58 }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span>{h.nome}</span>
            <span className="meta">{[descreverDias(h.dias), descreverLembrete(h.lembrete)].filter(Boolean).join(' · ')}</span>
          </div>
          <span className="acoes">
            <button type="button" className="icone" onClick={() => editar(h)} aria-label={`Editar ${h.nome}`}>
              <Icone nome="editar" tamanho={16} />
            </button>
          </span>
          <div className="semana-dias" role="img" aria-label={`Semana de ${h.nome}`}>
            {semana(h, agora).map((d, i) => (
              <span key={i} className={d.estado === 'feito' ? 'dia-feito' : d.estado === 'perdido' ? 'dia-perdido' : d.estado === 'pendente' ? 'dia-pendente' : ''}>
                {d.estado === 'fora' ? '–' : ''}
              </span>
            ))}
          </div>
          <span style={{ width: 84, textAlign: 'right' }}>{dias(sequencia(h, agora))}</span>
        </div>
      ))}
    </section>
  )
}

function FormHabito({ habito, fechar }: { habito: Habito | null; fechar: () => void }) {
  const [nome, setNome] = useState(habito?.nome ?? '')
  const [dias, setDias] = useState<number[]>(habito?.dias ?? TODO_DIA)
  const [tipo, setTipo] = useState<'sim' | 'quantidade'>(habito?.meta ? 'quantidade' : 'sim')
  const [total, setTotal] = useState(String(habito?.meta?.total ?? ''))
  const [unidade, setUnidade] = useState(habito?.meta?.unidade ?? '')
  const [passo, setPasso] = useState(String(habito?.meta?.passo ?? ''))
  const [lembrete, setLembrete] = useState<'nenhum' | 'hora' | 'intervalo'>(habito?.lembrete?.tipo ?? 'nenhum')
  const [horaL, setHoraL] = useState(habito?.lembrete?.tipo === 'hora' ? habito.lembrete.hora : '09:00')
  const [cada, setCada] = useState(habito?.lembrete?.tipo === 'intervalo' ? String(habito.lembrete.aCadaMin / 60) : '2')
  const [erro, setErro] = useState<string | null>(null)
  const num = (s: string) => Number(s.replace(',', '.'))

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    const novo: NovoHabito = {
      nome,
      dias,
      meta: tipo === 'quantidade' ? { total: num(total), unidade, passo: num(passo) || num(total) } : null,
      lembrete: lembrete === 'hora' ? { tipo: 'hora', hora: horaL } : lembrete === 'intervalo' ? { tipo: 'intervalo', aCadaMin: Math.round(num(cada) * 60), de: '08:00', ate: '20:00' } : null,
    }
    if (tipo === 'quantidade' && !(num(total) > 0)) return setErro('Diga a meta do dia, por exemplo 2 (litros) ou 30 (minutos).')
    const r = await api.salvarHabito(novo, habito?.id)
    if (!r.ok) return setErro(r.erro)
    fechar()
  }

  return (
    <form className="cartao formulario" onSubmit={salvar} style={{ gap: 12 }}>
      <strong>{habito ? 'Editar hábito' : 'Novo hábito'}</strong>
      <input className="campo-texto" value={nome} onChange={(e) => setNome(e.target.value)} placeholder='Nome, ex.: "Beber água"' aria-label="Nome do hábito" autoFocus />
      <div className="linha-campos" style={{ alignItems: 'center' }}>
        <div className="segmentos" role="radiogroup" aria-label="Tipo">
          <button type="button" role="radio" aria-checked={tipo === 'sim'} className={tipo === 'sim' ? 'ativo' : ''} onClick={() => setTipo('sim')}>
            Sim ou não
          </button>
          <button type="button" role="radio" aria-checked={tipo === 'quantidade'} className={tipo === 'quantidade' ? 'ativo' : ''} onClick={() => setTipo('quantidade')}>
            Com quantidade
          </button>
        </div>
        {tipo === 'quantidade' && (
          <>
            <input className="campo-texto" style={{ width: 80, flex: 'none' }} value={total} onChange={(e) => setTotal(e.target.value)} placeholder="Meta" aria-label="Meta do dia" inputMode="decimal" />
            <input className="campo-texto" style={{ width: 110, flex: 'none' }} value={unidade} onChange={(e) => setUnidade(e.target.value)} placeholder="L, min, páginas" aria-label="Unidade" />
            <input className="campo-texto" style={{ width: 120, flex: 'none' }} value={passo} onChange={(e) => setPasso(e.target.value)} placeholder="Botão soma" aria-label="Quanto cada toque soma" inputMode="decimal" />
          </>
        )}
      </div>
      <div className="linha-campos" style={{ alignItems: 'center' }}>
        <div className="dias-escolha" role="group" aria-label="Dias">
          {LETRAS.map((l, d) => (
            <button key={d} type="button" aria-pressed={dias.includes(d)} className={dias.includes(d) ? 'ativo' : ''} onClick={() => setDias((x) => (x.includes(d) ? x.filter((y) => y !== d) : [...x, d]))}>
              {l}
            </button>
          ))}
        </div>
        <button type="button" className="link" onClick={() => setDias(TODO_DIA)}>
          Todo dia
        </button>
        <button type="button" className="link" onClick={() => setDias([1, 2, 3, 4, 5])}>
          Dias úteis
        </button>
      </div>
      <div className="linha-campos" style={{ alignItems: 'center' }}>
        <select className="selecao" value={lembrete} onChange={(e) => setLembrete(e.target.value as typeof lembrete)} aria-label="Lembrete">
          <option value="nenhum">Sem lembrete</option>
          <option value="hora">Lembrar num horário</option>
          <option value="intervalo">Lembrar a cada tantas horas</option>
        </select>
        {lembrete === 'hora' && <input type="time" className="campo-texto" style={{ width: 110, flex: 'none' }} value={horaL} onChange={(e) => setHoraL(e.target.value)} aria-label="Horário" />}
        {lembrete === 'intervalo' && (
          <>
            <input className="campo-texto" style={{ width: 70, flex: 'none' }} value={cada} onChange={(e) => setCada(e.target.value)} aria-label="A cada quantas horas" inputMode="decimal" />
            <span className="meta">horas, das 8h às 20h</span>
          </>
        )}
      </div>
      {erro && <Mensagem erro>{erro}</Mensagem>}
      <div className="botoes">
        <button type="submit" className="botao principal" disabled={!nome.trim() || !dias.length}>
          Salvar
        </button>
        <button type="button" className="botao leve" onClick={fechar}>
          Cancelar
        </button>
        {habito && (
          <span style={{ marginLeft: 'auto' }}>
            <Apagar
              rotulo="Apagar hábito"
              aoConfirmar={() => {
                api.apagarHabito(habito.id)
                fechar()
              }}
            />
          </span>
        )}
      </div>
    </form>
  )
}
