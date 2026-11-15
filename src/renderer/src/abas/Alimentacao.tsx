import { useMemo, useState } from 'react'
import { ALIMENTOS_TACO, buscarAlimentos, item, somar, TIPOS, totaisDoDia, type Alimento, type ItemRefeicao, type TipoRefeicao } from '../../../shared/alimentacao'
import { diaLocal } from '../../../shared/datas'
import type { Aba, RascunhoRefeicao, Refeicao } from '../../../shared/tipos'
import { Icone } from '../icones'
import type { Dados } from '../usarDados'
import { api } from '../util'
import { Apagar, Mensagem, Titulo, Vazio } from './comum'

const br = (n: number, casas = 0) => n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
const nomeTipo = (t: TipoRefeicao) => TIPOS.find((x) => x.id === t)?.nome ?? t
const somarDias = (dia: string, n: number) => {
  const d = new Date(`${dia}T12:00`)
  d.setDate(d.getDate() + n)
  return diaLocal(d)
}

export function usarBase(meus: Alimento[]) {
  return useMemo(() => [...meus, ...ALIMENTOS_TACO], [meus])
}

export function Alimentacao({ dados, agora, irPara }: { dados: Dados; agora: Date; irPara: (a: Aba) => void }) {
  const { plano, refeicoes, receitas, alimentosMeus } = dados.saude
  const hoje = diaLocal(agora)
  const [dia, setDia] = useState(hoje)
  const [rascunho, setRascunho] = useState<{ r: RascunhoRefeicao; id?: string } | null>(null)
  const [texto, setTexto] = useState('')
  const [montando, setMontando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [novoAlimento, setNovoAlimento] = useState(false)
  const base = usarBase(alimentosMeus)
  const doDia = refeicoes.filter((r) => r.dia === dia).sort((a, b) => TIPOS.findIndex((t) => t.id === a.tipo) - TIPOS.findIndex((t) => t.id === b.tipo) || a.em.localeCompare(b.em))
  const t = totaisDoDia(refeicoes, dia)
  const porId = new Map(base.map((a) => [a.id, a]))

  const montar = async () => {
    if (!texto.trim()) return
    setMontando(true)
    setErro(null)
    const r = await api.interpretarRefeicao(texto, dia)
    setMontando(false)
    if (!r.ok) return setErro(r.erro)
    setRascunho({ r: r.rascunho })
    setTexto('')
  }

  const editar = (ref: Refeicao) =>
    setRascunho({
      id: ref.id,
      r: { tipo: ref.tipo, dia: ref.dia, itens: ref.itens.map((i) => ({ nome: i.nome, gramas: i.gramas, alimento: porId.get(i.alimentoId) ?? { id: i.alimentoId, nome: i.nome, fonte: 'meu', kcal: (i.kcal / i.gramas) * 100, p: (i.p / i.gramas) * 100, c: (i.c / i.gramas) * 100, g: (i.g / i.gramas) * 100, fibra: (i.fibra / i.gramas) * 100 }, sugestoes: [] })) },
    })

  const faltaKcal = plano ? plano.kcal - t.kcal : null
  const faltaP = plano ? plano.proteina - t.p : null
  const sub =
    faltaKcal === null
      ? 'Monte sua meta para ver quanto falta.'
      : faltaKcal >= 0
        ? `Cabem mais ${br(faltaKcal)} kcal${faltaP! > 0 ? ` e faltam ${br(faltaP!)} g de proteína` : ', proteína batida'}.`
        : `${br(-faltaKcal)} kcal acima da meta${faltaP! > 0 ? `; ainda faltam ${br(faltaP!)} g de proteína` : ''}.`

  return (
    <>
      <Titulo titulo="Alimentação" sub={dia === hoje ? sub : `Dia ${dia.split('-').reverse().join('/')}`}>
        <div className="segmentos">
          <button type="button" aria-label="Dia anterior" onClick={() => setDia(somarDias(dia, -1))}>
            <Icone nome="voltar" tamanho={14} />
          </button>
          <button type="button" className={dia === hoje ? 'ativo' : ''} onClick={() => setDia(hoje)}>
            {dia === hoje ? 'Hoje' : dia === somarDias(hoje, -1) ? 'Ontem' : dia.split('-').reverse().slice(0, 2).join('/')}
          </button>
          <button type="button" aria-label="Próximo dia" onClick={() => setDia(somarDias(dia, 1))} disabled={dia >= hoje} style={{ transform: 'scaleX(-1)' }}>
            <Icone nome="voltar" tamanho={14} />
          </button>
        </div>
      </Titulo>

      <div className="rolagem">
        <section className="cartao" aria-label="Totais do dia" style={{ gap: 10 }}>
          {plano ? (
            <div className="grade-2" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
              <Total rotulo="Calorias" atual={t.kcal} meta={plano.kcal} unidade="kcal" />
              <Total rotulo="Proteína" atual={t.p} meta={plano.proteina} unidade="g" destaque />
              <Total rotulo="Carboidrato" atual={t.c} meta={plano.carbo} unidade="g" />
              <Total rotulo="Gordura" atual={t.g} meta={plano.gordura} unidade="g" />
            </div>
          ) : (
            <div className="linha">
              <span className="principal-texto">
                {br(t.kcal)} kcal · {br(t.p)} g proteína · {br(t.c)} g carboidrato · {br(t.g)} g gordura
              </span>
              <button type="button" className="botao pequeno" onClick={() => irPara('metas')}>
                Montar minha meta
              </button>
            </div>
          )}
          <span className="meta">Fibra {br(t.fibra)} g · valores da Tabela TACO (Unicamp) por 100 g, ou dos seus alimentos.</span>
        </section>

        {rascunho ? (
          <EditorRefeicao
            inicial={rascunho.r}
            base={base}
            idRefeicao={rascunho.id}
            aoTerminar={() => setRascunho(null)}
          />
        ) : (
          <section className="cartao" aria-label="Registrar refeição" style={{ gap: 10 }}>
            <strong>Registrar refeição</strong>
            <form
              className="barra-campo"
              style={{ background: 'var(--dentro)' }}
              onSubmit={(e) => {
                e.preventDefault()
                montar()
              }}
            >
              <label htmlFor="desc-refeicao" className="so-leitor">
                Descreva a refeição
              </label>
              <input id="desc-refeicao" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder='"almocei 150 g de frango grelhado, 4 colheres de arroz, uma concha de feijão e salada"' />
              <button type="submit" className="botao principal" disabled={!texto.trim() || montando}>
                {montando ? 'Montando…' : 'Montar'}
              </button>
            </form>
            {erro && <Mensagem erro>{erro}</Mensagem>}
            <div className="botoes" style={{ flexWrap: 'wrap' }}>
              <button type="button" className="botao pequeno" onClick={() => setRascunho({ r: { tipo: 'almoco', dia, itens: [] } })}>
                <Icone nome="busca" tamanho={14} /> Buscar na tabela
              </button>
              {receitas.map((rc) => (
                <button
                  key={rc.id}
                  type="button"
                  className="botao pequeno"
                  title="Usar receita salva"
                  onClick={() =>
                    setRascunho({
                      r: { tipo: 'almoco', dia, itens: rc.itens.map((i) => ({ nome: porId.get(i.alimentoId)?.nome ?? '?', gramas: i.gramas, alimento: porId.get(i.alimentoId) ?? null, sugestoes: [] })) },
                    })
                  }
                >
                  {rc.nome}
                </button>
              ))}
              <button type="button" className="link" onClick={() => setNovoAlimento((v) => !v)}>
                {novoAlimento ? 'Fechar' : 'Cadastrar alimento do rótulo'}
              </button>
            </div>
            {novoAlimento && <FormAlimento fechar={() => setNovoAlimento(false)} />}
          </section>
        )}

        {doDia.length ? (
          doDia.map((r) => {
            const st = somar(r.itens)
            return (
              <section key={r.id} className="cartao" aria-label={nomeTipo(r.tipo)}>
                <div className="cartao-topo">
                  <strong>{nomeTipo(r.tipo)}</strong>
                  <span className="botoes">
                    <span className="meta">
                      {br(st.kcal)} kcal · P {br(st.p)} · C {br(st.c)} · G {br(st.g)}
                    </span>
                    <button type="button" className="icone" onClick={() => editar(r)} aria-label={`Editar ${nomeTipo(r.tipo)}`}>
                      <Icone nome="editar" tamanho={15} />
                    </button>
                    <Apagar rotulo={`Apagar ${nomeTipo(r.tipo)}`} aoConfirmar={() => api.apagarRefeicao(r.id)} />
                  </span>
                </div>
                <table className="tabela">
                  <tbody>
                    {r.itens.map((i, n) => (
                      <tr key={n}>
                        <td style={{ width: '46%' }}>{i.nome}</td>
                        <td className="num meta">{i.gramas} g</td>
                        <td className="num">{br(i.kcal)} kcal</td>
                        <td className="num meta">P {br(i.p, 1)}</td>
                        <td className="num meta">C {br(i.c, 1)}</td>
                        <td className="num meta">G {br(i.g, 1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )
          })
        ) : (
          <Vazio icone="prato" titulo={dia === hoje ? 'Nada registrado hoje' : 'Nada registrado neste dia'}>
            Descreva a refeição acima ou fale com o assistente: "almocei 150 g de frango e 4 colheres de arroz".
          </Vazio>
        )}
      </div>
    </>
  )
}

function Total({ rotulo, atual, meta, unidade, destaque }: { rotulo: string; atual: number; meta: number; unidade: string; destaque?: boolean }) {
  const fr = meta ? atual / meta : 0
  return (
    <div className="barra-meta">
      <span className="meta">{rotulo}</span>
      <span>
        <b className="numero-grande" style={{ fontSize: 20 }}>
          {br(atual)}
        </b>
        <span className="meta">
          {' '}
          de {br(meta)} {unidade}
        </span>
      </span>
      <span className={`barra-progresso ${fr > 1.05 && !destaque ? 'alto' : ''}`}>
        <span style={{ width: `${Math.round(Math.min(1, fr) * 100)}%` }} />
      </span>
    </div>
  )
}

// Conferir e salvar a refeição: cada linha com o alimento e os gramas, totais na hora.
export function EditorRefeicao({ inicial, base, idRefeicao, aoTerminar, compacto }: { inicial: RascunhoRefeicao; base: Alimento[]; idRefeicao?: string; aoTerminar: (msg?: string) => void; compacto?: boolean }) {
  const [tipo, setTipo] = useState<TipoRefeicao>(inicial.tipo)
  const [linhas, setLinhas] = useState(inicial.itens.map((i) => ({ ...i, gramasTexto: i.gramas != null ? String(i.gramas) : '' })))
  const [busca, setBusca] = useState('')
  const [salvarComo, setSalvarComo] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const achados = busca.trim().length > 1 ? buscarAlimentos(base, busca, 6) : []
  const itens: ItemRefeicao[] = linhas.filter((l) => l.alimento && Number(l.gramasTexto.replace(',', '.')) > 0).map((l) => item(l.alimento!, Number(l.gramasTexto.replace(',', '.'))))
  const t = somar(itens)
  const incompletas = linhas.filter((l) => !l.alimento || !(Number(l.gramasTexto.replace(',', '.')) > 0)).length

  const salvar = async () => {
    if (!itens.length) return setErro('Adicione pelo menos um alimento com gramas.')
    if (incompletas) return setErro('Complete ou tire as linhas sem alimento ou sem gramas.')
    const r = await api.salvarRefeicao({ id: idRefeicao, dia: inicial.dia, tipo, itens })
    if (!r.ok) return setErro(r.erro)
    if (salvarComo.trim()) await api.salvarReceita({ nome: salvarComo, itens: itens.map((i) => ({ alimentoId: i.alimentoId, gramas: i.gramas })) })
    aoTerminar(`${nomeTipo(tipo)} salvo: ${br(t.kcal)} kcal e ${br(t.p)} g de proteína.`)
  }

  return (
    <section className={compacto ? 'cartao-conversa' : 'cartao'} aria-label="Conferir refeição" style={{ gap: 10, ...(compacto ? { width: '92%' } : {}) }}>
      <div className="cartao-topo" style={{ paddingBottom: 0 }}>
        <strong>Confira e salve</strong>
        <select className="selecao" style={{ height: 30 }} value={tipo} onChange={(e) => setTipo(e.target.value as TipoRefeicao)} aria-label="Refeição">
          {TIPOS.map((x) => (
            <option key={x.id} value={x.id}>
              {x.nome}
            </option>
          ))}
        </select>
      </div>
      {linhas.map((l, n) => (
        <div key={n} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div className="linha" style={{ gap: 8 }}>
            <select
              className="selecao"
              style={{ flex: 1, minWidth: 0 }}
              value={l.alimento?.id ?? ''}
              onChange={(e) => {
                const a = [...l.sugestoes, ...(l.alimento ? [l.alimento] : []), ...base].find((x) => x.id === e.target.value) ?? null
                setLinhas(linhas.map((x, i) => (i === n ? { ...x, alimento: a, aviso: undefined } : x)))
              }}
              aria-label={`Alimento para "${l.nome}"`}
            >
              {!l.alimento && <option value="">Escolha o alimento para "{l.nome}"</option>}
              {[...(l.alimento ? [l.alimento] : []), ...l.sugestoes.filter((s) => s.id !== l.alimento?.id)].map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                  {a.fonte === 'meu' ? ' (seu)' : a.fonte === 'ia' ? ' (estimado)' : ''}
                </option>
              ))}
            </select>
            <input className="campo-texto" style={{ width: 80, flex: 'none', textAlign: 'right' }} inputMode="decimal" value={l.gramasTexto} onChange={(e) => setLinhas(linhas.map((x, i) => (i === n ? { ...x, gramasTexto: e.target.value } : x)))} aria-label="Gramas" placeholder="g" />
            <span className="meta" style={{ width: 120, textAlign: 'right' }}>
              {l.alimento && Number(l.gramasTexto.replace(',', '.')) > 0 ? `${br(item(l.alimento, Number(l.gramasTexto.replace(',', '.'))).kcal)} kcal · P ${br(item(l.alimento, Number(l.gramasTexto.replace(',', '.'))).p, 1)}` : '—'}
            </span>
            <button type="button" className="icone" onClick={() => setLinhas(linhas.filter((_, i) => i !== n))} aria-label="Tirar">
              <Icone nome="fechar" tamanho={14} />
            </button>
          </div>
          {l.aviso && <span className="meta" style={{ color: 'var(--ambar)' }}>{l.aviso}</span>}
        </div>
      ))}
      <label className="busca" style={{ background: 'var(--dentro)', height: 38 }}>
        <Icone nome="busca" tamanho={15} />
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Adicionar alimento: digite para buscar na tabela" aria-label="Buscar alimento" />
      </label>
      {achados.map((a) => (
        <button
          key={a.id}
          type="button"
          className="linha"
          style={{ minHeight: 32, textAlign: 'left', padding: '0 4px' }}
          onClick={() => {
            setLinhas([...linhas, { nome: a.nome, gramas: 100, gramasTexto: '100', alimento: a, sugestoes: [] }])
            setBusca('')
          }}
        >
          <span className="principal-texto">{a.nome}</span>
          <span className="meta">
            {br(a.kcal)} kcal · P {br(a.p, 1)} por 100 g{a.fonte === 'meu' ? ' · seu' : ''}
          </span>
        </button>
      ))}
      <div className="linha" style={{ borderTop: '1px solid #1d2024', paddingTop: 8 }}>
        <strong style={{ flex: 1 }}>Total</strong>
        <span className="meta" style={{ color: '#fff' }}>
          {br(t.kcal)} kcal · P {br(t.p)} g · C {br(t.c)} g · G {br(t.g)} g
        </span>
      </div>
      {!compacto && <input className="campo-texto" value={salvarComo} onChange={(e) => setSalvarComo(e.target.value)} placeholder='Salvar também como receita, ex.: "Marmita de frango" (opcional)' aria-label="Nome da receita" />}
      {erro && <Mensagem erro>{erro}</Mensagem>}
      <div className="botoes">
        <button type="button" className="botao principal" onClick={salvar}>
          Salvar refeição
        </button>
        <button type="button" className="botao leve" onClick={() => aoTerminar()}>
          Descartar
        </button>
      </div>
    </section>
  )
}

function FormAlimento({ fechar }: { fechar: () => void }) {
  const [f, setF] = useState({ nome: '', kcal: '', p: '', c: '', g: '' })
  const [erro, setErro] = useState<string | null>(null)
  const n = (s: string) => (s.trim() ? Number(s.replace(',', '.')) : 0)
  return (
    <form
      className="formulario"
      onSubmit={async (e) => {
        e.preventDefault()
        const r = await api.salvarAlimento({ nome: f.nome, kcal: n(f.kcal), p: n(f.p), c: n(f.c), g: n(f.g), fibra: 0 })
        if (!r.ok) return setErro(r.erro)
        fechar()
      }}
    >
      <span className="meta">Para o que não está na tabela (whey, barra, produto de marca). Copie do rótulo os valores por 100 g.</span>
      <div className="linha-campos">
        <input className="campo-texto" style={{ flex: 2 }} value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Nome, ex.: Whey da marca X" aria-label="Nome" />
        {(['kcal', 'p', 'c', 'g'] as const).map((k) => (
          <input key={k} className="campo-texto" style={{ width: 90, flex: 'none' }} inputMode="decimal" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} placeholder={{ kcal: 'kcal', p: 'proteína', c: 'carbo', g: 'gordura' }[k]} aria-label={`${k} por 100 g`} />
        ))}
      </div>
      {erro && <Mensagem erro>{erro}</Mensagem>}
      <div className="botoes">
        <button type="submit" className="botao principal pequeno" disabled={!f.nome.trim() || !f.kcal.trim()}>
          Salvar alimento
        </button>
      </div>
    </form>
  )
}
