import { useState } from 'react'
import { descreverDia } from '../../../shared/datas'
import { eventosDoDia } from '../../../shared/google'
import type { Aba } from '../../../shared/tipos'
import { Icone } from '../icones'
import type { Dados } from '../usarDados'
import { api } from '../util'
import { CartaoEvento } from './cartoes'
import { Mensagem, Secao, Vazio } from './comum'
import { LinhaEvento } from './linhas'

export function Agenda({ dados, agora, irPara }: { dados: Dados; agora: Date; irPara: (a: Aba) => void }) {
  const [novo, setNovo] = useState(false)
  const [atualizando, setAtualizando] = useState(false)
  if (!dados.config?.google.conectado) {
    return (
      <div className="aba-conteudo">
        <Vazio icone="agenda" titulo="Google Agenda não conectado">
          Conecte em Configurações para ver suas reuniões, receber aviso antes de cada uma e marcar eventos falando.
        </Vazio>
        <div className="centro">
          <button className="primario" onClick={() => irPara('config')}>
            Conectar o Google Agenda
          </button>
        </div>
      </div>
    )
  }
  const dias = Array.from({ length: 7 }, (_, i) => new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + i))
  const lido = dados.agenda.lidoEm ? new Date(dados.agenda.lidoEm) : null

  return (
    <div className="aba-conteudo">
      <div className="barra-acoes">
        <span className="discreto-texto">{lido ? `Atualizada às ${lido.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Ainda não lida'}</span>
        <button
          className="pequeno"
          onClick={async () => {
            setAtualizando(true)
            await api.atualizarAgenda()
            setAtualizando(false)
          }}
          disabled={atualizando}
        >
          <Icone nome="atualizar" tamanho={15} /> {atualizando ? 'Atualizando…' : 'Atualizar'}
        </button>
        <button className="primario pequeno" onClick={() => setNovo(true)}>
          <Icone nome="mais" tamanho={15} /> Novo evento
        </button>
      </div>
      {dados.agenda.erro && <Mensagem tipo="erro">{dados.agenda.erro} Mostrando a última leitura.</Mensagem>}
      {novo && (
        <CartaoEvento
          inicial={{ titulo: '', inicio: proximaHoraCheia(agora), duracaoMin: 30, convidados: [], comMeet: true }}
          aoTerminar={() => setNovo(false)}
        />
      )}
      {dias.map((d) => {
        const evs = eventosDoDia(dados.agenda.eventos, d)
        const nome = descreverDia(d, agora)
        return (
          <Secao key={d.toISOString()} titulo={`${nome[0].toUpperCase()}${nome.slice(1)}${nome === 'hoje' || nome === 'amanhã' ? ` · ${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}` : ''}`}>
            {evs.length ? (
              <ul className="lista">
                {evs.map((e) => (
                  <LinhaEvento key={e.id} e={e} agora={agora} />
                ))}
              </ul>
            ) : (
              <p className="nada">Livre.</p>
            )}
          </Secao>
        )
      })}
    </div>
  )
}

function proximaHoraCheia(agora: Date): string {
  const d = new Date(agora)
  d.setHours(d.getHours() + 1, 0, 0, 0)
  return d.toISOString()
}
