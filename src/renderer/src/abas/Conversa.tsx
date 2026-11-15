import { useEffect, useRef } from 'react'
import type { Troca } from '../App'
import type { Dados } from '../usarDados'
import { CartaoDaResposta } from './cartoes'

export function Conversa({ trocas, dados, agora, limpar }: { trocas: Troca[]; dados: Dados; agora: Date; limpar: () => void }) {
  const fim = useRef<HTMLDivElement>(null)
  useEffect(() => {
    fim.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
  }, [trocas])

  return (
    <div className="conversa">
      <div className="barra-acoes direita">
        <button className="discreto pequeno" onClick={limpar}>
          Limpar conversa
        </button>
      </div>
      {trocas.map((t) => (
        <div key={t.id} className="troca">
          <p className="fala eu">{t.pergunta}</p>
          {t.resposta === null ? (
            <p className="fala assistente pensando" aria-live="polite">
              <i />
              <i />
              <i />
            </p>
          ) : (
            <>
              {t.resposta.texto && <p className={`fala assistente ${t.resposta.erro ? 'erro' : ''}`}>{t.resposta.texto}</p>}
              {t.resposta.cartoes.map((c, i) => (
                <CartaoDaResposta key={i} c={c} dados={dados} agora={agora} />
              ))}
            </>
          )}
        </div>
      ))}
      <div ref={fim} />
    </div>
  )
}
