import { useEffect, useState } from 'react'
import { aceleradorDaTecla, aceleradorLegivel } from '../../shared/atalho'
import type { Configuracoes as Config } from '../../shared/tipos'

const api = window.assistente

export function Configuracoes() {
  const [c, setC] = useState<Config | null>(null)
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const [gravando, setGravando] = useState(false)
  const [chave, setChave] = useState('')
  const [modelo, setModelo] = useState('')

  const recarregar = () =>
    api.configuracoes().then((n) => {
      setC(n)
      setModelo(n.modelo)
    })
  useEffect(() => {
    recarregar()
  }, [])

  useEffect(() => {
    if (!gravando) return
    document.body.dataset.gravandoAtalho = '1'
    api.pausarAtalho(true)
    const aoTeclar = async (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.key === 'Escape') return parar()
      const acc = aceleradorDaTecla(e)
      if (!acc) return
      await parar()
      const r = await api.definirAtalho(acc)
      setAviso(r.ok ? { tipo: 'ok', texto: 'Atalho salvo.' } : { tipo: 'erro', texto: r.erro })
      recarregar()
    }
    const parar = async () => {
      window.removeEventListener('keydown', aoTeclar, true)
      delete document.body.dataset.gravandoAtalho
      setGravando(false)
      await api.pausarAtalho(false)
    }
    window.addEventListener('keydown', aoTeclar, true)
    return () => {
      window.removeEventListener('keydown', aoTeclar, true)
      delete document.body.dataset.gravandoAtalho
    }
  }, [gravando])

  if (!c) return <p className="vazio">Carregando…</p>

  async function salvarChave(e: React.FormEvent) {
    e.preventDefault()
    try {
      await api.definirChaveGroq(chave)
      setChave('')
      setAviso({ tipo: 'ok', texto: 'Chave guardada no cofre do Windows.' })
    } catch {
      setAviso({ tipo: 'erro', texto: 'Não deu para guardar a chave. O cofre do Windows não respondeu.' })
    }
    recarregar()
  }

  return (
    <div className="configuracoes">
      {aviso && (
        <p className={aviso.tipo === 'ok' ? 'ok' : 'erro'} role="status">
          {aviso.texto}
        </p>
      )}

      <section>
        <h2>Atalho para abrir e esconder</h2>
        <div className="linha">
          <kbd>{gravando ? 'Aperte a combinação… (Esc cancela)' : aceleradorLegivel(c.atalhoAbrir)}</kbd>
          <button onClick={() => setGravando(true)} disabled={gravando}>
            Trocar
          </button>
        </div>
        <p className="dica">Use Ctrl, Alt ou Win com outra tecla, ou uma tecla F sozinha.</p>
      </section>

      <section>
        <h2>Chave da Groq</h2>
        <p className="dica">
          {c.temChaveGroq ? 'Chave guardada no cofre do Windows.' : 'Nenhuma chave. Crie uma grátis em console.groq.com.'}
        </p>
        <form className="linha" onSubmit={salvarChave}>
          <input
            type="password"
            value={chave}
            onChange={(e) => setChave(e.target.value)}
            placeholder={c.temChaveGroq ? 'Colar chave nova' : 'Colar a chave'}
            aria-label="Chave da Groq"
            autoComplete="off"
          />
          <button type="submit" disabled={!chave.trim()}>
            Salvar
          </button>
          {c.temChaveGroq && (
            <button
              type="button"
              className="perigo"
              onClick={async () => {
                await api.apagarChaveGroq()
                setAviso({ tipo: 'ok', texto: 'Chave apagada.' })
                recarregar()
              }}
            >
              Apagar
            </button>
          )}
        </form>
      </section>

      <section>
        <h2>Modelo da Groq</h2>
        <form
          className="linha"
          onSubmit={async (e) => {
            e.preventDefault()
            await api.definirModelo(modelo)
            setAviso({ tipo: 'ok', texto: 'Modelo salvo.' })
            recarregar()
          }}
        >
          <input value={modelo} onChange={(e) => setModelo(e.target.value)} aria-label="Modelo da Groq" />
          <button type="submit" disabled={!modelo.trim() || modelo.trim() === c.modelo}>
            Salvar
          </button>
        </form>
      </section>

      <section>
        <label className="linha">
          <input
            type="checkbox"
            checked={c.iniciarComWindows}
            onChange={async (e) => {
              await api.definirIniciarComWindows(e.target.checked)
              recarregar()
            }}
          />
          Abrir junto com o Windows
        </label>
      </section>
    </div>
  )
}
