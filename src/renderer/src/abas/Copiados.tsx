import { useState } from 'react'
import { descreverQuando } from '../../../shared/datas'
import { buscarCopias } from '../../../shared/copias'
import type { Copia } from '../../../shared/tipos'
import { Icone } from '../icones'
import { api } from '../util'
import { BotaoApagar, Vazio } from './comum'

export function Copiados({ copias, ativas }: { copias: Copia[]; ativas: boolean }) {
  const [busca, setBusca] = useState('')
  const [copiado, setCopiado] = useState<string | null>(null)
  const lista = buscarCopias(copias, busca)
  const agora = new Date()

  const copiar = async (id: string) => {
    await api.copiar(id)
    setCopiado(id)
    setTimeout(() => setCopiado(null), 1500)
  }

  return (
    <div className="aba-conteudo">
      <div className="barra-acoes">
        <label className="busca">
          <Icone nome="busca" tamanho={16} />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar no que você copiou" aria-label="Buscar" autoFocus />
        </label>
        <button className="pequeno" onClick={() => api.mudarConfig({ copiasAtivas: !ativas })}>
          {ativas ? 'Pausar' : 'Retomar'}
        </button>
        {copias.some((c) => !c.fixada) && <BotaoApagar rotulo="Apagar tudo (menos fixados)" aoConfirmar={() => api.limparCopias()} />}
      </div>
      {!ativas && <p className="aviso-faixa">Histórico pausado: o que você copiar agora não fica guardado.</p>}
      {lista.length ? (
        <ul className="lista copias">
          {lista.map((c) => (
            <li key={c.id} className={`linha copia ${c.fixada ? 'fixada' : ''}`}>
              <button className="copia-texto" onClick={() => copiar(c.id)} title="Clique para copiar de novo">
                <span>{c.texto.length > 280 ? c.texto.slice(0, 280) + '…' : c.texto}</span>
                <small>{copiado === c.id ? 'Copiado' : descreverQuando(c.em, agora)}</small>
              </button>
              <div className="linha-acoes">
                <button
                  className={`icone-botao pequeno ${c.fixada ? 'ligado' : ''}`}
                  onClick={() => api.fixarCopia(c.id, !c.fixada)}
                  aria-label={c.fixada ? 'Desafixar' : 'Fixar'}
                  title={c.fixada ? 'Desafixar' : 'Fixar (não some com o tempo)'}
                >
                  <Icone nome="fixar" tamanho={16} />
                </button>
                <BotaoApagar aoConfirmar={() => api.apagarCopia(c.id)} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <Vazio icone="copia" titulo={busca ? 'Nada encontrado' : 'Nada copiado ainda'}>
          {busca ? 'Tente outra palavra.' : 'O que você copiar (Ctrl+C) aparece aqui por 30 dias. Senhas de gerenciadores ficam de fora.'}
        </Vazio>
      )}
    </div>
  )
}
