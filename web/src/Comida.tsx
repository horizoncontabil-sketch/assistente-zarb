import { useEffect, useState } from 'react'
import { ALIMENTOS_TACO, TIPOS, item, somar, type ItemRefeicao, type TipoRefeicao } from '../../src/shared/alimentacao'
import { montarRascunho, tipoPelaHora, type LinhaRascunho } from '../../src/shared/refeicaoIa'
import { REFEICOES_PADRAO } from '../../src/shared/refeicoesPadrao'
import { apagarRefeicao, criarSalvas, diaIso, erroLegivel, lerRefeicoes, lerSalvas, salvarRefeicao, supabase, type Refeicao, type RefeicaoSalva } from './dados'
import { META, fmt, numero } from './util'

const nomeTipo = (t: TipoRefeicao) => TIPOS.find((x) => x.id === t)?.nome ?? t

export function Comida() {
  const hoje = diaIso()
  const [salvas, setSalvas] = useState<RefeicaoSalva[] | null>(null)
  const [dia, setDia] = useState<Refeicao[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [texto, setTexto] = useState('')
  const [pensando, setPensando] = useState(false)
  const [rascunho, setRascunho] = useState<{ tipo: TipoRefeicao; frase: string; linhas: LinhaRascunho[] } | null>(null)

  async function carregar() {
    let s = await lerSalvas()
    if (!s.length) {
      await criarSalvas(REFEICOES_PADRAO.map((r, i) => ({ ...r, ordem: i })))
      s = await lerSalvas()
    }
    setSalvas(s)
    setDia(await lerRefeicoes(hoje))
  }

  useEffect(() => {
    carregar().catch((e) => setErro(erroLegivel(e)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const t = somar(dia.flatMap((r) => r.itens))

  async function registrar(nome: string, itens: ItemRefeicao[], tipo = tipoPelaHora(new Date().getHours())) {
    setErro(null)
    try {
      await salvarRefeicao({ dia: hoje, tipo, nome, itens })
      setDia(await lerRefeicoes(hoje))
    } catch (e) {
      setErro(erroLegivel(e))
    }
  }

  async function interpretar(e: React.FormEvent) {
    e.preventDefault()
    const frase = texto.trim()
    if (!frase) return
    setPensando(true)
    setErro(null)
    try {
      const { data } = await supabase.auth.getSession()
      const r = await fetch('/api/refeicao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token ?? ''}` },
        body: JSON.stringify({ texto: frase, salvas: (salvas ?? []).map((s) => ({ nome: s.nome, itens: s.itens.map((i) => `${i.nome} ${i.gramas} g`) })) }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j.erro ?? 'falhou')
      const ras = montarRascunho(j.args ?? {}, ALIMENTOS_TACO, hoje, new Date())
      if (!ras || !ras.itens.length) throw new Error('Não entendi os alimentos. Tente com as quantidades, ex.: "2 ovos e 1 pão francês".')
      setRascunho({ tipo: ras.tipo, frase, linhas: ras.itens })
      setTexto('')
    } catch (e) {
      const m = (e as Error).message
      setErro(m && m !== 'falhou' && !/fetch/i.test(m) ? m : erroLegivel(e))
    } finally {
      setPensando(false)
    }
  }

  if (rascunho)
    return (
      <Conferir
        rascunho={rascunho}
        cancelar={() => setRascunho(null)}
        salvar={async (itens, tipo, comoBotao) => {
          await registrar(rascunho.frase, itens, tipo)
          if (comoBotao) {
            await criarSalvas([{ nome: comoBotao, itens, ordem: (salvas?.length ?? 0) + 1 }])
            setSalvas(await lerSalvas())
          }
          setRascunho(null)
        }}
      />
    )

  return (
    <>
      <div className="cab">
        <small className="num">{META.kcal - t.kcal >= 0 ? `Faltam ${fmt(META.kcal - t.kcal)} kcal · ${Math.max(0, Math.round(META.proteina - t.p))} g de proteína` : `Passou ${fmt(t.kcal - META.kcal)} kcal`}</small>
        <h1>O que você comeu?</h1>
      </div>
      {erro && <div className="aviso erro">{erro}</div>}
      <div className="chips">
        {salvas === null && <span className="vazio">Carregando…</span>}
        {salvas?.map((s) => {
          const n = somar(s.itens)
          return (
            <button key={s.id} className="chip" onClick={() => registrar(s.nome, s.itens)}>
              <b>{s.nome}</b>
              <span className="num">{s.itens.reduce((g, i) => g + i.gramas, 0)} g · {fmt(n.kcal)} kcal · {Math.round(n.p)} g proteína</span>
              <em>+</em>
            </button>
          )
        })}
      </div>
      <form className="campo" onSubmit={interpretar}>
        <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ou escreva o que comeu" aria-label="Descrever a refeição" enterKeyHint="send" />
        <button className="botao pequeno" disabled={pensando || !texto.trim()}>{pensando ? '…' : 'Contar'}</button>
      </form>
      <span className="peq cinza">Para falar, use o microfone do teclado do iPhone.</span>

      <section className="bloco">
        <h2>Hoje · {fmt(t.kcal)} kcal · {Math.round(t.p)} g proteína</h2>
        <div className="lista-dia">
          {!dia.length && <span className="vazio">Nada registrado ainda.</span>}
          {dia.map((r) => (
            <div key={r.id}>
              <span>{r.nome ?? nomeTipo(r.tipo)} <span className="cinza peq">· {nomeTipo(r.tipo)}</span></span>
              <span className="num">
                {fmt(somar(r.itens).kcal)} kcal
                <button
                  className="x"
                  aria-label={`Apagar ${r.nome ?? 'refeição'}`}
                  onClick={async () => {
                    try {
                      await apagarRefeicao(r.id)
                      setDia((d) => d.filter((x) => x.id !== r.id))
                    } catch (e) {
                      setErro(erroLegivel(e))
                    }
                  }}
                >
                  ×
                </button>
              </span>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

function Conferir(props: {
  rascunho: { tipo: TipoRefeicao; frase: string; linhas: LinhaRascunho[] }
  cancelar: () => void
  salvar: (itens: ItemRefeicao[], tipo: TipoRefeicao, comoBotao: string | null) => Promise<void>
}) {
  const [linhas, setLinhas] = useState(props.rascunho.linhas.map((l) => ({ ...l, g: l.gramas != null ? String(l.gramas) : '' })))
  const [tipo, setTipo] = useState(props.rascunho.tipo)
  const [nomeBotao, setNomeBotao] = useState<string | null>(null)
  const [indo, setIndo] = useState(false)

  const itens = linhas.flatMap((l) => {
    const g = numero(l.g)
    return l.alimento && g ? [item(l.alimento, g)] : []
  })
  const falta = linhas.some((l) => !l.alimento || !numero(l.g))
  const t = somar(itens)

  return (
    <>
      <button className="link" onClick={props.cancelar}>‹ Voltar sem salvar</button>
      <div className="cab"><small>Você escreveu</small><h1 style={{ fontSize: 19, fontWeight: 600, lineHeight: 1.35 }}>"{props.rascunho.frase}"</h1></div>
      <div className="bloco" style={{ gap: 0 }}>
        {linhas.map((l, i) => (
          <div key={i} className="item">
            <div>
              {l.alimento ? <b>{l.alimento.nome}</b> : <b className="cinza">{l.nome}</b>}
              {!l.alimento && l.sugestoes.length > 0 && (
                <select
                  className="entrada"
                  style={{ marginTop: 6, padding: 8, fontSize: 14 }}
                  defaultValue=""
                  onChange={(e) => setLinhas((ls) => ls.map((x, j) => (j === i ? { ...x, alimento: x.sugestoes.find((s) => s.id === e.target.value) ?? null } : x)))}
                  aria-label={`Escolher alimento para ${l.nome}`}
                >
                  <option value="" disabled>Escolha</option>
                  {l.sugestoes.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              )}
              {l.aviso && <small className="aviso-item">{l.aviso}</small>}
            </div>
            <input inputMode="decimal" value={l.g} placeholder="g" onChange={(e) => setLinhas((ls) => ls.map((x, j) => (j === i ? { ...x, g: e.target.value } : x)))} aria-label={`Gramas de ${l.nome}`} />
          </div>
        ))}
      </div>
      <div className="totais">
        <div><small>kcal</small><b>{fmt(t.kcal)}</b></div>
        <div><small>Prot.</small><b>{Math.round(t.p)} g</b></div>
        <div><small>Carb.</small><b>{Math.round(t.c)} g</b></div>
        <div><small>Gord.</small><b>{Math.round(t.g)} g</b></div>
      </div>
      <span className="peq cinza">Valores da tabela TACO. Mude as gramas se a porção foi diferente.</span>
      <div className="campo" style={{ padding: '4px 4px 4px 12px' }}>
        <span className="peq cinza">Refeição</span>
        <select className="entrada" style={{ padding: 8, fontSize: 15 }} value={tipo} onChange={(e) => setTipo(e.target.value as TipoRefeicao)} aria-label="Tipo de refeição">
          {TIPOS.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
        </select>
      </div>
      {falta && <div className="aviso ambar">Falta escolher o alimento ou as gramas de algum item. Só os completos entram.</div>}
      {nomeBotao !== null && <input className="entrada" value={nomeBotao} onChange={(e) => setNomeBotao(e.target.value)} placeholder="Nome do botão, ex.: Marmita com macarrão" aria-label="Nome do botão" />}
      <button
        className="botao"
        disabled={indo || !itens.length || (nomeBotao !== null && !nomeBotao.trim())}
        onClick={async () => {
          setIndo(true)
          await props.salvar(itens, tipo, nomeBotao?.trim() || null)
          setIndo(false)
        }}
      >
        {nomeBotao !== null ? 'Salvar e criar o botão' : `Salvar · ${nomeTipo(tipo)}`}
      </button>
      {nomeBotao === null && <button className="botao seg" onClick={() => setNomeBotao('')}>Salvar também como botão</button>}
    </>
  )
}
