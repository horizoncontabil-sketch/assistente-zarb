import { describe, expect, it } from 'vitest'
import { argumentosTerminal, pastaAceitavel, scriptClaude } from './claude'
import { adicionarCopia, buscarCopias, ehPrivado, podar } from './copias'
import { isoLocal } from './datas'
import { corpoNovoEvento, eventoDaApi, eventosDoDia, eventosParaAvisar } from './google'
import { adiar, concluir, devidas, novaTarefa, ordenar } from './tarefas'

const agora = new Date(2026, 10, 15, 10, 0)

describe('tarefas', () => {
  const lembrete = novaTarefa('1', 'Ligar', isoLocal(new Date(2026, 10, 15, 9, 59)), null, agora)
  it('acha o lembrete na hora e não avisa duas vezes', () => {
    expect(devidas([lembrete], agora)).toHaveLength(1)
    expect(devidas([{ ...lembrete, avisada: true }], agora)).toHaveLength(0)
    expect(devidas([novaTarefa('2', 'sem hora', null, null, agora)], agora)).toHaveLength(0)
  })
  it('concluir lembrete que repete agenda o próximo', () => {
    const r = concluir({ ...lembrete, repetir: 'diario', avisada: true }, agora)
    expect(r.feita).toBe(false)
    expect(r.avisada).toBe(false)
    expect(new Date(r.quando!)).toEqual(new Date(2026, 10, 16, 9, 59))
  })
  it('adiar muda o horário e volta a avisar', () => {
    const r = adiar({ ...lembrete, avisada: true }, 10, agora)
    expect(new Date(r.quando!)).toEqual(new Date(2026, 10, 15, 10, 10))
    expect(r.avisada).toBe(false)
  })
  it('ordena pendentes com hora, sem hora e feitas', () => {
    const a = novaTarefa('a', 'sem hora', null, null, agora)
    const b = { ...novaTarefa('b', 'feita', null, null, agora), feita: true, feitaEm: isoLocal(agora) }
    expect(ordenar([b, a, lembrete]).map((t) => t.id)).toEqual(['1', 'a', 'b'])
  })
})

describe('copiados', () => {
  it('ignora o que o gerenciador de senha marca', () => {
    expect(ehPrivado(['text/plain', 'ExcludeClipboardContentFromMonitorProcessing'], null)).toBe(true)
    expect(ehPrivado(['text/plain'], 0)).toBe(true)
    expect(ehPrivado(['text/plain'], 1)).toBe(false)
  })
  it('repetido sobe para o topo sem duplicar e mantém a fixação', () => {
    let l = adicionarCopia([], 'a', '1', agora)
    l = adicionarCopia(l, 'b', '2', agora)
    l = l.map((c) => (c.texto === 'a' ? { ...c, fixada: true } : c))
    l = adicionarCopia(l, 'a', '3', new Date(agora.getTime() + 1000))
    expect(l.map((c) => [c.texto, c.fixada])).toEqual([['a', true], ['b', false]])
    expect(adicionarCopia(l, '   ', '4', agora)).toBe(l)
  })
  it('apaga as velhas, menos as fixadas, e busca fixadas primeiro', () => {
    const velha = { id: 'v', texto: 'velha', em: new Date(2026, 8, 1).toISOString(), fixada: false }
    const fixa = { ...velha, id: 'f', texto: 'fixa velha', fixada: true }
    expect(podar([velha, fixa], agora).map((c) => c.id)).toEqual(['f'])
    expect(buscarCopias([velha, fixa], 'VELHA').map((c) => c.id)).toEqual(['f', 'v'])
  })
})

describe('Claude Code', () => {
  it('pedido com aspas e comandos vira texto, nunca comando', () => {
    const s = scriptClaude('C:\\Projetos\\zarb-os', "olha o erro'; Remove-Item C:\\ -Recurse; '")
    expect(s).toContain("Set-Location -LiteralPath 'C:\\Projetos\\zarb-os'")
    expect(s).toContain("& $c.Source 'olha o erro''; Remove-Item C:\\ -Recurse; '''")
    expect(scriptClaude('C:\\x', 'diz "oi"')).toContain("'diz ''oi'''")
    expect(scriptClaude('C:\\x', 'a’b')).toContain("'a’’b'")
  })
  it('argumentos do terminal não carregam o pedido em texto puro', () => {
    const args = argumentosTerminal('C:\\x', 'apaga tudo; calc')
    expect(args.join(' ')).not.toContain('calc')
    expect(args.slice(0, 5)).toEqual(['-d', 'C:\\x', 'powershell.exe', '-NoExit', '-EncodedCommand'])
    expect(Buffer.from(args[5], 'base64').toString('utf16le')).toContain("& $c.Source 'apaga tudo; calc'")
  })
  it('pasta precisa ser caminho do Windows sem caractere perigoso', () => {
    expect(pastaAceitavel('C:\\Users\\Paulo\\zarb-os')).toBe(true)
    expect(pastaAceitavel('C:\\x;calc')).toBe(false)
    expect(pastaAceitavel('zarb-os')).toBe(false)
  })
})

describe('Google Agenda', () => {
  it('lê evento com Meet e ignora cancelado e recusado', () => {
    const e = eventoDaApi({
      id: 'e1', summary: 'Check-in', start: { dateTime: '2026-11-15T14:00:00-03:00' }, end: { dateTime: '2026-11-15T14:30:00-03:00' },
      hangoutLink: 'https://meet.google.com/abc', htmlLink: 'https://calendar.google.com/x',
    })
    expect(e).toMatchObject({ titulo: 'Check-in', meet: 'https://meet.google.com/abc', diaInteiro: false })
    expect(eventoDaApi({ id: 'x', status: 'cancelled', start: { date: '2026-11-15' }, end: { date: '2026-11-16' } })).toBeNull()
    expect(eventoDaApi({ id: 'y', start: { date: '2026-11-15' }, end: { date: '2026-11-16' }, attendees: [{ self: true, responseStatus: 'declined' }] })).toBeNull()
  })
  it('separa o dia e põe dia inteiro primeiro', () => {
    const ev = (id: string, inicio: string, fim: string, diaInteiro = false) => ({ id, titulo: id, inicio, fim, diaInteiro, local: null, meet: null, link: null })
    const lista = [
      ev('tarde', isoLocal(new Date(2026, 10, 15, 15)), isoLocal(new Date(2026, 10, 15, 16))),
      ev('feriado', '2026-11-15', '2026-11-16', true),
      ev('amanha', isoLocal(new Date(2026, 10, 16, 9)), isoLocal(new Date(2026, 10, 16, 10))),
    ]
    expect(eventosDoDia(lista, agora).map((e) => e.id)).toEqual(['feriado', 'tarde'])
  })
  it('avisa 10 min antes e de novo 1 min antes, cada um uma vez', () => {
    const e = { id: 'e', titulo: 'x', inicio: isoLocal(new Date(2026, 10, 15, 10, 8)), fim: '', diaInteiro: false, local: null, meet: null, link: null }
    const r = eventosParaAvisar([e], agora, [10, 1], new Set())
    expect(r.map((x) => x.marco)).toEqual([10])
    const avisados = new Set(r[0].chaves)
    expect(eventosParaAvisar([e], agora, [10, 1], avisados)).toHaveLength(0)
    const quase = new Date(2026, 10, 15, 10, 7, 10)
    expect(eventosParaAvisar([e], quase, [10, 1], avisados).map((x) => x.marco)).toEqual([1])
  })
  it('ligou o PC em cima da hora: só o aviso de 1 min', () => {
    const e = { id: 'e', titulo: 'x', inicio: isoLocal(new Date(2026, 10, 15, 10, 1)), fim: '', diaInteiro: false, local: null, meet: null, link: null }
    const r = eventosParaAvisar([e], agora, [10, 1], new Set())
    expect(r.map((x) => [x.marco, x.chaves.length])).toEqual([[1, 2]])
  })
  it('evento novo com Meet e convidados', () => {
    const c = corpoNovoEvento({ titulo: 'Reunião', inicio: '2026-11-16T09:00:00-03:00', duracaoMin: 45, convidados: ['a@b.com'], comMeet: true }, 'req1')
    expect(c.end.dateTime).toBe('2026-11-16T12:45:00.000Z')
    expect(c.attendees).toEqual([{ email: 'a@b.com' }])
    expect(c.conferenceData?.createRequest.requestId).toBe('req1')
  })
})
