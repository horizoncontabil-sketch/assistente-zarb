import { useState, type ReactNode } from 'react'
import { Icone, type NomeIcone } from '../icones'

export function Titulo({ titulo, sub, children }: { titulo: string; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="titulo-linha">
      <div className="titulo-bloco">
        <h1>{titulo}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {children}
    </div>
  )
}

export function Vazio({ icone, titulo, children }: { icone: NomeIcone; titulo: string; children?: ReactNode }) {
  return (
    <div className="vazio">
      <Icone nome={icone} tamanho={22} />
      <strong>{titulo}</strong>
      {children && <p>{children}</p>}
    </div>
  )
}

export function Interruptor({ ligado, aoMudar, desativado, children }: { ligado: boolean; aoMudar: (v: boolean) => void; desativado?: boolean; children: ReactNode }) {
  return (
    <label className={`interruptor ${desativado ? 'desligado-geral' : ''}`}>
      <span className="rotulo">{children}</span>
      <input type="checkbox" role="switch" checked={ligado} disabled={desativado} onChange={(e) => aoMudar(e.target.checked)} />
      <span className="trilho" aria-hidden="true" />
    </label>
  )
}

// Botão que pede confirmação antes de agir: primeiro clique mostra a pergunta, o segundo faz.
export function ComConfirmacao({ rotulo, pergunta, confirmar, aoConfirmar, pequeno = true, perigo = true }: { rotulo: ReactNode; pergunta?: string; confirmar: string; aoConfirmar: () => void; pequeno?: boolean; perigo?: boolean }) {
  const [aberto, setAberto] = useState(false)
  if (!aberto) {
    return (
      <button type="button" className={`botao ${pequeno ? 'pequeno' : ''}`} onClick={() => setAberto(true)}>
        {rotulo}
      </button>
    )
  }
  return (
    <span className="botoes" role="alertdialog" aria-label={pergunta ?? confirmar}>
      {pergunta && <span className="meta">{pergunta}</span>}
      <button
        type="button"
        className={`botao ${pequeno ? 'pequeno' : ''} ${perigo ? 'perigo' : 'principal'}`}
        onClick={() => {
          setAberto(false)
          aoConfirmar()
        }}
      >
        {confirmar}
      </button>
      <button type="button" className={`botao leve ${pequeno ? 'pequeno' : ''}`} onClick={() => setAberto(false)}>
        Cancelar
      </button>
    </span>
  )
}

export function Apagar({ aoConfirmar, rotulo = 'Apagar' }: { aoConfirmar: () => void; rotulo?: string }) {
  const [aberto, setAberto] = useState(false)
  if (aberto) {
    return (
      <span className="botoes">
        <button type="button" className="botao pequeno perigo" onClick={aoConfirmar}>
          Apagar
        </button>
        <button type="button" className="botao pequeno leve" onClick={() => setAberto(false)}>
          Cancelar
        </button>
      </span>
    )
  }
  return (
    <button type="button" className="icone" onClick={() => setAberto(true)} aria-label={rotulo} title={rotulo}>
      <Icone nome="lixo" tamanho={16} />
    </button>
  )
}

export function Mensagem({ erro, children }: { erro?: boolean; children: ReactNode }) {
  return (
    <p className={`mensagem ${erro ? 'erro' : ''}`} role={erro ? 'alert' : 'status'}>
      {children}
    </p>
  )
}
