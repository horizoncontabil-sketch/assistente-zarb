import { expect, it } from 'vitest'
import { ouviuOChamado } from './chamado'

it('reconhece o chamado escrito de vários jeitos', () => {
  for (const t of ['ei zarb', 'ei zarbe', 'hey sarb', 'e zarbi', 'oi zab', 'bom dia ei zarb']) expect(ouviuOChamado(t), t).toBe(true)
})

it('não dispara com conversa comum', () => {
  for (const t of ['zarb', 'ei', 'ei maria', 'ei sapato', 'o zarb é bom', 'ei casa', 'ei zé', 'ei sabe o que', 'ei manda no zap']) expect(ouviuOChamado(t), t).toBe(false)
})
