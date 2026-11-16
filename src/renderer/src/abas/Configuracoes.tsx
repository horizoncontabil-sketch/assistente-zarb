import { useEffect, useState, type ReactNode } from 'react'
import { aceleradorDaTecla, aceleradorLegivel } from '../../../shared/atalho'
import type { Atualizacao, Configuracoes as Config, Ok, QualAtalho } from '../../../shared/tipos'
import { api } from '../util'
import { Apagar, Interruptor, Mensagem, Titulo } from './comum'

type Mostrar = (r: Ok, ok: string) => void

function Secao({ titulo, texto, children }: { titulo: string; texto: string; children: ReactNode }) {
  return (
    <section className="config-secao">
      <div className="config-rotulo">
        <strong>{titulo}</strong>
        <span>{texto}</span>
      </div>
      <div className="config-painel">{children}</div>
    </section>
  )
}

export function Configuracoes({ config: c, chamado }: { config: Config; chamado: string }) {
  const [aviso, setAviso] = useState<{ texto: string; erro?: boolean } | null>(null)
  const mostrar: Mostrar = (r, ok) => setAviso(r.ok ? { texto: ok } : { texto: r.erro, erro: true })

  return (
    <>
      <Titulo titulo="Configurações" />
      {aviso && <Mensagem erro={aviso.erro}>{aviso.texto}</Mensagem>}
      <div className="rolagem">
        <Secao titulo="Celular" texto="Tarefas e hábitos iguais no PC e no app do iPhone. Entre com o mesmo e-mail e senha do app.">
          <Nuvem c={c} mostrar={mostrar} />
        </Secao>

        <Secao titulo="Conta Google" texto="Agenda do dia, aviso antes das reuniões e eventos marcados falando.">
          <Google c={c} mostrar={mostrar} />
        </Secao>

        <Secao titulo="Onde fica o entalho" texto="Ou segure e arraste o entalho na tela: ele gruda na borda mais próxima.">
          <div className="segmentos" role="radiogroup" aria-label="Borda" style={{ alignSelf: 'flex-start', background: 'var(--chao)', marginTop: 4 }}>
            {(['topo', 'baixo', 'esquerda', 'direita'] as const).map((b) => (
              <button key={b} type="button" role="radio" aria-checked={c.posicao.borda === b} className={c.posicao.borda === b ? 'ativo' : ''} onClick={() => api.definirPosicao({ borda: b, fracao: 0.5 })}>
                {{ topo: 'Topo', baixo: 'Embaixo', esquerda: 'Esquerda', direita: 'Direita' }[b]}
              </button>
            ))}
          </div>
          <Interruptor ligado={c.entalhoSempreVisivel} aoMudar={(v) => api.mudarConfig({ entalhoSempreVisivel: v })}>
            Sempre visível
          </Interruptor>
        </Secao>

        <Secao titulo="Atalhos de teclado" texto="Clique em Trocar e aperte a combinação que quiser.">
          <GravarAtalho qual="atalhoAbrir" rotulo="Abrir e recolher" valor={c.atalhoAbrir} mostrar={mostrar} />
          <GravarAtalho qual="atalhoFalar" rotulo="Falar" valor={c.atalhoFalar} mostrar={mostrar} />
          <GravarAtalho qual="atalhoCopiados" rotulo="Copiados" valor={c.atalhoCopiados} mostrar={mostrar} />
        </Secao>

        <Secao titulo="Voz" texto='O "Ei, Zarb" ouve só no seu PC; nada sai antes do chamado.'>
          <Interruptor ligado={c.responderFalando} aoMudar={(v) => api.mudarConfig({ responderFalando: v })}>
            <span>Responder falando quando eu falar</span>
            <small>Se ele perguntar algo, volta a ouvir sozinho</small>
          </Interruptor>
          <Interruptor ligado={c.chamadoPorVoz} desativado={!c.modeloVozDisponivel} aoMudar={(v) => api.mudarConfig({ chamadoPorVoz: v })}>
            <span>Chamar dizendo "Ei, Zarb"</span>
            <small>
              {!c.modeloVozDisponivel
                ? 'O reconhecedor offline não veio nesta versão.'
                : !c.chamadoPorVoz
                  ? 'Deixa o microfone ligado, com o som analisado só no PC.'
                  : { escutando: 'Escutando. O "z." do entalho ganha um ponto azul.', carregando: 'Carregando o reconhecedor…', erro: 'Não consegui ligar o microfone ou o reconhecedor.' }[chamado] ?? ''}
            </small>
          </Interruptor>
        </Secao>

        <Secao titulo="Inteligência" texto="A Groq entende o que você fala e escreve. Plano grátis.">
          <ChaveGroq tem={c.temChaveGroq} mostrar={mostrar} />
          <CampoLinha rotulo="Modelo" valor={c.modelo} aoSalvar={(v) => api.mudarConfig({ modelo: v }).then(() => setAviso({ texto: 'Modelo salvo.' }))} />
        </Secao>

        <Secao titulo="Claude Code" texto="Os projetos onde você pede coisas ao Claude Code falando. Ele pede aprovação antes de mexer.">
          <PastasClaude c={c} mostrar={mostrar} />
        </Secao>

        <Secao titulo="Versão" texto="As versões novas chegam e se instalam sozinhas, só se a assinatura for a nossa.">
          <Versao c={c} />
        </Secao>

        <Secao titulo="Geral" texto="">
          <Interruptor ligado={c.iniciarComWindows} aoMudar={(v) => api.definirIniciarComWindows(v)}>
            Abrir junto com o Windows
          </Interruptor>
          <Interruptor ligado={c.copiasAtivas} aoMudar={(v) => api.mudarConfig({ copiasAtivas: v })}>
            Guardar o histórico do que copio
          </Interruptor>
          <Interruptor ligado={c.silenciarAvisos} aoMudar={(v) => api.mudarConfig({ silenciarAvisos: v })}>
            Silenciar avisos do Windows
          </Interruptor>
          <div className="botoes" style={{ padding: '6px 0' }}>
            <button type="button" className="botao leve" onClick={() => api.sair()}>
              Fechar o assistente
            </button>
          </div>
        </Secao>
      </div>
    </>
  )
}

function Google({ c, mostrar }: { c: Config; mostrar: Mostrar }) {
  const [entrando, setEntrando] = useState(false)
  const [manual, setManual] = useState(false)
  const [id, setId] = useState('')
  const [segredo, setSegredo] = useState('')

  if (c.google.conectado) {
    return (
      <>
        <div className="linha">
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--verde)' }} />
          <span style={{ flex: 1 }}>Conectado{c.google.email ? ` como ${c.google.email}` : ''}</span>
          <button type="button" className="link" onClick={() => api.desconectarGoogle()}>
            Sair
          </button>
        </div>
        <label className="linha">
          <span style={{ flex: 1 }}>Avisar antes da reunião</span>
          <select className="selecao" value={c.avisoEventoMin} onChange={(e) => api.mudarConfig({ avisoEventoMin: Number(e.target.value) })}>
            {[5, 10, 15, 30].map((m) => (
              <option key={m} value={m}>
                {m} min
              </option>
            ))}
          </select>
        </label>
        <span className="meta">E de novo 1 minuto antes, com o botão Entrar no Meet.</span>
        <Interruptor ligado={c.copiarLembretesParaAgenda} aoMudar={(v) => api.mudarConfig({ copiarLembretesParaAgenda: v })}>
          <span>Copiar lembretes para o Agenda</span>
          <small>Assim eles chegam também no celular, pelo app do Google</small>
        </Interruptor>
      </>
    )
  }

  return (
    <div className="formulario" style={{ padding: '6px 0' }}>
      <div className="linha">
        <button
          type="button"
          className="botao principal alto"
          disabled={entrando || !c.google.temCliente}
          onClick={async () => {
            setEntrando(true)
            mostrar(await api.conectarGoogle(), 'Agenda conectada.')
            setEntrando(false)
          }}
        >
          <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#e8eaed', color: '#1f1f1f', fontSize: 13, fontWeight: 600, display: 'grid', placeItems: 'center' }}>G</span>
          {entrando ? 'Esperando o login no navegador…' : 'Entrar com Google'}
        </button>
        <span className="meta" style={{ flex: 1 }}>
          {c.google.temCliente ? 'Abre o navegador para você entrar com a conta da Zarb. Uma vez só.' : 'O login do Google ainda não veio configurado nesta versão.'}
        </span>
      </div>
      {!c.google.temCliente && !manual && (
        <button type="button" className="link" style={{ alignSelf: 'flex-start' }} onClick={() => setManual(true)}>
          Configurar à mão
        </button>
      )}
      {manual && (
        <form
          className="formulario"
          onSubmit={async (e) => {
            e.preventDefault()
            const r = await api.definirClienteGoogle(id, segredo)
            if (r.ok) setManual(false)
            mostrar(r, 'Pronto. Agora clique em Entrar com Google.')
          }}
        >
          <input className="campo-texto" value={id} onChange={(e) => setId(e.target.value)} placeholder="ID do cliente (…apps.googleusercontent.com)" aria-label="ID do cliente" />
          <input className="campo-texto" type="password" value={segredo} onChange={(e) => setSegredo(e.target.value)} placeholder="Chave secreta do cliente" aria-label="Chave secreta" autoComplete="off" />
          <div className="botoes">
            <button type="submit" className="botao principal" disabled={!id.trim() || !segredo.trim()}>
              Salvar
            </button>
            <button type="button" className="botao leve" onClick={() => setManual(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

function GravarAtalho({ qual, rotulo, valor, mostrar }: { qual: QualAtalho; rotulo: string; valor: string; mostrar: Mostrar }) {
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
    <div className="linha">
      <span style={{ flex: 1 }}>{rotulo}</span>
      <kbd className={gravando ? 'gravando' : ''}>{gravando ? 'Aperte a combinação… (Esc cancela)' : aceleradorLegivel(valor)}</kbd>
      <button type="button" className="link" onClick={() => setGravando(true)} disabled={gravando}>
        Trocar
      </button>
    </div>
  )
}

function ChaveGroq({ tem, mostrar }: { tem: boolean; mostrar: Mostrar }) {
  const [chave, setChave] = useState('')
  return (
    <form
      className="linha"
      onSubmit={async (e) => {
        e.preventDefault()
        const r = await api.definirChaveGroq(chave)
        if (r.ok) setChave('')
        mostrar(r, 'Chave guardada no cofre do Windows.')
      }}
    >
      <span style={{ width: 70 }}>Chave</span>
      <input className="campo-texto" style={{ flex: 1 }} type="password" value={chave} onChange={(e) => setChave(e.target.value)} placeholder={tem ? 'Guardada no cofre. Cole outra para trocar.' : 'Crie grátis em console.groq.com e cole aqui'} aria-label="Chave da Groq" autoComplete="off" />
      <button type="submit" className="botao principal pequeno" disabled={!chave.trim()}>
        Salvar
      </button>
      {tem && <Apagar rotulo="Apagar a chave" aoConfirmar={() => api.apagarChaveGroq()} />}
    </form>
  )
}

function CampoLinha({ rotulo, valor, aoSalvar }: { rotulo: string; valor: string; aoSalvar: (v: string) => void }) {
  const [v, setV] = useState(valor)
  useEffect(() => setV(valor), [valor])
  return (
    <form
      className="linha"
      onSubmit={(e) => {
        e.preventDefault()
        aoSalvar(v.trim())
      }}
    >
      <span style={{ width: 70 }}>{rotulo}</span>
      <input className="campo-texto" style={{ flex: 1 }} value={v} onChange={(e) => setV(e.target.value)} aria-label={rotulo} />
      <button type="submit" className="botao pequeno" disabled={!v.trim() || v.trim() === valor}>
        Salvar
      </button>
    </form>
  )
}

function PastasClaude({ c, mostrar }: { c: Config; mostrar: Mostrar }) {
  const [nome, setNome] = useState('')
  const [caminho, setCaminho] = useState('')
  return (
    <>
      {c.pastasClaude.map((p) => (
        <div key={p.id} className="linha">
          <span className="principal-texto">
            {p.nome} <span className="meta">{p.caminho}</span>
          </span>
          <Apagar aoConfirmar={() => api.apagarPastaClaude(p.id)} />
        </div>
      ))}
      <form
        className="linha"
        onSubmit={async (e) => {
          e.preventDefault()
          const r = await api.salvarPastaClaude(nome, caminho)
          if (r.ok) {
            setNome('')
            setCaminho('')
          }
          mostrar(r, 'Projeto salvo.')
        }}
      >
        <input className="campo-texto" style={{ flex: 1 }} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome, ex.: zarb-os" aria-label="Nome do projeto" />
        <button
          type="button"
          className="botao pequeno"
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
        <button type="submit" className="botao principal pequeno" disabled={!nome.trim() || !caminho}>
          Adicionar
        </button>
      </form>
    </>
  )
}

function Versao({ c }: { c: Config }) {
  const [a, setA] = useState<Atualizacao | null>(null)
  useEffect(() => {
    api.atualizacao().then(setA)
  }, [c])
  if (!a) return null
  const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const texto =
    a.tipo === 'em-dia'
      ? `Em dia${a.conferidoEm ? ` (conferido às ${hora(a.conferidoEm)})` : ''}.`
      : a.tipo === 'baixando'
        ? `Baixando a versão ${a.versao} (${a.porcento}%).`
        : a.tipo === 'pronta'
          ? `Versão ${a.versao} pronta. Instala quando o painel fechar.`
          : a.tipo === 'recusada'
            ? `Versão ${a.versao} recusada: ${a.motivo}`
            : a.tipo === 'erro'
              ? a.motivo
              : `Atualização automática desligada: ${a.motivo}`
  return (
    <div className="linha">
      <span style={{ width: 110 }}>Versão {a.versao_atual}</span>
      <span className={a.tipo === 'recusada' || a.tipo === 'erro' ? 'erro-texto' : 'meta'} style={{ flex: 1 }}>
        {texto}
      </span>
    </div>
  )
}

function Nuvem({ c, mostrar }: { c: Config; mostrar: Mostrar }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [indo, setIndo] = useState(false)
  if (c.nuvem.email)
    return (
      <div className="linha">
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--verde)' }} />
        <span style={{ flex: 1 }}>Ligado ao celular como {c.nuvem.email}</span>
        <button type="button" className="link" onClick={() => api.sairNuvem()}>
          Sair
        </button>
      </div>
    )
  return (
    <form
      className="formulario"
      onSubmit={async (e) => {
        e.preventDefault()
        setIndo(true)
        mostrar(await api.entrarNuvem(email, senha), 'Ligado ao celular. O que está no PC sobe agora.')
        setIndo(false)
        setSenha('')
      }}
    >
      <input className="campo-texto" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail do app do celular" aria-label="E-mail" autoComplete="email" />
      <input className="campo-texto" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Senha" aria-label="Senha" autoComplete="current-password" />
      <button type="submit" className="botao principal" disabled={indo || !email || !senha} style={{ alignSelf: 'flex-start' }}>
        {indo ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  )
}
