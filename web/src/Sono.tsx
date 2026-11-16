import { useEffect, useState } from 'react'
import { SONO, horasDormidas, noHorario, placarSono } from '../../src/shared/sono'
import { diaIso, erroLegivel, lerDias, salvarDia, type Dia } from './dados'
import { desligarAvisos, estadoAvisos, ligarAvisos, type EstadoAvisos } from './avisos'

// A noite fica no dia em que ele acorda: "Vou dormir" depois do meio-dia vai para amanhã.
const amanha = () => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return diaIso(d)
}
const hhmm = (d = new Date()) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
const curto = (t?: string | null) => (t ? t.slice(0, 5) : '')

export function Sono() {
  const hoje = diaIso()
  const [dias, setDias] = useState<Dia[] | null>(null)
  const [deitou, setDeitou] = useState('')
  const [acordou, setAcordou] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [salvo, setSalvo] = useState(false)
  const [avisos, setAvisos] = useState<EstadoAvisos | null>(null)

  useEffect(() => {
    estadoAvisos().then(setAvisos).catch(() => setAvisos('sem-suporte'))
  }, [])

  async function trocarAvisos() {
    setErro(null)
    try {
      setAvisos(avisos === 'ligado' ? await desligarAvisos() : await ligarAvisos())
    } catch (e) {
      setErro(erroLegivel(e))
    }
  }

  useEffect(() => {
    const d = new Date()
    d.setDate(d.getDate() - 6)
    lerDias(diaIso(d))
      .then((l) => {
        setDias(l)
        const h = l.find((x) => x.dia === hoje)
        setDeitou(curto(h?.deitou))
        setAcordou(curto(h?.acordou) || SONO.acordar)
      })
      .catch((e) => setErro(erroLegivel(e)))
  }, [hoje])

  async function gravar(d: Partial<Dia> & { dia: string }) {
    setErro(null)
    try {
      await salvarDia(d)
      setDias((l) => [...(l ?? []).filter((x) => x.dia !== d.dia), { peso: null, passos: null, ...(l ?? []).find((x) => x.dia === d.dia), ...d }])
      setSalvo(true)
    } catch (e) {
      setErro(erroLegivel(e))
    }
  }

  const tarde = new Date().getHours() >= 12
  const hojeReg = dias?.find((x) => x.dia === hoje)
  const deitouHoje = dias?.find((x) => x.dia === amanha())?.deitou
  const p = placarSono((dias ?? []).filter((x) => x.dia <= hoje).map((x) => ({ deitou: curto(x.deitou) || null })))
  const horas = deitou && acordou ? horasDormidas(deitou, acordou) : null

  return (
    <section className="bloco">
      <h2>Sono</h2>
      {erro && <div className="aviso erro">{erro}</div>}
      {tarde ? (
        deitouHoje ? (
          <span className="suave">Boa noite. Registrado: deitou às {curto(deitouHoje)}.</span>
        ) : (
          <>
            <span className="peq cinza">Deitar às {SONO.deitar.replace(':', 'h')}. No PC, o aviso vem às {SONO.aviso.replace(':', 'h')}.</span>
            <button className="botao" onClick={() => gravar({ dia: amanha(), deitou: hhmm() })}>Vou dormir</button>
          </>
        )
      ) : (
        <>
          <span className="peq cinza">Última noite</span>
          <div className="dois">
            <label className="peq cinza">Deitou<input className="entrada" type="time" value={deitou} onChange={(e) => { setDeitou(e.target.value); setSalvo(false) }} /></label>
            <label className="peq cinza">Acordou<input className="entrada" type="time" value={acordou} onChange={(e) => { setAcordou(e.target.value); setSalvo(false) }} /></label>
          </div>
          {horas != null && (
            <span className="peq" style={{ color: horas >= 7 ? 'var(--verde)' : 'var(--ambar)' }}>
              {String(horas).replace('.', ',')} h de sono{horas < 7 ? '. O alvo é 7h30 (deitar 22h30, acordar 6h).' : ''}
            </span>
          )}
          {!(salvo || (hojeReg && curto(hojeReg.deitou) === deitou && curto(hojeReg.acordou) === acordou)) && (
            <button className="botao seg" disabled={!deitou || !acordou} onClick={() => gravar({ dia: hoje, deitou, acordou })}>Salvar noite</button>
          )}
        </>
      )}
      {p.noites > 0 && (
        <div className="linha peq">
          <span className="suave">Últimos 7 dias</span>
          <span className="num">{p.noHorario} de {p.noites} {p.noites === 1 ? 'noite' : 'noites'} no horário</span>
        </div>
      )}
      {avisos === 'desligado' && <button className="botao seg" onClick={trocarAvisos}>Ativar avisos às 21h30 e 22h30</button>}
      {avisos === 'ligado' && (
        <div className="linha peq"><span className="suave">Avisos às 21h30 e 22h30 ligados</span><button className="link" onClick={trocarAvisos}>Desligar</button></div>
      )}
      {avisos === 'negado' && <span className="peq cinza">Avisos bloqueados. Libere em Ajustes › Notificações › Assistente.</span>}
      {avisos === 'fora-do-icone' && <span className="peq cinza">Para receber os avisos de sono, abra o app pelo ícone da tela de início.</span>}
      {!tarde && deitou && !noHorario(deitou) && <span className="peq cinza">No horário é deitar até 22h45.</span>}
    </section>
  )
}
