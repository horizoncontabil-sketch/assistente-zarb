// Assina o instalador na montagem do GitHub. Uso: node scripts/assinar.mjs dist/arquivo.exe
// A chave privada vem do segredo ASSINATURA_VERSOES e nunca é gravada em disco.
import { createPrivateKey, sign } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'

const arquivo = process.argv[2]
const pem = process.env.ASSINATURA_VERSOES
if (!arquivo || !pem) {
  console.error('Faltou o arquivo ou o segredo ASSINATURA_VERSOES.')
  process.exit(1)
}
const assinatura = sign(null, readFileSync(arquivo), createPrivateKey(pem)).toString('base64')
writeFileSync(`${arquivo}.sig`, assinatura + '\n')
console.log(`Assinado: ${arquivo}.sig`)
