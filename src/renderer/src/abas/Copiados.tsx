import { useState } from 'react'
import { descreverQuando } from '../../../shared/datas'
import { buscarCopias } from '../../../shared/copias'
import type { Copia } from '../../../shared/tipos'
import { Icone } from '../icones'
import { api } from '../util'
import { Apagar, ComConfirmacao, Titulo, Vazio } from './comum'

export function Copiados({ copias, ativas }: { copias: Copia[]; ativas: boolean }) {
  const [busca, setBusca] = useState('')
  const [copiado, setCopiado] = useState<string | null>(null)
  const lista = buscarCopias(copias, busca)
  const agora = new Date()
  const fixadas = lista.filter((c) => c.fixada)
  const soltas = lista.filter((c) => !c.fixada)

  const copiar = async (id: string) => {
    await api.copiar(id)
    setCopiado(id)
    setTimeout(() => setCopiado(null), 1500)
  }

  const linha = (c: Copia) => (
    <div key={c.id} className="linha" style={{ minHeight: 52, padding: '4px 0' }}>
      <button type="button" onClick={() => copiar(c.id)} title="Clique para copiar de novo" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'left' }}>
        <span style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.4, wordBreak: 'break-word' }}>{c.texto}</span>
        <span className="meta" style={copiado === c.id ? { color: 'var(--azul-texto)' } : undefined}>
          {copiado === c.id ? 'Copiado de novo' : descreverQuando(c.em, agora)}
        </span>
      </button>
      <button type="button" className={`icone ${c.fixada ? 'ligado' : ''}`} onClick={() => api.fixarCopia(c.id, !c.fixada)} aria-label={c.fixada ? 'Desafixar' : 'Fixar'} title={c.fixada ? 'Desafixar' : 'Fixar (não some com o tempo)'}>
        <Icone nome="fixar" tamanho={16} />
      </button>
      <Apagar aoConfirmar={() => api.apagarCopia(c.id)} />
    </div>
  )

  return (
    <>
      <Titulo titulo="Copiados" sub="Clique num item para copiar de novo. Ficam 30 dias; senhas não entram.">
        <button type="button" className="link" onClick={() => api.mudarConfig({ copiasAtivas: !ativas })}>
          {ativas ? 'Pausar' : 'Retomar'}
        </button>
        {soltas.length > 0 && <ComConfirmacao rotulo="Apagar tudo" pergunta="Os fixados ficam." confirmar="Apagar" aoConfirmar={() => api.limparCopias()} />}
      </Titulo>
      <label className="busca">
        <Icone nome="busca" tamanho={16} />
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar no que você copiou" aria-label="Buscar" autoFocus />
        <span className="meta">Ctrl + Shift + V abre aqui</span>
      </label>
      {!ativas && <p className="aviso-faixa">Pausado: o que você copiar agora não fica guardado.</p>}
      <div className="rolagem">
        {lista.length ? (
          <section className="cartao" style={{ padding: '6px 18px' }}>
            {fixadas.length > 0 && <div className="grupo-rotulo">Fixados</div>}
            {fixadas.map(linha)}
            {soltas.length > 0 && fixadas.length > 0 && <div className="grupo-rotulo">Recentes</div>}
            {soltas.map(linha)}
          </section>
        ) : (
          <Vazio icone="copia" titulo={busca ? 'Nada encontrado' : 'Nada copiado ainda'}>
            {busca ? 'Tente outra palavra.' : 'O que você copiar (Ctrl+C) aparece aqui.'}
          </Vazio>
        )}
      </div>
    </>
  )
}
