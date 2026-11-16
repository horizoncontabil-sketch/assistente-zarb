import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { erroLegivel, supabase } from './dados'
import { Hoje } from './Hoje'
import { TreinoTela } from './TreinoTela'
import { Comida } from './Comida'
import { Corpo } from './Corpo'
import { Tarefas } from './Tarefas'
import { Habitos } from './Habitos'

export type Aba = 'hoje' | 'tarefas' | 'habitos' | 'treino' | 'comida' | 'corpo'

const ICONES: Record<Aba, React.JSX.Element> = {
  hoje: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  tarefas: <path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" />,
  habitos: <path d="M12 3v3M12 18v3M3 12h3M18 12h3M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />,
  treino: <path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12" />,
  comida: <path d="M4 11h16a8 8 0 0 1-16 0zM12 3v4M8 5v2M16 5v2" />,
  corpo: <path d="M4 19h16M7 16V9M12 16V5M17 16v-4" />,
}
const NOMES: Record<Aba, string> = { hoje: 'Hoje', tarefas: 'Tarefas', habitos: 'Hábitos', treino: 'Treino', comida: 'Comida', corpo: 'Corpo' }

export function App() {
  const [sessao, setSessao] = useState<Session | null | undefined>(undefined)
  const [aba, setAba] = useState<Aba>('hoje')
  const [versao, setVersao] = useState(0) // força recarregar a aba ao trocar

  useEffect(() => {
    // Pede ao iPhone para não apagar o que o app guarda (inclui o acesso) quando falta espaço ou o app fica parado.
    navigator.storage?.persist?.().catch(() => {})
    supabase.auth.getSession().then(({ data }) => setSessao(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSessao(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (sessao === undefined) return null
  if (!sessao) return <Entrar />

  const ir = (a: Aba) => {
    setAba(a)
    setVersao((v) => v + 1)
  }

  return (
    <div className="app">
      <main className="tela" key={`${aba}-${versao}`}>
        {aba === 'hoje' && <Hoje ir={ir} />}
        {aba === 'tarefas' && <Tarefas />}
        {aba === 'habitos' && <Habitos />}
        {aba === 'treino' && <TreinoTela />}
        {aba === 'comida' && <Comida />}
        {aba === 'corpo' && <Corpo />}
      </main>
      <nav className="abas" aria-label="Abas">
        {(Object.keys(NOMES) as Aba[]).map((a) => (
          <button key={a} className={a === aba ? 'ativa' : ''} onClick={() => ir(a)} aria-current={a === aba ? 'page' : undefined}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">{ICONES[a]}</svg>
            {NOMES[a]}
          </button>
        ))}
      </nav>
    </div>
  )
}

function Entrar() {
  const [email, setEmail] = useState(() => lerEmail())
  const [senha, setSenha] = useState('')
  const [modo, setModo] = useState<'entrar' | 'criar'>('entrar')
  const [msg, setMsg] = useState<{ texto: string; erro?: boolean } | null>(null)
  const [indo, setIndo] = useState(false)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setIndo(true)
    setMsg(null)
    try {
      if (modo === 'entrar') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
        if (error) throw error
        guardarEmail(email.trim())
      } else {
        if (senha.length < 8) throw new Error('curta')
        const { error } = await supabase.auth.signUp({ email: email.trim(), password: senha })
        if (error) throw error
        setMsg({ texto: 'Pronto. Abra o link que chegou no seu e-mail e depois entre aqui com a mesma senha.' })
        setModo('entrar')
      }
    } catch (err) {
      setMsg({ texto: (err as Error).message === 'curta' ? 'A senha precisa de pelo menos 8 caracteres.' : erroLegivel(err), erro: true })
    } finally {
      setIndo(false)
    }
  }

  return (
    <div className="app">
      <form className="tela" onSubmit={enviar} style={{ alignContent: 'center' }}>
        <div className="cab">
          <small>Assistente pessoal</small>
          <h1>{modo === 'entrar' ? 'Entrar' : 'Criar seu acesso'}</h1>
        </div>
        {!noIcone() && (
          <div className="aviso" role="note">
            Você está no navegador. O Safari e o ícone da tela de início guardam o acesso separados: entre pelo ícone (Compartilhar, Adicionar à Tela de Início) e ele fica lembrado.
          </div>
        )}
        <label className="peq cinza" htmlFor="email">E-mail</label>
        <input id="email" className="entrada" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label className="peq cinza" htmlFor="senha">Senha</label>
        <input id="senha" className="entrada" type="password" autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'} value={senha} onChange={(e) => setSenha(e.target.value)} required />
        {msg && <div className={msg.erro ? 'aviso erro' : 'aviso'} role="status">{msg.texto}</div>}
        <button className="botao" disabled={indo}>{indo ? 'Um momento…' : modo === 'entrar' ? 'Entrar' : 'Criar acesso'}</button>
        <button type="button" className="link" onClick={() => { setModo(modo === 'entrar' ? 'criar' : 'entrar'); setMsg(null) }}>
          {modo === 'entrar' ? 'Primeira vez? Criar acesso' : 'Já tenho acesso'}
        </button>
      </form>
    </div>
  )
}

// Aberto pelo ícone da tela de início (não pela aba do Safari).
const noIcone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true

function lerEmail() {
  try { return localStorage.getItem('ultimo-email') ?? '' } catch { return '' }
}
function guardarEmail(e: string) {
  try { localStorage.setItem('ultimo-email', e) } catch { /* sem armazenamento: só não pré-preenche */ }
}
