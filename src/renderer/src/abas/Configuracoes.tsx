import { useEffect, useState, type ReactNode } from 'react'
import { aceleradorDaTecla, aceleradorLegivel } from '../../../shared/atalho'
import type { Configuracoes as Config, QualAtalho } from '../../../shared/tipos'
import { Icone } from '../icones'
import { api } from '../util'
import { BotaoApagar, Mensagem, Secao } from './comum'

type Aviso = { tipo: 'ok' | 'erro'; texto: string } | null

export function Configuracoes({ config: c, chamado }: { config: Config; chamado: string }) {
  const [aviso, setAviso] = useState<Aviso>(null)
  const mostrar = (r: { ok: true } | { ok: false; erro: string }, ok: string) => setAviso(r.ok ? { tipo: 'ok', texto: ok } : { tipo: 'erro', texto: r.erro })

  return (
    <div className="aba-conteudo config">
      {aviso && <Mensagem tipo={aviso.tipo}>{aviso.texto}</Mensagem>}

      <Secao titulo="Groq (inteligência e voz)">
        <ChaveGroq tem={c.temChaveGroq} mostrar={mostrar} />
        <CampoTexto rotulo="Modelo" valor={c.modelo} aoSalvar={(v) => api.mudarConfig({ modelo: v }).then(() => setAviso({ tipo: 'ok', texto: 'Modelo salvo.' }))} />
      </Secao>

      <Secao titulo="Google Agenda">
        <Google c={c} mostrar={mostrar} />
      </Secao>

      <Secao titulo="Voz">
        <Interruptor ligado={c.responderFalando} aoMudar={(v) => api.mudarConfig({ responderFalando: v })}>
          Responder falando quando eu falar
        </Interruptor>
        <Interruptor ligado={c.chamadoPorVoz} desativado={!c.modeloVozDisponivel} aoMudar={(v) => api.mudarConfig({ chamadoPorVoz: v })}>
          Chamar dizendo "Ei, Zarb"
          <small>
            {!c.modeloVozDisponivel
              ? 'Reconhecedor offline não veio neste instalador.'
              : !c.chamadoPorVoz
                ? 'O microfone fica ligado, mas o som só é analisado no próprio PC.'
                : chamado === 'escutando'
                  ? 'Escutando. O "z" do entalho fica com um ponto azul.'
                  : chamado === 'carregando'
                    ? 'Carregando o reconhecedor…'
                    : chamado === 'erro'
                      ? 'Não consegui ligar o microfone ou o reconhecedor.'
                      : ''}
          </small>
        </Interruptor>
      </Secao>

      <Secao titulo="Atalhos de teclado">
        <GravarAtalho qual="atalhoAbrir" rotulo="Abrir e recolher" valor={c.atalhoAbrir} mostrar={mostrar} />
        <GravarAtalho qual="atalhoFalar" rotulo="Falar" valor={c.atalhoFalar} mostrar={mostrar} />
        <GravarAtalho qual="atalhoCopiados" rotulo="Copiados" valor={c.atalhoCopiados} mostrar={mostrar} />
        <p className="discreto-texto">Use Ctrl, Alt ou Win com outra tecla, ou uma tecla F sozinha.</p>
      </Secao>

      <Secao titulo="Claude Code">
        <PastasClaude c={c} mostrar={mostrar} />
      </Secao>

      <Secao titulo="Geral">
        <Interruptor ligado={c.entalhoSempreVisivel} aoMudar={(v) => api.mudarConfig({ entalhoSempreVisivel: v })}>
          Entalho sempre visível no topo da tela
        </Interruptor>
        <Interruptor ligado={c.iniciarComWindows} aoMudar={(v) => api.definirIniciarComWindows(v)}>
          Abrir junto com o Windows
        </Interruptor>
        <Interruptor ligado={c.copiasAtivas} aoMudar={(v) => api.mudarConfig({ copiasAtivas: v })}>
          Guardar o histórico do que copio
        </Interruptor>
        <div className="botoes">
          <button className="discreto" onClick={() => api.sair()}>
            <Icone nome="sair" tamanho={16} /> Fechar o assistente
          </button>
        </div>
      </Secao>
    </div>
  )
}

function Interruptor({ ligado, aoMudar, desativado, children }: { ligado: boolean; aoMudar: (v: boolean) => void; desativado?: boolean; children: ReactNode }) {
  return (
    <label className={`interruptor ${desativado ? 'desativado' : ''}`}>
      <span className="interruptor-texto">{children}</span>
      <input type="checkbox" role="switch" checked={ligado} disabled={desativado} onChange={(e) => aoMudar(e.target.checked)} />
      <span className="trilho" aria-hidden="true" />
    </label>
  )
}

function CampoTexto({ rotulo, valor, aoSalvar }: { rotulo: string; valor: string; aoSalvar: (v: string) => void }) {
  const [v, setV] = useState(valor)
  useEffect(() => setV(valor), [valor])
  return (
    <form
      className="campo"
      onSubmit={(e) => {
        e.preventDefault()
        aoSalvar(v.trim())
      }}
    >
      <span>{rotulo}</span>
      <input value={v} onChange={(e) => setV(e.target.value)} aria-label={rotulo} />
      <button type="submit" className="pequeno" disabled={!v.trim() || v.trim() === valor}>
        Salvar
      </button>
    </form>
  )
}

function ChaveGroq({ tem, mostrar }: { tem: boolean; mostrar: (r: { ok: true } | { ok: false; erro: string }, ok: string) => void }) {
  const [chave, setChave] = useState('')
  return (
    <>
      <p className="discreto-texto">
        {tem ? 'Chave guardada no cofre do Windows.' : 'Crie uma chave grátis em console.groq.com (API Keys) e cole aqui.'}
      </p>
      <form
        className="campo"
        onSubmit={async (e) => {
          e.preventDefault()
          const r = await api.definirChaveGroq(chave)
          if (r.ok) setChave('')
          mostrar(r, 'Chave guardada no cofre do Windows.')
        }}
      >
        <span>Chave</span>
        <input type="password" value={chave} onChange={(e) => setChave(e.target.value)} placeholder={tem ? 'Colar chave nova' : 'gsk_…'} aria-label="Chave da Groq" autoComplete="off" />
        <button type="submit" className="primario pequeno" disabled={!chave.trim()}>
          Salvar
        </button>
        {tem && <BotaoApagar rotulo="Apagar a chave" aoConfirmar={() => api.apagarChaveGroq()} />}
      </form>
    </>
  )
}

function Google({ c, mostrar }: { c: Config; mostrar: (r: { ok: true } | { ok: false; erro: string }, ok: string) => void }) {
  const [id, setId] = useState('')
  const [segredo, setSegredo] = useState('')
  const [conectando, setConectando] = useState(false)
  const [trocar, setTrocar] = useState(false)

  if (!c.google.temCliente || trocar) {
    return (
      <form
        className="formulario"
        onSubmit={async (e) => {
          e.preventDefault()
          const r = await api.definirClienteGoogle(id, segredo)
          if (r.ok) {
            setId('')
            setSegredo('')
            setTrocar(false)
          }
          mostrar(r, 'Cliente do Google salvo. Agora clique em Conectar.')
        }}
      >
        <p className="discreto-texto">
          Uma vez só: no Google Cloud da Zarb, crie um "ID do cliente OAuth" do tipo App para computador e cole o ID e a chave secreta aqui. O passo a passo está no LEIA-ME do projeto.
        </p>
        <input value={id} onChange={(e) => setId(e.target.value)} placeholder="ID do cliente (…apps.googleusercontent.com)" aria-label="ID do cliente" />
        <input type="password" value={segredo} onChange={(e) => setSegredo(e.target.value)} placeholder="Chave secreta do cliente" aria-label="Chave secreta" autoComplete="off" />
        <div className="botoes">
          <button type="submit" className="primario" disabled={!id.trim() || !segredo.trim()}>
            Salvar
          </button>
          {trocar && (
            <button type="button" className="discreto" onClick={() => setTrocar(false)}>
              Cancelar
            </button>
          )}
        </div>
      </form>
    )
  }

  if (!c.google.conectado) {
    return (
      <div className="formulario">
        <p className="discreto-texto">O navegador vai abrir para você entrar com a conta da Zarb e liberar a agenda.</p>
        <div className="botoes">
          <button
            className="primario"
            disabled={conectando}
            onClick={async () => {
              setConectando(true)
              mostrar(await api.conectarGoogle(), 'Agenda conectada.')
              setConectando(false)
            }}
          >
            {conectando ? 'Esperando o login no navegador…' : 'Conectar o Google Agenda'}
          </button>
          <button className="discreto" onClick={() => setTrocar(true)}>
            Trocar cliente
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="conectado">
        <span className="ponto-ok" />
        <span>Conectado{c.google.email ? ` como ${c.google.email}` : ''}</span>
        <button className="discreto pequeno" onClick={() => api.desconectarGoogle()}>
          Desconectar
        </button>
      </div>
      <label className="campo">
        <span>Avisar antes</span>
        <select value={c.avisoEventoMin} onChange={(e) => api.mudarConfig({ avisoEventoMin: Number(e.target.value) })} aria-label="Avisar antes da reunião">
          {[0, 1, 5, 10, 15, 30].map((m) => (
            <option key={m} value={m}>
              {m === 0 ? 'Na hora' : `${m} min`}
            </option>
          ))}
        </select>
      </label>
      <Interruptor ligado={c.copiarLembretesParaAgenda} aoMudar={(v) => api.mudarConfig({ copiarLembretesParaAgenda: v })}>
        Copiar lembretes para o Agenda
        <small>Assim eles chegam também no celular, pelo app do Google.</small>
      </Interruptor>
    </>
  )
}

function GravarAtalho({ qual, rotulo, valor, mostrar }: { qual: QualAtalho; rotulo: string; valor: string; mostrar: (r: { ok: true } | { ok: false; erro: string }, ok: string) => void }) {
  const [gravando, setGravando] = useState(false)
  useEffect(() => {
    if (!gravando) return
    document.body.dataset.gravandoAtalho = '1'
    api.pausarAtalhos(true)
    const parar = () => {
      window.removeEventListener('keydown', tecla, true)
      delete document.body.dataset.gravandoAtalho
      setGravando(false)
      return api.pausarAtalhos(false)
    }
    const tecla = async (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.key === 'Escape') return parar()
      const acc = aceleradorDaTecla(e)
      if (!acc) return
      await parar()
      mostrar(await api.definirAtalho(qual, acc), `Atalho "${rotulo}" salvo.`)
    }
    window.addEventListener('keydown', tecla, true)
    return () => {
      window.removeEventListener('keydown', tecla, true)
      delete document.body.dataset.gravandoAtalho
    }
  }, [gravando])
  return (
    <div className="campo">
      <span>{rotulo}</span>
      <kbd className={gravando ? 'gravando' : ''}>{gravando ? 'Aperte a combinação… (Esc cancela)' : aceleradorLegivel(valor)}</kbd>
      <button className="pequeno" onClick={() => setGravando(true)} disabled={gravando}>
        Trocar
      </button>
    </div>
  )
}

function PastasClaude({ c, mostrar }: { c: Config; mostrar: (r: { ok: true } | { ok: false; erro: string }, ok: string) => void }) {
  const [nome, setNome] = useState('')
  const [caminho, setCaminho] = useState('')
  return (
    <>
      <p className="discreto-texto">
        Os projetos onde você pede coisas ao Claude Code falando. Ele abre numa janela do terminal e continua pedindo sua aprovação antes de editar ou rodar algo.
      </p>
      {c.pastasClaude.length > 0 && (
        <ul className="lista">
          {c.pastasClaude.map((p) => (
            <li key={p.id} className="linha">
              <span className="atalho-icone programa">
                <Icone nome="terminal" tamanho={16} />
              </span>
              <div className="linha-texto">
                <strong>{p.nome}</strong>
                <span>{p.caminho}</span>
              </div>
              <div className="linha-acoes">
                <BotaoApagar aoConfirmar={() => api.apagarPastaClaude(p.id)} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <form
        className="campo"
        onSubmit={async (e) => {
          e.preventDefault()
          const r = await api.salvarPastaClaude(nome, caminho)
          if (r.ok) {
            setNome('')
            setCaminho('')
          }
          mostrar(r, 'Pasta salva.')
        }}
      >
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome (ex.: zarb-os)" aria-label="Nome do projeto" />
        <button
          type="button"
          className="pequeno"
          onClick={async () => {
            const p = await api.escolherPasta()
            if (p) {
              setCaminho(p)
              if (!nome) setNome(p.split('\\').pop() ?? '')
            }
          }}
        >
          {caminho ? caminho.split('\\').pop() : 'Escolher pasta…'}
        </button>
        <button type="submit" className="primario pequeno" disabled={!nome.trim() || !caminho}>
          Adicionar
        </button>
      </form>
    </>
  )
}
