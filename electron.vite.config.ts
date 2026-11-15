import { defineConfig } from 'electron-vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// CSP só no app empacotado: em desenvolvimento o Vite precisa de script inline para recarregar.
// A tela não fala com a internet; quem chama a Groq é o processo principal.
const csp: Plugin = {
  name: 'csp',
  apply: 'build',
  transformIndexHtml: (html) =>
    html.replace(
      '<meta charset="UTF-8" />',
      `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'" />`,
    ),
}

export default defineConfig({
  main: {},
  preload: {},
  renderer: { plugins: [react(), csp] },
})
