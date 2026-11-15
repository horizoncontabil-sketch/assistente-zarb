import { useState } from 'react'
import type { Atalho } from '../../../shared/tipos'
import { Icone } from '../icones'
import { api } from '../util'
import { Apagar, Mensagem, Titulo } from './comum'

const ZARB_OS = 'https://os.zarbmedia.com.br'

export function Atalhos({ atalhos }: { atalhos: Atalho[] }) {
  const [busca, setBusca] = useState('')
  const [editando, setEditando] = useState<Atalho | 'novo' | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const b = busca.toLowerCase()
  const achados = atalhos.filter((a) => !b || a.nome.toLowerCase().includes(b) || a.destino.toLowerCase().includes(b))
  const grupos = [
    { nome: 'Zarb OS', itens: achados.filter((a) => !a.proprio && a.destino.startsWith(ZARB_OS)) },
    { nome: 'Ferramentas', itens: achados.filter((a) => !a.proprio && !a.destino.startsWith(ZARB_OS)) },
    { nome: 'Seus atalhos', itens: achados.filter((a) => a.proprio) },
  ].filter((g) => g.itens.length)

  const abrir = async (id: string) => {
    const r = await api.abrir(id)
    setErro(r.ok ? null : r.erro)
  }

  return (
    <>
      <Titulo titulo="Atalhos" sub='Diga "abre o Health Score" ou clique. O nome é o que você fala.'>
        <button type="button" className="botao principal alto" onClick={() => setEditando('novo')}>
          <Icone nome="mais" tamanho={16} /> Novo atalho
        </button>
      </Titulo>
      <label className="busca" style={{ height: 40 }}>
        <Icone nome="busca" tamanho={16} />
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar atalho" aria-label="Buscar atalho" />
      </label>
      {erro && <Mensagem erro>{erro}</Mensagem>}
      <div className="rolagem" style={{ gap: 12 }}>
        {editando && <FormAtalho atalho={editando === 'novo' ? undefined : editando} fechar={() => setEditando(null)} />}
        {grupos.map((g) => (
          <section key={g.nome} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="meta">{g.nome}</span>
            <div className="grade-atalhos">
              {g.itens.map((a) => (
                <div key={a.id} className="atalho">
                  <button type="button" className="atalho-abrir" onClick={() => abrir(a.id)} title={a.destino}>
                    <span style={{ color: 'var(--apagado)', display: 'grid', flex: 'none' }}>
                      <Icone nome={a.tipo === 'site' ? 'globo' : a.tipo === 'pasta' ? 'pasta' : 'terminal'} tamanho={15} />
                    </span>
                    <span>{a.nome}</span>
                  </button>
                  <span className="atalho-acoes">
                    <button type="button" className="icone" style={{ width: 30, height: 30, background: 'var(--dentro)' }} onClick={() => setEditando(a)} aria-label={`Editar ${a.nome}`}>
                      <Icone nome="editar" tamanho={14} />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  )
}

export function FormAtalho({ atalho, inicial, fechar }: { atalho?: Atalho; inicial?: { nome: string; destino: string }; fechar: (salvou?: boolean) => void }) {
  const [nome, setNome] = useState(atalho?.nome ?? inicial?.nome ?? '')
  const [destino, setDestino] = useState(atalho?.destino ?? inicial?.destino ?? '')
  const [erro, setErro] = useState<string | null>(null)
  return (
    <form
      className="cartao formulario"
      onSubmit={async (e) => {
        e.preventDefault()
        const r = await api.salvarAtalho(nome, destino, atalho?.id)
        if (!r.ok) return setErro(r.erro)
        fechar(true)
      }}
    >
      <strong>{atalho ? 'Editar atalho' : 'Novo atalho'}</strong>
      <input className="campo-texto" value={nome} onChange={(e) => setNome(e.target.value)} placeholder='Nome falado, ex.: "painel da Bianca"' aria-label="Nome" autoFocus />
      <div className="linha-campos">
        <input className="campo-texto" value={destino} onChange={(e) => setDestino(e.target.value)} placeholder="https://… ou C:\pasta\programa.exe" aria-label="Destino" />
        <button
          type="button"
          className="botao"
          onClick={async () => {
            const p = await api.escolherPasta()
            if (p) setDestino(p)
          }}
        >
          Escolher pasta…
        </button>
      </div>
      {erro && <Mensagem erro>{erro}</Mensagem>}
      <div className="botoes">
        <button type="submit" className="botao principal" disabled={!nome.trim() || !destino.trim()}>
          Salvar
        </button>
        <button type="button" className="botao leve" onClick={() => fechar()}>
          Cancelar
        </button>
        {atalho && (
          <span style={{ marginLeft: 'auto' }}>
            <Apagar
              rotulo="Apagar atalho"
              aoConfirmar={() => {
                api.apagarAtalho(atalho.id)
                fechar()
              }}
            />
          </span>
        )}
      </div>
    </form>
  )
}
