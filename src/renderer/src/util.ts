import { diaLocal, isoLocal } from '../../shared/datas'

export const api = window.assistente

const dois = (n: number) => String(n).padStart(2, '0')

// <input type="datetime-local"> trabalha com "AAAA-MM-DDTHH:MM" no fuso do PC.
export function paraCampo(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${diaLocal(d)}T${dois(d.getHours())}:${dois(d.getMinutes())}`
}

export function doCampo(v: string): string | null {
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : isoLocal(d)
}

export function minutosAte(iso: string, agora: Date): number {
  return Math.round((new Date(iso).getTime() - agora.getTime()) / 60_000)
}

export function emQuanto(min: number): string {
  if (min <= 0) return 'agora'
  if (min < 60) return `em ${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `em ${h}h${dois(m)}` : `em ${h}h`
}

export function falar(texto: string) {
  if (!('speechSynthesis' in window) || !texto) return
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(texto)
  u.lang = 'pt-BR'
  const voz = speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith('pt-br'))
  if (voz) u.voice = voz
  u.rate = 1.05
  speechSynthesis.speak(u)
}
