import { useState } from 'react'
import { descreverDia, hora } from '../../../shared/datas'
import { eventosDoDia } from '../../../shared/google'
import type { Aba } from '../../../shared/tipos'
import { Icone } from '../icones'
import type { Dados } from '../usarDados'
import { api, minutosAte } from '../util'
import { CartaoEvento } from './cartoes'
import { Mensagem, Titulo, Vazio } from './comum'

export function Agenda({ dados, agora, irPara }: { dados: Dados; agora: Date; irPara: (a: Aba) => void }) {
  const [novo, setNovo] = useState(false)
  const [atualizando, setAtualizando] = useState(false)
  if (!dados.config?.google.conectado) {
    return (
      <>
        <Titulo titulo="Agenda" />
        <Vazio icone="agenda" titulo="Google Agenda não conectado">
          Entre com o Google para ver suas reuniões, ser avisado antes de cada uma e marcar eventos falando.
        </Vazio>
        <div className="botoes" style={{ justifyContent: 'center' }}>
          <button type="button" className="botao principal alto" onClick={() => irPara('config')}>
            Entrar com Google
          </button>
        </div>
      </>
    )
  }
  const dias = Array.from({ length: 7 }, (_, i) => new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + i))
    .map((d) => ({ d, eventos: eventosDoDia(dados.agenda.eventos, d) }))
    .filter((x, i) => i < 2 || x.eventos.length)
  const total = dias.reduce((n, x) => n + x.eventos.filter((e) => !e.diaInteiro).length, 0)
  const lido = dados.agenda.lidoEm ? new Date(dados.agenda.lidoEm) : null

  return (
    <>
      <Titulo titulo="Agenda" sub={`${total} ${total === 1 ? 'reunião' : 'reuniões'} nos próximos 7 dias${lido ? ` · atualizada às ${hora(lido)}` : ''}`}>
        <button
          type="button"
          className="link"
          style={{ display: 'flex', gap: 6, alignItems: 'center' }}
          disabled={atualizando}
          onClick={async () => {
            setAtualizando(true)
            await api.atualizarAgenda()
            setAtualizando(false)
          }}
        >
          <Icone nome="atualizar" tamanho={15} /> {atualizando ? 'Atualizando…' : 'Atualizar'}
        </button>
        <button type="button" className="botao principal alto" onClick={() => setNovo(true)}>
          <Icone nome="mais" tamanho={16} /> Novo evento
        </button>
      </Titulo>
      <div className="rolagem">
        {dados.agenda.erro && <Mensagem erro>{dados.agenda.erro} Mostrando a última leitura.</Mensagem>}
        {novo && <CartaoEvento inicial={{ titulo: '', inicio: proximaHora(agora), duracaoMin: 30, convidados: [], comMeet: true }} aoTerminar={() => setNovo(false)} largo />}
        <section className="cartao" style={{ padding: '6px 18px' }}>
          {dias.map(({ d, eventos }) => {
            const nome = descreverDia(d, agora)
            return (
              <div key={d.toISOString()} style={{ display: 'flex', gap: 16, padding: '10px 0' }}>
                <div style={{ width: 74, flex: 'none', display: 'flex', flexDirection: 'column', paddingTop: 9 }}>
                  <span style={{ fontWeight: 600, color: nome === 'hoje' ? '#fff' : 'var(--suave)' }}>{nome.charAt(0).toUpperCase() + nome.slice(1).split(' ')[0]}</span>
                  <span className="meta">{d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', '')}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {eventos.length ? (
                    eventos.map((e) => {
                      const passou = !e.diaInteiro && new Date(e.fim) <= agora
                      const perto = !e.diaInteiro && !passou && minutosAte(e.inicio, agora) <= 15
                      return (
                        <div key={e.id} className="linha" style={{ opacity: passou ? 0.45 : 1 }}>
                          <span style={{ width: 3, height: 26, borderRadius: 2, background: 'var(--azul)', flex: 'none' }} />
                          <span style={{ width: 96, fontSize: 13, color: 'var(--suave)' }}>{e.diaInteiro ? 'Dia todo' : `${hora(new Date(e.inicio))} – ${hora(new Date(e.fim))}`}</span>
                          <span className="principal-texto">{e.titulo}</span>
                          {e.meet && !passou ? (
                            <button type="button" className={`botao pequeno ${perto ? 'principal' : ''}`} onClick={() => api.abrirLink(e.meet!)}>
                              Meet
                            </button>
                          ) : (
                            <span className="meta">{e.local ?? ''}</span>
                          )}
                          {e.link && (
                            <button type="button" className="icone" onClick={() => api.abrirLink(e.link!)} aria-label="Abrir no Google Agenda" title="Abrir no Google Agenda">
                              <Icone nome="link" tamanho={15} />
                            </button>
                          )}
                        </div>
                      )
                    })
                  ) : (
                    <p className="nada" style={{ paddingTop: 10 }}>
                      Livre.
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </section>
      </div>
    </>
  )
}

function proximaHora(agora: Date): string {
  const d = new Date(agora)
  d.setHours(d.getHours() + 1, 0, 0, 0)
  return d.toISOString()
}
