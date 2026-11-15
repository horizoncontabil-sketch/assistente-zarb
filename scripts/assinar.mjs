// Assina o instalador na montagem do GitHub. Uso: node scripts/assinar.mjs dist/arquivo.exe
// A chave privada vem do segredo ASSINATURA_VERSOES e nunca é gravada em disco.
import { createPrivateKey, createPublicKey, sign, verify } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'

const arquivo = process.argv[2]
// Aceita a chave colada de qualquer jeito: com ou sem quebras de linha, com espaços ou BOM.
function chavePrivada(texto) {
  const corpo = texto.replace(/^\uFEFF/, '').replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/[^A-Za-z0-9+/=]/g, '')
  const linhas = corpo.match(/.{1,64}/g) ?? []
  return createPrivateKey(`-----BEGIN PRIVATE KEY-----\n${linhas.join('\n')}\n-----END PRIVATE KEY-----\n`)
}
const pem = process.env.ASSINATURA_VERSOES
if (!arquivo || !pem) {
  console.error('Faltou o arquivo ou o segredo ASSINATURA_VERSOES.')
  process.exit(1)
}
const conteudo = readFileSync(arquivo)
const assinatura = sign(null, conteudo, chavePrivada(pem)).toString('base64')
// Confere com a chave pública que vai dentro do app: se não bater, o app recusaria a versão.
const publica = readFileSync(new URL('../src/shared/assinatura.ts', import.meta.url), 'utf8').match(/-----BEGIN PUBLIC KEY-----[\s\S]+?-----END PUBLIC KEY-----/)?.[0]
if (!publica || !verify(null, conteudo, createPublicKey(publica), Buffer.from(assinatura, 'base64'))) {
  console.error('A chave do segredo ASSINATURA_VERSOES não combina com a chave pública do app (src/shared/assinatura.ts).')
  process.exit(1)
}
writeFileSync(`${arquivo}.sig`, assinatura + '\n')
console.log(`Assinado: ${arquivo}.sig`)
