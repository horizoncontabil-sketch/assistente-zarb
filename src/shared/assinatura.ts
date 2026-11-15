// Toda versão nova é assinada (Ed25519) na montagem do GitHub, com uma chave que só existe lá.
// O app só instala se a assinatura do instalador bater com a chave pública abaixo.
import { createPublicKey, verify } from 'node:crypto'

// Chave pública das versões (não é segredo). Vazia = atualização automática desligada.
export const CHAVE_PUBLICA = ''

export function assinaturaConfere(arquivo: Uint8Array, assinaturaBase64: string, chavePem = CHAVE_PUBLICA): boolean {
  if (!chavePem.trim() || !assinaturaBase64.trim()) return false
  try {
    return verify(null, arquivo, createPublicKey(chavePem), Buffer.from(assinaturaBase64.trim(), 'base64'))
  } catch {
    return false
  }
}
