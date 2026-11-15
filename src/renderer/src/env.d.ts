import type { ApiAssistente } from '../../shared/tipos'

declare global {
  interface Window {
    assistente: ApiAssistente
  }
}
