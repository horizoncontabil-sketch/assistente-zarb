import { useState } from 'react'
import type { Repetir, Tarefa } from '../../../shared/tipos'
import { Icone } from '../icones'
import { api, doCampo } from '../util'
import { Mensagem, Vazio } from './comum'
import { LinhaTarefa, OPCOES_REPETIR } from './linhas'

export function Tarefas({ tarefas, agora }: { tarefas: Tarefa[]; agora: Date }) {
  const [ver, setVer] = useState<'pendentes' | 'feitas'>('pendentes')
  const [titulo, setTitulo] = useState('')
  const [quando, setQuando] = useState('')
  const [repetir, setRepetir] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  const lista = tarefas.filter((t) => (ver === 'feitas' ? t.feita : !t.feita))
  const criar = async (e: React.FormEvent) => {
    e.preventDefault()
    const r = await api.criarTarefa(titulo, doCampo(quando), (repetir || null) as Repetir)
    if (!r.ok) return setErro(r.erro)
    setTitulo('')
    setQuando('')
    setRepetir('')
    setErro(null)
  }

  return (
    <div className="aba-conteudo">
      <form className="nova" onSubmit={criar}>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Nova tarefa" aria-label="Nova tarefa" />
        <input type="datetime-local" value={quando} onChange={(e) => setQuando(e.target.value)} aria-label="Lembrar em (opcional)" title="Lembrar em (opcional)" />
        {quando && (
          <select value={repetir} onChange={(e) => setRepetir(e.target.value)} aria-label="Repetir">
            {OPCOES_REPETIR.map((o) => (
              <option key={o.v} value={o.v}>
                {o.nome}
              </option>
            ))}
          </select>
        )}
        <button type="submit" className="primario" disabled={!titulo.trim()} aria-label="Adicionar">
          <Icone nome="mais" />
        </button>
      </form>
      {erro && <Mensagem tipo="erro">{erro}</Mensagem>}

      <div className="segmentos" role="tablist">
        <button role="tab" aria-selected={ver === 'pendentes'} className={ver === 'pendentes' ? 'ativa' : ''} onClick={() => setVer('pendentes')}>
          Pendentes ({tarefas.filter((t) => !t.feita).length})
        </button>
        <button role="tab" aria-selected={ver === 'feitas'} className={ver === 'feitas' ? 'ativa' : ''} onClick={() => setVer('feitas')}>
          Feitas
        </button>
      </div>

      {lista.length ? (
        <ul className="lista">
          {lista.map((t) => (
            <LinhaTarefa key={t.id} t={t} agora={agora} />
          ))}
        </ul>
      ) : ver === 'pendentes' ? (
        <Vazio icone="check" titulo="Tudo em dia">
          Nada pendente. Para anotar, escreva acima ou fale: "me lembra às 15h de ligar pro cliente".
        </Vazio>
      ) : (
        <Vazio icone="lista" titulo="Nada feito nos últimos 30 dias" />
      )}
    </div>
  )
}
