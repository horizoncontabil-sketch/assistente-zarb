import type { ReactNode } from 'react'
import { hora } from '../../shared/datas'
import { numero, progresso } from '../../shared/habitos'
import type { Aviso } from '../../shared/tipos'
import { unidade } from './abas/Habitos'
import { Icone } from './icones'
import { api, emQuanto, minutosAte } from './util'

type Props = { aviso: Aviso; agora: Date; fechar: () => void; marca: ReactNode; mais: number }

export function Avisos({ aviso, agora, fechar, marca, mais }: Props) {
  const e = (f: () => Promise<unknown>) => async () => {
    await f()
    fechar()
  }
  const extra = mais > 0 ? <span className="selo">+{mais}</span> : null

  if (aviso.tipo === 'lembrete') {
    const t = aviso.tarefa
    return (
      <div className="aviso" role="alert">
        <div className="aviso-topo">
          <span style={{ color: 'var(--ambar)', display: 'grid' }}>
            <Icone nome="relogio" tamanho={22} />
          </span>
          <span className="aviso-texto">
            <small>Lembrete · {hora(new Date(t.quando!))}</small>
            <strong>{t.titulo}</strong>
          </span>
          {extra}
        </div>
        <div className="aviso-acoes">
          <button type="button" className="botao principal grande" onClick={e(() => api.concluirTarefa(t.id))}>
            Feito
          </button>
          <button type="button" className="botao" onClick={e(() => api.adiarTarefa(t.id, 10))}>
            10 min
          </button>
          <button type="button" className="botao" onClick={e(() => api.adiarTarefa(t.id, 60))}>
            1 hora
          </button>
          <button type="button" className="botao" onClick={e(() => api.adiarTarefa(t.id, minutosAteAmanha9(agora)))}>
            Amanhã
          </button>
        </div>
      </div>
    )
  }

  if (aviso.tipo === 'habito') {
    const h = aviso.habito
    return (
      <div className="aviso" role="alert">
        <div className="aviso-topo">
          <span style={{ color: 'var(--azul)', display: 'grid' }}>
            <Icone nome="habito" tamanho={22} />
          </span>
          <span className="aviso-texto">
            <small>Hábito{h.meta ? ` · ${progresso(h, agora).texto}` : ''}</small>
            <strong>{h.nome}</strong>
          </span>
          {extra}
        </div>
        <div className="aviso-acoes">
          <button type="button" className="botao principal grande" onClick={e(() => api.registrarHabito(h.id, h.meta ? h.meta.passo : 1))}>
            {h.meta ? `+ ${numero(h.meta.passo)} ${unidade(h.meta.passo, h.meta.unidade)}` : 'Feito'}
          </button>
          <button type="button" className="botao" onClick={fechar}>
            Depois
          </button>
        </div>
      </div>
    )
  }

  const ev = aviso.evento
  const min = minutosAte(ev.inicio, agora)
  // 10 minutos antes: só um toque. 1 minuto antes: o aviso com o botão de entrar.
  if (aviso.marco > 1) {
    return (
      <button type="button" className="pilula" onClick={fechar} aria-label={`${ev.titulo} em ${min} minutos. Clique para dispensar.`}>
        {marca}
        <span className="linha-suave" style={{ color: '#fff' }}>
          {ev.titulo}
        </span>
        <span className="chip">{min <= 0 ? 'agora' : emQuanto(min)}</span>
      </button>
    )
  }
  return (
    <div className="aviso" role="alert">
      <div className="aviso-topo">
        <span style={{ color: 'var(--azul)', display: 'grid' }}>
          <Icone nome="video" tamanho={22} />
        </span>
        <span className="aviso-texto">
          <small style={{ color: 'var(--azul-texto)' }}>
            {hora(new Date(ev.inicio))} · {min <= 0 ? 'começando agora' : `começa ${emQuanto(min)}`}
          </small>
          <strong>{ev.titulo}</strong>
        </span>
        {extra}
      </div>
      <div className="aviso-acoes">
        {ev.meet ? (
          <button type="button" className="botao principal grande" onClick={e(() => api.abrirLink(ev.meet!))}>
            Entrar no Meet
          </button>
        ) : ev.link ? (
          <button type="button" className="botao principal grande" onClick={e(() => api.abrirLink(ev.link!))}>
            Abrir na agenda
          </button>
        ) : null}
        <button type="button" className="botao" onClick={fechar}>
          Agora não
        </button>
      </div>
    </div>
  )
}

function minutosAteAmanha9(agora: Date): number {
  const d = new Date(agora)
  d.setDate(d.getDate() + 1)
  d.setHours(9, 0, 0, 0)
  return Math.round((d.getTime() - agora.getTime()) / 60_000)
}
