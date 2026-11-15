import { useEffect, useRef, useState } from 'react'
import type { Mensagem } from '../../shared/groq'
import { Configuracoes } from './Configuracoes'

const api = window.assistente

export function App() {
  const [tela, setTela] = useState<'conversa' | 'configuracoes'>('conversa')
  useEffect(() => api.aoAbrir(setTela), [])

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.body.dataset.gravandoAtalho) api.esconder()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [])

  return (
    <div className="barra">
      <header className="topo">
        <span className="marca">Assistente Zarb</span>
        <button
          className="botao-icone"
          onClick={() => setTela(tela === 'conversa' ? 'configuracoes' : 'conversa')}
          aria-label={tela === 'conversa' ? 'Abrir configurações' : 'Voltar para a conversa'}
        >
          {tela === 'conversa' ? 'Configurações' : 'Voltar'}
        </button>
      </header>
      {tela === 'conversa' ? <Conversa /> : <Configuracoes />}
    </div>
  )
}

function Conversa() {
  const [historico, setHistorico] = useState<Mensagem[]>([])
  const [texto, setTexto] = useState('')
  const [pensando, setPensando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const entrada = useRef<HTMLInputElement>(null)
  const fim = useRef<HTMLDivElement>(null)

  useEffect(() => api.aoAbrir(() => entrada.current?.focus()), [])
  useEffect(() => {
    entrada.current?.focus()
  }, [])
  useEffect(() => {
    fim.current?.scrollIntoView({ block: 'end' })
  }, [historico, pensando])

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    const pedido = texto.trim()
    if (!pedido || pensando) return
    const novo: Mensagem[] = [...historico, { papel: 'eu', texto: pedido }]
    setHistorico(novo)
    setTexto('')
    setErro(null)
    setPensando(true)
    const r = await api.conversar(novo)
    setPensando(false)
    if (r.ok) setHistorico([...novo, { papel: 'assistente', texto: r.texto }])
    else setErro(r.erro)
  }

  return (
    <>
      <div className="mensagens" aria-live="polite">
        {historico.length === 0 && <p className="vazio">Escreva o que precisa. Enter manda, Esc esconde.</p>}
        {historico.map((m, i) => (
          <p key={i} className={`mensagem ${m.papel}`}>
            {m.texto}
          </p>
        ))}
        {pensando && <p className="mensagem assistente pensando">Pensando…</p>}
        {erro && (
          <p className="erro" role="alert">
            {erro}
          </p>
        )}
        <div ref={fim} />
      </div>
      <form className="entrada" onSubmit={enviar}>
        <input
          ref={entrada}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Pergunte ou peça algo"
          aria-label="Mensagem"
        />
        <button type="submit" disabled={!texto.trim() || pensando}>
          Enviar
        </button>
      </form>
    </>
  )
}
