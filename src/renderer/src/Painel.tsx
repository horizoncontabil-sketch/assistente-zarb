import { type RefObject } from 'react'
import type { Aba } from '../../shared/tipos'
import type { Troca } from './App'
import { Agenda } from './abas/Agenda'
import { Atalhos } from './abas/Atalhos'
import { Configuracoes } from './abas/Configuracoes'
import { Conversa } from './abas/Conversa'
import { Copiados } from './abas/Copiados'
import { Habitos } from './abas/Habitos'
import { Hoje } from './abas/Hoje'
import { Pc } from './abas/Pc'
import { Tarefas } from './abas/Tarefas'
import logo from './assets/zarb-logo.png'
import { Icone, type NomeIcone } from './icones'
import type { Dados } from './usarDados'
import type { usarGravacao } from './usarVoz'
import { api } from './util'

export type PropsPainel = {
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

const ITENS: { id: Aba; nome: string; icone: NomeIcone }[] = [
  { id: 'hoje', nome: 'Hoje', icone: 'sol' },
  { id: 'tarefas', nome: 'Tarefas', icone: 'check' },
  { id: 'habitos', nome: 'Hábitos', icone: 'habito' },
  { id: 'agenda', nome: 'Agenda', icone: 'agenda' },
  { id: 'copiados', nome: 'Copiados', icone: 'copia' },
  { id: 'atalhos', nome: 'Atalhos', icone: 'link' },
  { id: 'pc', nome: 'PC', icone: 'pc' },
]

export function Painel(p: PropsPainel) {
  const { dados, agora, aba, setAba } = p
  const atrasadas = dados.tarefas.filter((t) => !t.feita && t.quando && new Date(t.quando) <= agora).length
  const conectado = !!dados.config?.google.conectado

  const item = (i: { id: Aba; nome: string; icone: NomeIcone }) => (
    <button key={i.id} type="button" className={`item ${aba === i.id ? 'ativo' : ''}`} aria-current={aba === i.id ? 'page' : undefined} onClick={() => setAba(i.id)}>
      <Icone nome={i.icone} tamanho={16} />
      <span className="nome">{i.nome}</span>
      {i.id === 'tarefas' && atrasadas > 0 && <span className="contagem">{atrasadas === 1 ? '1 atrasada' : `${atrasadas} atrasadas`}</span>}
    </button>
  )

  return (
    <div className="painel">
      <nav className="menu" aria-label="Menu">
        <div className="menu-marca">
          <img src={logo} alt="z.arb" />
          <span>assistente</span>
        </div>
        {ITENS.map(item)}
        <div className="vao" />
        {item({ id: 'config', nome: 'Configurações', icone: 'config' })}
        <div className="pessoa">
          <span className="avatar">P</span>
          <span className="pessoa-texto">
            <span>Paulo</span>
            <span>{conectado ? 'Agenda conectada' : 'Agenda desconectada'}</span>
          </span>
        </div>
      </nav>

      <main className="conteudo">
        {aba === 'conversa' && <Conversa {...p} />}
        {aba === 'hoje' && <Hoje {...p} />}
        {aba === 'tarefas' && <Tarefas tarefas={dados.tarefas} agora={agora} />}
        {aba === 'habitos' && <Habitos habitos={dados.habitos} agora={agora} />}
        {aba === 'agenda' && <Agenda dados={dados} agora={agora} irPara={setAba} />}
        {aba === 'copiados' && <Copiados copias={dados.copias} ativas={!!dados.config?.copiasAtivas} />}
        {aba === 'atalhos' && <Atalhos atalhos={dados.atalhos} />}
        {aba === 'pc' && <Pc silenciado={!!dados.config?.silenciarAvisos} />}
        {aba === 'config' && dados.config && <Configuracoes config={dados.config} chamado={p.chamado} />}
      </main>
    </div>
  )
}

// Caixa de pedido (Hoje e Conversa): escrever ou falar.
export function Compositor({ enviar, gravacao, entrada, atalhoFalar }: { enviar: (t: string) => void; gravacao: PropsPainel['gravacao']; entrada: PropsPainel['entrada']; atalhoFalar?: string }) {
  const mandar = () => {
    const el = entrada.current
    if (!el || !el.value.trim()) return
    enviar(el.value)
    el.value = ''
  }
  return (
    <form
      className="barra-campo compositor"
      onSubmit={(e) => {
        e.preventDefault()
        mandar()
      }}
    >
      <label htmlFor="pedido" className="so-leitor">
        Pedido
      </label>
      <textarea
        id="pedido"
        ref={entrada}
        rows={1}
        placeholder={gravacao.estado === 'ouvindo' ? 'Ouvindo…' : `Peça algo, ou aperte ${(atalhoFalar ?? 'Control+Shift+Space').replace('Control', 'Ctrl').replace('Space', 'Espaço').replaceAll('+', ' + ')} para falar`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            mandar()
          }
        }}
      />
      <button type="button" className={`redondo ${gravacao.estado === 'ouvindo' ? 'ouvindo' : ''}`} onClick={gravacao.alternar} aria-label={gravacao.estado === 'ouvindo' ? 'Parar de ouvir' : 'Falar'} disabled={gravacao.estado === 'transcrevendo'}>
        <Icone nome="mic" tamanho={16} />
      </button>
    </form>
  )
}

export const sair = () => api.sair()
