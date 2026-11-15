import { useState } from 'react'
import type { Atalho } from '../../../shared/tipos'
import { Icone } from '../icones'
import { api } from '../util'
import { BotaoApagar, Mensagem } from './comum'

export function Atalhos({ atalhos }: { atalhos: Atalho[] }) {
  const [busca, setBusca] = useState('')
  const [editando, setEditando] = useState<string | 'novo' | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const b = busca.toLowerCase()
  const lista = atalhos.filter((a) => !b || a.nome.toLowerCase().includes(b) || a.destino.toLowerCase().includes(b))

  const abrir = async (id: string) => {
    const r = await api.abrir(id)
    setErro(r.ok ? null : r.erro)
  }

  return (
    <div className="aba-conteudo">
      <div className="barra-acoes">
        <label className="busca">
          <Icone nome="busca" tamanho={16} />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar atalho" aria-label="Buscar atalho" />
        </label>
        <button className="primario pequeno" onClick={() => setEditando('novo')}>
          <Icone nome="mais" tamanho={15} /> Novo
        </button>
      </div>
      <p className="discreto-texto">Diga "abre o …" ou clique. O nome é o que você fala.</p>
      {erro && <Mensagem tipo="erro">{erro}</Mensagem>}
      {editando === 'novo' && <FormAtalho fechar={() => setEditando(null)} />}
      <ul className="grade-atalhos">
        {lista.map((a) =>
          editando === a.id ? (
            <li key={a.id} className="largo">
              <FormAtalho atalho={a} fechar={() => setEditando(null)} />
            </li>
          ) : (
            <li key={a.id} className="atalho">
              <button className="atalho-abrir" onClick={() => abrir(a.id)} title={a.destino}>
                <span className={`atalho-icone ${a.tipo}`}>
                  <Icone nome={a.tipo === 'site' ? 'link' : a.tipo === 'pasta' ? 'lista' : 'terminal'} tamanho={16} />
                </span>
                <span className="atalho-nome">{a.nome}</span>
              </button>
              <span className="atalho-acoes">
                <button className="icone-botao pequeno" onClick={() => setEditando(a.id)} aria-label={`Editar ${a.nome}`}>
                  <Icone nome="editar" tamanho={15} />
                </button>
                <BotaoApagar aoConfirmar={() => api.apagarAtalho(a.id)} />
              </span>
            </li>
          ),
        )}
      </ul>
    </div>
  )
}

export function FormAtalho({ atalho, inicial, fechar }: { atalho?: Atalho; inicial?: { nome: string; destino: string }; fechar: (salvou?: boolean) => void }) {
  const [nome, setNome] = useState(atalho?.nome ?? inicial?.nome ?? '')
  const [destino, setDestino] = useState(atalho?.destino ?? inicial?.destino ?? '')
  const [erro, setErro] = useState<string | null>(null)
  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    const r = await api.salvarAtalho(nome, destino, atalho?.id)
    if (!r.ok) return setErro(r.erro)
    fechar(true)
  }
  return (
    <form className="formulario cartao-form" onSubmit={salvar}>
      <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder='Nome falado, ex.: "painel da Bianca"' aria-label="Nome" autoFocus />
      <div className="linha-campos">
        <input value={destino} onChange={(e) => setDestino(e.target.value)} placeholder="https://… ou C:\pasta\programa.exe" aria-label="Destino" />
        <button
          type="button"
          className="pequeno"
          onClick={async () => {
            const p = await api.escolherPasta()
            if (p) setDestino(p)
          }}
        >
          Pasta…
        </button>
      </div>
      {erro && <Mensagem tipo="erro">{erro}</Mensagem>}
      <div className="botoes">
        <button type="submit" className="primario" disabled={!nome.trim() || !destino.trim()}>
          Salvar
        </button>
        <button type="button" className="discreto" onClick={() => fechar()}>
          Cancelar
        </button>
      </div>
    </form>
  )
}
