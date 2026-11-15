import { mesmoDia } from '../../../shared/datas'
import { eventosDoDia } from '../../../shared/google'
import type { Aba } from '../../../shared/tipos'
import type { Dados } from '../usarDados'
import { Vazio, Secao } from './comum'
import { LinhaEvento, LinhaTarefa } from './linhas'

const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)
const saudacao = (h: number) => (h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite')

export function Hoje({ dados, agora, irPara, compacto = false }: { dados: Dados; agora: Date; irPara?: (a: Aba) => void; compacto?: boolean }) {
  const eventos = eventosDoDia(dados.agenda.eventos, agora)
  const pendentes = dados.tarefas.filter((t) => !t.feita)
  const atrasadas = pendentes.filter((t) => t.quando && new Date(t.quando) <= agora)
  const lembretesHoje = pendentes.filter((t) => t.quando && new Date(t.quando) > agora && mesmoDia(new Date(t.quando), agora))
  const semHora = pendentes.filter((t) => !t.quando)
  const conectado = !!dados.config?.google.conectado

  return (
    <div className="hoje">
      {!compacto && (
        <div className="saudacao">
          <h1>{saudacao(agora.getHours())}, Paulo</h1>
          <p>{maiuscula(agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }))}</p>
        </div>
      )}

      {atrasadas.length > 0 && (
        <Secao titulo={`Atrasados (${atrasadas.length})`}>
          <ul className="lista">
            {atrasadas.map((t) => (
              <LinhaTarefa key={t.id} t={t} agora={agora} />
            ))}
          </ul>
        </Secao>
      )}

      <Secao titulo="Agenda de hoje">
        {!conectado ? (
          <div className="chamada">
            <span>Conecte o Google Agenda para ver suas reuniões aqui.</span>
            {irPara && (
              <button className="pequeno" onClick={() => irPara('config')}>
                Conectar
              </button>
            )}
          </div>
        ) : eventos.length ? (
          <ul className="lista">
            {eventos.map((e) => (
              <LinhaEvento key={e.id} e={e} agora={agora} />
            ))}
          </ul>
        ) : (
          <p className="nada">Nenhum compromisso hoje.</p>
        )}
        {conectado && dados.agenda.erro && <p className="mensagem-erro">{dados.agenda.erro}</p>}
      </Secao>

      <Secao titulo="Lembretes de hoje">
        {lembretesHoje.length ? (
          <ul className="lista">
            {lembretesHoje.map((t) => (
              <LinhaTarefa key={t.id} t={t} agora={agora} />
            ))}
          </ul>
        ) : (
          <p className="nada">Nenhum lembrete para o resto do dia.</p>
        )}
      </Secao>

      {!compacto && (
        <Secao
          titulo={`Tarefas (${semHora.length})`}
          acao={
            irPara && semHora.length > 5 ? (
              <button className="discreto pequeno" onClick={() => irPara('tarefas')}>
                Ver todas
              </button>
            ) : undefined
          }
        >
          {semHora.length ? (
            <ul className="lista">
              {semHora.slice(0, 5).map((t) => (
                <LinhaTarefa key={t.id} t={t} agora={agora} />
              ))}
            </ul>
          ) : (
            <Vazio icone="check" titulo="Nenhuma tarefa pendente">
              Fale ou escreva "cria uma tarefa: …" para anotar.
            </Vazio>
          )}
        </Secao>
      )}
    </div>
  )
}
