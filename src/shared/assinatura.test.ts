import { generateKeyPairSync, sign } from 'node:crypto'
import { expect, it } from 'vitest'
import { assinaturaConfere } from './assinatura'

const par = generateKeyPairSync('ed25519')
const publica = par.publicKey.export({ type: 'spki', format: 'pem' }).toString()
const arquivo = Buffer.from('instalador de mentira')
const assinatura = sign(null, arquivo, par.privateKey).toString('base64')

it('aceita o instalador assinado com a nossa chave', () => {
  expect(assinaturaConfere(arquivo, assinatura, publica)).toBe(true)
})

it('recusa arquivo trocado, assinatura de outra chave, vazia ou sem chave pública', () => {
  expect(assinaturaConfere(Buffer.from('instalador trocado'), assinatura, publica)).toBe(false)
  const outra = generateKeyPairSync('ed25519')
  expect(assinaturaConfere(arquivo, sign(null, arquivo, outra.privateKey).toString('base64'), publica)).toBe(false)
  expect(assinaturaConfere(arquivo, '', publica)).toBe(false)
  expect(assinaturaConfere(arquivo, 'lixo', publica)).toBe(false)
  expect(assinaturaConfere(arquivo, assinatura, '')).toBe(false)
})
