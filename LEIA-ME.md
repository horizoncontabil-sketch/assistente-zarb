# Assistente Zarb (nome provisório)

Assistente de mesa do Paulo: uma barra no topo da tela, chamada por atalho, para conversar, cuidar de tarefas, lembretes, Google Agenda e abrir as coisas da Zarb. Só Windows, só o PC do Paulo por enquanto.

Escopo e plano completos: nota `_knowledge/assistente-de-mesa-escopo.md` do segundo cérebro.

## Estado

**Fase 0 (base):** barra no topo, ícone na bandeja, atalho configurável, conversa por texto com a Groq, chave guardada no cofre do Windows, abrir junto com o Windows.

## Instalar no PC

1. No GitHub, aba **Actions** → execução mais recente de "Instalador Windows" → baixar o artefato **instalador** (zip com o `.exe`).
2. Rodar o `.exe`. Como o instalador não é assinado, o Windows mostra "O Windows protegeu o computador": **Mais informações** → **Executar assim mesmo**.
3. Abrir com `Ctrl + Espaço` (ou clicar no ícone perto do relógio) → **Configurações** → colar a chave da Groq (criada grátis em console.groq.com).

## Desenvolver

```bash
npm install
npm run dev        # abre o app com recarga automática
npm test           # testes
npm run typecheck
npm run dist       # instalador (no Windows)
```
