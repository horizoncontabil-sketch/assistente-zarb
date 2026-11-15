import { descreverQuando, hora } from '../../shared/datas'
import type { Aviso } from '../../shared/tipos'
import { Icone } from './icones'
import { api, emQuanto, minutosAte } from './util'

export function Alerta({ aviso, agora, fechar, mais }: { aviso: Aviso; agora: Date; fechar: () => void; mais: number }) {
  if (aviso.tipo === 'lembrete') {
    const t = aviso.tarefa
    const feito = async (f: () => Promise<void>) => {
      await f()
      fechar()
    }
    return (
      <div className="alerta" role="alert">
        <div className="alerta-topo">
          <span className="alerta-icone lembrete">
            <Icone nome="relogio" />
          </span>
          <div className="alerta-texto">
            <span className="alerta-rotulo">{aviso.atrasado ? `Lembrete perdido · era ${descreverQuando(t.quando!, agora)}` : `Lembrete · ${hora(new Date(t.quando!))}`}</span>
            <strong>{t.titulo}</strong>
          </div>
          {mais > 0 && <span className="alerta-mais">+{mais}</span>}
        </div>
        <div className="alerta-acoes">
          <button className="primario" onClick={() => feito(() => api.concluirTarefa(t.id))}>
            <Icone nome="check" tamanho={16} /> Feito
          </button>
          <button onClick={() => feito(() => api.adiarTarefa(t.id, 10))}>10 min</button>
          <button onClick={() => feito(() => api.adiarTarefa(t.id, 60))}>1 hora</button>
          <button onClick={() => feito(() => api.adiarTarefa(t.id, amanhaAs9(agora)))}>Amanhã</button>
        </div>
      </div>
    )
  }
  const e = aviso.evento
  const min = minutosAte(e.inicio, agora)
  return (
    <div className="alerta" role="alert">
      <div className="alerta-topo">
        <span className="alerta-icone evento">
          <Icone nome="agenda" />
        </span>
        <div className="alerta-texto">
          <span className="alerta-rotulo">
            {hora(new Date(e.inicio))} · {min <= 0 ? 'começando agora' : `começa ${emQuanto(min)}`}
          </span>
          <strong>{e.titulo}</strong>
        </div>
        {mais > 0 && <span className="alerta-mais">+{mais}</span>}
      </div>
      <div className="alerta-acoes">
        {e.meet && (
          <button
            className="primario"
            onClick={() => {
              api.abrirLink(e.meet!)
              fechar()
            }}
          >
            <Icone nome="video" tamanho={16} /> Entrar no Meet
          </button>
        )}
        <button onClick={fechar}>Ok</button>
      </div>
    </div>
  )
}

// Minutos até amanhã às 9h.
function amanhaAs9(agora: Date): number {
  const d = new Date(agora)
  d.setDate(d.getDate() + 1)
  d.setHours(9, 0, 0, 0)
  return Math.round((d.getTime() - agora.getTime()) / 60_000)
}
