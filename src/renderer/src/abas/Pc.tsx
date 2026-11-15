import { useCallback, useEffect, useState } from 'react'
import { descreverQuando } from '../../../shared/datas'
import { tamanho } from '../../../shared/organizar'
import type { EstadoPc, PedidoPc } from '../../../shared/tipos'
import { api } from '../util'
import { ComConfirmacao, Interruptor, Mensagem, Titulo } from './comum'

export function Pc({ silenciado }: { silenciado: boolean }) {
  const [e, setE] = useState<EstadoPc | null>(null)
  const [aviso, setAviso] = useState<{ texto: string; erro?: boolean } | null>(null)
  const [verPlano, setVerPlano] = useState(false)
  const [confirmarEnergia, setConfirmarEnergia] = useState<'suspender' | 'reiniciar' | 'desligar' | null>(null)
  const carregar = useCallback(() => api.pcEstado().then(setE), [])
  useEffect(() => {
    carregar()
  }, [carregar])

  const fazer = async (p: PedidoPc) => {
    const r = await api.pc(p)
    setAviso(r.ok ? (r.texto ? { texto: r.texto } : null) : { texto: r.erro, erro: true })
    carregar()
  }

  const agora = new Date()
  const nomes = { suspender: 'Suspender', reiniciar: 'Reiniciar', desligar: 'Desligar' } as const

  return (
    <>
      <Titulo titulo="PC" sub='Fale "abaixa o volume", "bloqueia o PC" ou use aqui. O que apaga ou desliga pede confirmação.' />
      {aviso && <Mensagem erro={aviso.erro}>{aviso.texto}</Mensagem>}
      {e && !e.windows && <p className="aviso-faixa">Este computador não é Windows: volume, brilho, energia e lixeira só funcionam no Windows.</p>}
      <div className="rolagem">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
          <section className="cartao" aria-label="Som e tela" style={{ gap: 12 }}>
            <strong>Som e tela</strong>
            <Faixa rotulo="Volume" valor={e?.mudo ? 0 : e?.volume ?? null} aoSoltar={(v) => fazer({ tipo: 'volume', mudanca: { nivel: v } })} vazio="Não deu para ler o volume." />
            <Faixa rotulo="Brilho" valor={e?.brilho ?? null} aoSoltar={(v) => fazer({ tipo: 'brilho', nivel: v })} vazio="Este monitor não deixa mudar o brilho pelo Windows." />
            <Interruptor ligado={silenciado} aoMudar={(v) => api.mudarConfig({ silenciarAvisos: v })}>
              <span>Silenciar avisos do Windows</span>
              <small>Os lembretes continuam aparecendo no entalho, sem som</small>
            </Interruptor>
          </section>

          <section className="cartao" aria-label="Energia" style={{ gap: 10 }}>
            <strong>Energia</strong>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
              <button type="button" className="botao" style={{ borderRadius: 12, height: 38 }} onClick={() => fazer({ tipo: 'energia', acao: 'bloquear', confirmado: false })}>
                Bloquear
              </button>
              {(['suspender', 'reiniciar', 'desligar'] as const).map((a) => (
                <button key={a} type="button" className="botao" style={{ borderRadius: 12, height: 38 }} onClick={() => setConfirmarEnergia(a)}>
                  {nomes[a]}…
                </button>
              ))}
            </div>
            {confirmarEnergia && (
              <div role="alertdialog" aria-label={`Confirmar ${nomes[confirmarEnergia].toLowerCase()}`} style={{ marginTop: 'auto', padding: '12px 14px', borderRadius: 14, background: 'var(--vermelho-fundo)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span style={{ fontSize: 13 }}>
                  {nomes[confirmarEnergia]} o PC?
                  {confirmarEnergia !== 'suspender' && e?.abertos.length ? ` ${listar(e.abertos)} ${e.abertos.length === 1 ? 'está aberto e será fechado' : 'estão abertos e serão fechados'}.` : ''}
                </span>
                <div className="botoes">
                  <button
                    type="button"
                    className="botao pequeno perigo"
                    onClick={() => {
                      const a = confirmarEnergia
                      setConfirmarEnergia(null)
                      fazer({ tipo: 'energia', acao: a, confirmado: true })
                    }}
                  >
                    {nomes[confirmarEnergia]} agora
                  </button>
                  <button type="button" className="botao pequeno leve" onClick={() => setConfirmarEnergia(null)}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="cartao" aria-label="Limpeza">
            <strong style={{ paddingBottom: 6 }}>Limpeza</strong>
            <div className="linha" style={{ minHeight: 46 }}>
              <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <span>Lixeira</span>
                <span className="meta">{e?.lixeira ? (e.lixeira.itens ? `${e.lixeira.itens} itens · ${tamanho(e.lixeira.bytes)}` : 'Vazia') : '—'}</span>
              </span>
              {!!e?.lixeira?.itens && <ComConfirmacao rotulo="Esvaziar…" confirmar="Esvaziar" pergunta="Não dá para desfazer." aoConfirmar={() => fazer({ tipo: 'esvaziarLixeira', confirmado: true })} />}
            </div>
            <div className="linha" style={{ minHeight: 46 }}>
              <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <span>Arquivos temporários</span>
                <span className="meta">{e?.temporarios != null ? `${tamanho(e.temporarios)} na pasta temporária` : '—'}</span>
              </span>
              <ComConfirmacao rotulo="Limpar…" confirmar="Limpar" pergunta="Só os de mais de um dia." aoConfirmar={() => fazer({ tipo: 'limparTemporarios', confirmado: true })} />
            </div>
            {(e?.travados.length ? e.travados : [null]).map((t, i) => (
              <div key={t?.pid ?? i} className="linha" style={{ minHeight: 46 }}>
                <span style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span>Programa travado</span>
                  <span className="meta" style={t ? { color: 'var(--ambar)' } : undefined}>
                    {t ? `${t.nome} não responde` : 'Nenhum agora'}
                  </span>
                </span>
                {t && <ComConfirmacao rotulo="Fechar…" confirmar={`Fechar ${t.nome}`} pergunta="O que não foi salvo se perde." aoConfirmar={() => fazer({ tipo: 'fecharPrograma', pid: t.pid, confirmado: true })} />}
              </div>
            ))}
          </section>

          <section className="cartao" aria-label="Arquivos">
            <div className="cartao-topo">
              <strong>Últimos downloads</strong>
              <button type="button" className="link" onClick={() => fazer({ tipo: 'abrirDownloads' })}>
                Abrir a pasta
              </button>
            </div>
            {e?.downloads.length ? (
              e.downloads.slice(0, 3).map((d) => (
                <button key={d.nome} type="button" className="linha" style={{ minHeight: 34, textAlign: 'left' }} onClick={() => fazer({ tipo: 'mostrarDownload', nome: d.nome })} title="Mostrar na pasta">
                  <span className="principal-texto">{d.nome}</span>
                  <span className="meta">
                    {tamanho(d.bytes)} · {descreverQuando(d.em, agora).replace(/^hoje, /, '')}
                  </span>
                </button>
              ))
            ) : (
              <p className="nada">Nenhum download.</p>
            )}
            <div className="linha" style={{ minHeight: 46, marginTop: 'auto' }}>
              <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <span>Organizar a área de trabalho</span>
                <span className="meta">{e ? (e.areaDeTrabalho.soltos ? `${e.areaDeTrabalho.soltos} arquivos soltos, separados por tipo` : 'Nada solto') : '—'}</span>
              </span>
              {!!e?.areaDeTrabalho.soltos && (
                <button type="button" className="botao pequeno" onClick={() => setVerPlano((v) => !v)}>
                  {verPlano ? 'Fechar' : 'Ver antes…'}
                </button>
              )}
            </div>
          </section>
        </div>

        {verPlano && e && (
          <section className="cartao" aria-label="Plano para organizar a área de trabalho" style={{ gap: 8 }}>
            <strong>Assim vai ficar: pasta "Organizado" na área de trabalho</strong>
            {e.areaDeTrabalho.grupos.map((g) => (
              <div key={g.pasta} className="linha" style={{ alignItems: 'flex-start', minHeight: 0 }}>
                <span style={{ width: 120, flex: 'none' }}>{g.pasta}</span>
                <span className="meta" style={{ flex: 1 }}>
                  {g.arquivos.slice(0, 6).join(', ')}
                  {g.arquivos.length > 6 ? ` e mais ${g.arquivos.length - 6}` : ''}
                </span>
              </div>
            ))}
            <span className="meta">Atalhos (.lnk) ficam onde estão. Nada é apagado; arquivo com o mesmo nome ganha "(2)".</span>
            <div className="botoes">
              <button
                type="button"
                className="botao principal"
                onClick={() => {
                  setVerPlano(false)
                  fazer({ tipo: 'organizarAreaDeTrabalho', confirmado: true })
                }}
              >
                Organizar agora
              </button>
              <button type="button" className="botao leve" onClick={() => setVerPlano(false)}>
                Cancelar
              </button>
            </div>
          </section>
        )}
      </div>
    </>
  )
}

function Faixa({ rotulo, valor, aoSoltar, vazio }: { rotulo: string; valor: number | null; aoSoltar: (v: number) => void; vazio: string }) {
  const [v, setV] = useState(valor ?? 0)
  useEffect(() => {
    if (valor != null) setV(valor)
  }, [valor])
  if (valor == null)
    return (
      <div className="linha">
        <span style={{ width: 64, color: 'var(--suave)' }}>{rotulo}</span>
        <span className="meta">{vazio}</span>
      </div>
    )
  return (
    <div className="linha">
      <span style={{ width: 64, color: 'var(--suave)' }}>{rotulo}</span>
      <input type="range" min={0} max={100} step={1} value={v} onChange={(e) => setV(Number(e.target.value))} onPointerUp={() => aoSoltar(v)} onKeyUp={() => aoSoltar(v)} aria-label={rotulo} />
      <span style={{ width: 40, textAlign: 'right' }}>{v}%</span>
    </div>
  )
}

function listar(nomes: string[]): string {
  const n = nomes.slice(0, 3)
  const resto = nomes.length - n.length
  const base = n.length > 1 ? `${n.slice(0, -1).join(', ')} e ${n.at(-1)}` : n[0]
  return resto > 0 ? `${base} (e mais ${resto})` : base
}
