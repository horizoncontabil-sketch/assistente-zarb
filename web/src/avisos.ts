// Avisos de sono no iPhone (Web Push). Só funciona aberto pelo ícone da tela de início (iOS 16.4+).
import { supabase } from './dados'

const PUBLICA = 'BAcvzhattwOdKwEGrkU0FpUMBOEl-lCpE4SL6M4FK7BYg_vZseGk0v2Rlupj3781CtLZecbk1GQzi54A7aAi-iE'

export type EstadoAvisos = 'sem-suporte' | 'fora-do-icone' | 'negado' | 'desligado' | 'ligado'

const temSuporte = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
const noIcone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true

export function registrarSw() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {})
}

export async function estadoAvisos(): Promise<EstadoAvisos> {
  if (!noIcone()) return 'fora-do-icone'
  if (!temSuporte()) return 'sem-suporte'
  if (Notification.permission === 'denied') return 'negado'
  const reg = await navigator.serviceWorker.ready
  return (await reg.pushManager.getSubscription()) ? 'ligado' : 'desligado'
}

const chave = (b64: string) => {
  const s = atob((b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(s, (c) => c.charCodeAt(0))
}

// Precisa vir de um toque (o iPhone só pergunta a permissão assim).
export async function ligarAvisos(): Promise<EstadoAvisos> {
  if (!temSuporte()) return 'sem-suporte'
  if ((await Notification.requestPermission()) !== 'granted') return 'negado'
  const reg = await navigator.serviceWorker.ready
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chave(PUBLICA) }))
  const j = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
  const { error } = await supabase.from('push_inscricoes').upsert({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth }, { onConflict: 'endpoint' })
  if (error) throw error
  return 'ligado'
}

export async function desligarAvisos(): Promise<EstadoAvisos> {
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (sub) {
    await supabase.from('push_inscricoes').delete().eq('endpoint', sub.endpoint)
    await sub.unsubscribe()
  }
  return 'desligado'
}
