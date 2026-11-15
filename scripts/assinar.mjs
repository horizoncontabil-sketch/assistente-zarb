// Assina o instalador na montagem do GitHub. Uso: node scripts/assinar.mjs dist/arquivo.exe
// A chave privada vem do segredo ASSINATURA_VERSOES e nunca é gravada em disco.
import { createPrivateKey, createPublicKey, sign, verify } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'

const arquivo = process.argv[2]
const pem = process.env.ASSINATURA_VERSOES
if (!arquivo || !pem) {
  console.error('Faltou o arquivo ou o segredo ASSINATURA_VERSOES.')
  process.exit(1)
}
const conteudo = readFileSync(arquivo)
const assinatura = sign(null, conteudo, createPrivateKey(pem)).toString('base64')
// Confere com a chave pública que vai dentro do app: se não bater, o app recusaria a versão.
const publica = readFileSync(new URL('../src/shared/assinatura.ts', import.meta.url), 'utf8').match(/-----BEGIN PUBLIC KEY-----[\s\S]+?-----END PUBLIC KEY-----/)?.[0]
if (!publica || !verify(null, conteudo, createPublicKey(publica), Buffer.from(assinatura, 'base64'))) {
  console.error('A chave do segredo ASSINATURA_VERSOES não combina com a chave pública do app (src/shared/assinatura.ts).')
  process.exit(1)
}
writeFileSync(`${arquivo}.sig`, assinatura + '\n')
console.log(`Assinado: ${arquivo}.sig`)
