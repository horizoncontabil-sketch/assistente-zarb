import { useState } from 'react'
import { descreverQuando, descreverRepetir, hora } from '../../../shared/datas'
import type { Evento, Repetir, Tarefa } from '../../../shared/tipos'
import { Icone } from '../icones'
import { api, doCampo, emQuanto, minutosAte, paraCampo } from '../util'
import { BotaoApagar } from './comum'

export function LinhaEvento({ e, agora }: { e: Evento; agora: Date }) {
  const min = minutosAte(e.inicio, agora)
  const agoraAcontecendo = !e.diaInteiro && min <= 0 && new Date(e.fim) > agora
  const passou = !e.diaInteiro && new Date(e.fim) <= agora
  return (
    <li className={`linha ${passou ? 'passou' : ''} ${agoraAcontecendo ? 'acontecendo' : ''}`}>
      <span className="linha-hora">{e.diaInteiro ? 'Dia todo' : hora(new Date(e.inicio))}</span>
      <span className="linha-barra evento" />
      <div className="linha-texto">
        <strong>{e.titulo}</strong>
        <span>
          {agoraAcontecendo ? 'Acontecendo agora' : !e.diaInteiro && !passou && min <= 180 ? `Começa ${emQuanto(min)}` : !e.diaInteiro ? `até ${hora(new Date(e.fim))}` : ''}
          {e.local ? ` · ${e.local}` : ''}
        </span>
      </div>
      <div className="linha-acoes">
        {e.meet && !passou && (
          <button className={agoraAcontecendo || (min >= 0 && min <= 15) ? 'primario pequeno' : 'pequeno'} onClick={() => api.abrirLink(e.meet!)}>
            <Icone nome="video" tamanho={15} /> Meet
          </button>
        )}
        {e.link && (
          <button className="icone-botao pequeno" onClick={() => api.abrirLink(e.link!)} aria-label="Abrir no Google Agenda" title="Abrir no Google Agenda">
            <Icone nome="link" tamanho={16} />
          </button>
        )}
      </div>
    </li>
  )
}

export function LinhaTarefa({ t, agora }: { t: Tarefa; agora: Date }) {
  const [editando, setEditando] = useState(false)
  const atrasada = !t.feita && t.quando && new Date(t.quando) <= agora
  const rep = descreverRepetir(t.repetir)
  if (editando) return <EditarTarefa t={t} fechar={() => setEditando(false)} />
  return (
    <li className={`linha tarefa ${t.feita ? 'feita' : ''} ${atrasada ? 'atrasada' : ''}`}>
      <button
        className={`marcar ${t.feita ? 'marcada' : ''}`}
        onClick={() => (t.feita ? api.reabrirTarefa(t.id) : api.concluirTarefa(t.id))}
        aria-label={t.feita ? `Reabrir ${t.titulo}` : `Marcar ${t.titulo} como feita`}
      >
        {t.feita && <Icone nome="check" tamanho={14} />}
      </button>
      <div className="linha-texto">
        <strong>{t.titulo}</strong>
        {(t.quando || rep) && (
          <span>
            {t.quando && <>{atrasada ? 'Era ' : ''}{descreverQuando(t.quando, agora)}</>}
            {rep && <span className="selo">{rep}</span>}
          </span>
        )}
      </div>
      <div className="linha-acoes">
        {atrasada && (
          <button className="pequeno" onClick={() => api.adiarTarefa(t.id, 60)}>
            +1 hora
          </button>
        )}
        {!t.feita && (
          <button className="icone-botao pequeno" onClick={() => setEditando(true)} aria-label="Editar" title="Editar">
            <Icone nome="editar" tamanho={16} />
          </button>
        )}
        <BotaoApagar aoConfirmar={() => api.apagarTarefa(t.id)} />
      </div>
    </li>
  )
}

export const OPCOES_REPETIR: { v: string; nome: string }[] = [
  { v: '', nome: 'Não repete' },
  { v: 'diario', nome: 'Todo dia' },
  { v: 'dias_uteis', nome: 'Dias úteis' },
  { v: 'semanal', nome: 'Toda semana' },
  { v: 'mensal', nome: 'Todo mês' },
]

function EditarTarefa({ t, fechar }: { t: Tarefa; fechar: () => void }) {
  const [titulo, setTitulo] = useState(t.titulo)
  const [quando, setQuando] = useState(paraCampo(t.quando))
  const [repetir, setRepetir] = useState(t.repetir ?? '')
  const [erro, setErro] = useState<string | null>(null)
  const salvar = async () => {
    const r = await api.editarTarefa(t.id, titulo, doCampo(quando), (repetir || null) as Repetir)
    if (!r.ok) return setErro(r.erro)
    fechar()
  }
  return (
    <li className="linha editando">
      <div className="formulario">
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} aria-label="Tarefa" autoFocus />
        <div className="linha-campos">
          <input type="datetime-local" value={quando} onChange={(e) => setQuando(e.target.value)} aria-label="Quando" />
          <select value={repetir} onChange={(e) => setRepetir(e.target.value)} disabled={!quando} aria-label="Repetir">
            {OPCOES_REPETIR.map((o) => (
              <option key={o.v} value={o.v}>
                {o.nome}
              </option>
            ))}
          </select>
        </div>
        {erro && <p className="mensagem-erro">{erro}</p>}
        <div className="botoes">
          <button className="primario" onClick={salvar} disabled={!titulo.trim()}>
            Salvar
          </button>
          <button className="discreto" onClick={fechar}>
            Cancelar
          </button>
        </div>
      </div>
    </li>
  )
}
