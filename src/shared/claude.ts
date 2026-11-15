// Monta o comando que abre o Claude Code numa janela visível do PowerShell, no modo normal
// de permissões (ele pergunta antes de editar ou rodar algo). O pedido vai codificado em base64
// (-EncodedCommand), então nenhum caractere do pedido é lido como comando pelo cmd, pelo
// Windows Terminal ou pelo PowerShell.

// O PowerShell aceita também as aspas “tortas” como aspas simples: todas são dobradas.
const ASPAS_SIMPLES = /['\u2018\u2019\u201A\u201B]/g

export function aspasPowerShell(texto: string): string {
  return `'${texto.replace(ASPAS_SIMPLES, (m) => m + m)}'`
}

// Usa claude.exe (instalação nativa) ou claude.cmd (npm). O claude.ps1 do npm fica de fora porque
// o Windows bloqueia scripts .ps1 por padrão. Aspas duplas viram simples: o .cmd as leria como fim do texto.
export function scriptClaude(pasta: string, pedido: string): string {
  const p = aspasPowerShell(pedido.replace(/"/g, "'"))
  return [
    `Set-Location -LiteralPath ${aspasPowerShell(pasta)}`,
    `$c = Get-Command claude.exe -ErrorAction SilentlyContinue`,
    `if (-not $c) { $c = Get-Command claude.cmd -ErrorAction SilentlyContinue }`,
    `if ($c) { & $c.Source ${p} } else { Write-Host 'Claude Code não encontrado neste PC.' }`,
  ].join('; ')
}

export function codificar(script: string): string {
  return Buffer.from(script, 'utf16le').toString('base64')
}

export function argumentosTerminal(pasta: string, pedido: string): string[] {
  return ['-d', pasta, 'powershell.exe', '-NoExit', '-EncodedCommand', codificar(scriptClaude(pasta, pedido))]
}

export function pastaAceitavel(caminho: string): boolean {
  // Ponto e vírgula separa comandos no Windows Terminal; aspas quebram o -d.
  return /^([a-z]:\\|\\\\[^\\]+\\)/i.test(caminho) && !/[;"<>|]/.test(caminho)
}
