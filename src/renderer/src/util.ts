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

// Fala com a voz do Windows (pt-BR). "aoTerminar" roda quando a fala acaba (para voltar a ouvir).
export function falar(texto: string, aoTerminar?: () => void) {
  if (!('speechSynthesis' in window) || !texto) return aoTerminar?.()
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(texto.replace(/[*_#`]/g, ''))
  u.lang = 'pt-BR'
  const vozes = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('pt-br'))
  // Preferência pelas vozes naturais do Windows quando existem (ex.: "Francisca Online (Natural)").
  u.voice = vozes.find((v) => /natural/i.test(v.name)) ?? vozes[0] ?? null
  u.rate = 1.08
  if (aoTerminar) {
    u.onend = () => aoTerminar()
    u.onerror = () => aoTerminar()
  }
  speechSynthesis.speak(u)
}

export function calar() {
  if ('speechSynthesis' in window) speechSynthesis.cancel()
}

export const falando = () => 'speechSynthesis' in window && speechSynthesis.speaking
