import { useState, type RefObject } from 'react'
import type { Aba } from '../../shared/tipos'
import type { Troca } from './App'
import { Agenda } from './abas/Agenda'
import { Atalhos } from './abas/Atalhos'
import { Configuracoes } from './abas/Configuracoes'
import { Conversa } from './abas/Conversa'
import { Copiados } from './abas/Copiados'
import { Hoje } from './abas/Hoje'
import { Tarefas } from './abas/Tarefas'
import { Icone } from './icones'
import type { Dados } from './usarDados'
import type { usarGravacao } from './usarVoz'

type Props = {
  dados: Dados
  agora: Date
  aba: Aba | 'conversa'
  setAba: (a: Aba | 'conversa') => void
  trocas: Troca[]
  limparConversa: () => void
  enviar: (t: string) => void
  gravacao: ReturnType<typeof usarGravacao>
  chamado: string
  entrada: RefObject<HTMLTextAreaElement | null>
  fechar: () => void
}

const ABAS: { id: Aba; nome: string }[] = [
  { id: 'hoje', nome: 'Hoje' },
  { id: 'tarefas', nome: 'Tarefas' },
  { id: 'agenda', nome: 'Agenda' },
  { id: 'copiados', nome: 'Copiados' },
  { id: 'atalhos', nome: 'Atalhos' },
]

export function Painel({ dados, agora, aba, setAba, trocas, limparConversa, enviar, gravacao, chamado, entrada, fechar }: Props) {
  const [texto, setTexto] = useState('')
  const pendentes = dados.tarefas.filter((t) => !t.feita).length

  const mandar = () => {
    if (!texto.trim()) return
    enviar(texto)
    setTexto('')
  }

  return (
    <div className="painel">
      <header className="painel-topo">
        <span className="marca-z grande">z</span>
        <nav className="abas" role="tablist">
          {trocas.length > 0 && (
            <button role="tab" aria-selected={aba === 'conversa'} className={aba === 'conversa' ? 'ativa' : ''} onClick={() => setAba('conversa')}>
              Conversa
            </button>
          )}
          {ABAS.map((a) => (
            <button key={a.id} role="tab" aria-selected={aba === a.id} className={aba === a.id ? 'ativa' : ''} onClick={() => setAba(a.id)}>
              {a.nome}
              {a.id === 'tarefas' && pendentes > 0 && <span className="contador">{pendentes}</span>}
            </button>
          ))}
        </nav>
        <button className={`icone-botao ${aba === 'config' ? 'ativa' : ''}`} onClick={() => setAba('config')} aria-label="Configurações" title="Configurações">
          <Icone nome="config" />
        </button>
        <button className="icone-botao" onClick={fechar} aria-label="Recolher" title="Recolher (Esc)">
          <Icone nome="fechar" />
        </button>
      </header>

      <main className="painel-corpo">
        {aba === 'conversa' && <Conversa trocas={trocas} dados={dados} agora={agora} limpar={limparConversa} />}
        {aba === 'hoje' && <Hoje dados={dados} agora={agora} irPara={setAba} />}
        {aba === 'tarefas' && <Tarefas tarefas={dados.tarefas} agora={agora} />}
        {aba === 'agenda' && <Agenda dados={dados} agora={agora} irPara={setAba} />}
        {aba === 'copiados' && <Copiados copias={dados.copias} ativas={!!dados.config?.copiasAtivas} />}
        {aba === 'atalhos' && <Atalhos atalhos={dados.atalhos} />}
        {aba === 'config' && dados.config && <Configuracoes config={dados.config} chamado={chamado} />}
      </main>

      <footer className="painel-base">
        <form
          className="comando"
          onSubmit={(e) => {
            e.preventDefault()
            mandar()
          }}
        >
          <textarea
            ref={entrada}
            rows={1}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                mandar()
              }
            }}
            placeholder={gravacao.estado === 'ouvindo' ? 'Ouvindo…' : 'Peça algo: "me lembra amanhã às 9 de ligar pra Costare"'}
            aria-label="Pedido para o assistente"
          />
          <button
            type="button"
            className={`mic ${gravacao.estado}`}
            onClick={gravacao.alternar}
            aria-label={gravacao.estado === 'ouvindo' ? 'Parar de ouvir' : 'Falar'}
            title={dados.config ? `Falar (${dados.config.atalhoFalar.replace('Control', 'Ctrl')})` : 'Falar'}
            disabled={gravacao.estado === 'transcrevendo'}
          >
            <Icone nome="mic" />
          </button>
          <button type="submit" className="enviar" disabled={!texto.trim()} aria-label="Enviar">
            <Icone nome="enviar" />
          </button>
        </form>
      </footer>
    </div>
  )
}
