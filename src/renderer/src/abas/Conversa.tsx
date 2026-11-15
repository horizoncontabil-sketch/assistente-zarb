import { useEffect, useRef } from 'react'
import { Compositor, type PropsPainel } from '../Painel'
import { Icone } from '../icones'
import { CartaoDaResposta } from './cartoes'

export function Conversa({ trocas, dados, agora, limparConversa, setAba, enviar, gravacao, entrada }: PropsPainel) {
  const fim = useRef<HTMLDivElement>(null)
  useEffect(() => {
    fim.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
  }, [trocas])

  return (
    <>
      <div className="titulo-linha" style={{ height: 28 }}>
        <h1 style={{ margin: 0, fontSize: 16, fontWeight: 600, flex: 1 }}>Conversa</h1>
        <button type="button" className="link" onClick={limparConversa}>
          Limpar
        </button>
        <button type="button" className="link" onClick={() => setAba('hoje')} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Icone nome="voltar" tamanho={14} /> Voltar para Hoje
        </button>
      </div>
      <div className="rolagem" style={{ gap: 10 }}>
        {!trocas.length && (
          <p className="nada">
            Peça escrevendo ou falando: "me lembra amanhã às 9 de ligar pra Costare", "bebi 500 ml de água", "marca reunião quinta às 14h com a Tia Nena", "abaixa o volume".
          </p>
        )}
        {trocas.map((t) => (
          <div key={t.id} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p className="fala-eu">
              {t.falado && (
                <span style={{ color: 'var(--apagado)', marginRight: 6, verticalAlign: '-2px', display: 'inline-flex' }} aria-label="falado">
                  <Icone nome="mic" tamanho={13} />
                </span>
              )}
              {t.pergunta}
            </p>
            {t.resposta === null ? (
              <div className="pensando" aria-live="polite" aria-label="Pensando">
                <i />
                <i />
                <i />
              </div>
            ) : (
              <>
                {t.resposta.texto && <p className={`fala-assistente ${t.resposta.erro ? 'erro' : ''}`}>{t.resposta.texto}</p>}
                {t.resposta.cartoes.map((c, i) => (
                  <CartaoDaResposta key={i} c={c} dados={dados} agora={agora} />
                ))}
              </>
            )}
          </div>
        ))}
        <div ref={fim} />
      </div>
      <Compositor enviar={enviar} gravacao={gravacao} entrada={entrada} atalhoFalar={dados.config?.atalhoFalar} />
    </>
  )
}
