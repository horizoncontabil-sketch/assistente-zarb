import { useState, type ReactNode } from 'react'
import { Icone, type NomeIcone } from '../icones'

export function Vazio({ icone, titulo, children }: { icone: NomeIcone; titulo: string; children?: ReactNode }) {
  return (
    <div className="vazio">
      <span className="vazio-icone">
        <Icone nome={icone} tamanho={22} />
      </span>
      <strong>{titulo}</strong>
      {children && <p>{children}</p>}
    </div>
  )
}

export function Secao({ titulo, acao, children }: { titulo: string; acao?: ReactNode; children: ReactNode }) {
  return (
    <section className="secao">
      <div className="secao-topo">
        <h2>{titulo}</h2>
        {acao}
      </div>
      {children}
    </section>
  )
}

// Botão de apagar que pede confirmação no próprio botão (clique duplo intencional).
export function BotaoApagar({ aoConfirmar, rotulo = 'Apagar' }: { aoConfirmar: () => void; rotulo?: string }) {
  const [confirmando, setConfirmando] = useState(false)
  if (confirmando) {
    return (
      <span className="confirmar">
        <button className="perigo" onClick={aoConfirmar}>
          Confirmar
        </button>
        <button className="discreto" onClick={() => setConfirmando(false)}>
          Cancelar
        </button>
      </span>
    )
  }
  return (
    <button className="icone-botao pequeno" onClick={() => setConfirmando(true)} aria-label={rotulo} title={rotulo}>
      <Icone nome="lixo" tamanho={16} />
    </button>
  )
}

export function Mensagem({ tipo, children }: { tipo: 'ok' | 'erro'; children: ReactNode }) {
  return (
    <p className={`mensagem-${tipo}`} role={tipo === 'erro' ? 'alert' : 'status'}>
      {children}
    </p>
  )
}
