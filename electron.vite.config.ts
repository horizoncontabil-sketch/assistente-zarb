import { defineConfig } from 'electron-vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// CSP só no app empacotado: em desenvolvimento o Vite precisa de script inline para recarregar.
// A tela não fala com a internet (connect-src só blob/data, para o reconhecedor de voz offline);
// quem chama a Groq e o Google é o processo principal. 'wasm-unsafe-eval', 'unsafe-eval' e blob: são do
// Vosk (o worker dele monta funções com new Function).
// atalho: 'unsafe-eval' vale para a tela toda; o risco é baixo porque a tela não tem Node nem internet e só
// carrega arquivos do próprio app. Melhorar: rodar o Vosk numa janela oculta só dele, com CSP própria.
const csp: Plugin = {
  name: 'csp',
  apply: 'build',
  transformIndexHtml: (html) =>
    html.replace(
      '<meta charset="UTF-8" />',
      `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self' blob: 'wasm-unsafe-eval' 'unsafe-eval'; worker-src blob:; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src blob: data:; media-src 'self' blob: mediastream:; base-uri 'none'; form-action 'none'" />`,
    ),
}

export default defineConfig({
  main: {},
  preload: {},
  renderer: { plugins: [react(), csp] },
})
