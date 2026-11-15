# Assistente Zarb (nome provisório)

O assistente de mesa do Paulo. Um entalho preto no topo da tela, sempre à mão, que mostra a hora e o próximo compromisso, avisa de lembretes e reuniões, e abre num painel quando você chama, por atalho, clique ou voz.

Só Windows, só o PC do Paulo. Escopo completo no segundo cérebro (`_knowledge/assistente-de-mesa-escopo.md`).

## O que ele faz

| Função | Como usar |
|---|---|
| **Lembretes e tarefas** | "Me lembra amanhã às 9 de ligar pra Costare", "cria uma tarefa: revisar o deck", "toda segunda às 8 me lembra do check-in", "timer de 10 minutos". Na hora, o entalho mostra o aviso com **Feito**, **10 min**, **1 hora** e **Amanhã**, e o Windows avisa também. Se o PC estava desligado, os perdidos aparecem quando ele liga. |
| **Google Agenda** | "O que tenho hoje?" mostra reuniões e lembretes juntos. Aviso antes de cada reunião com o botão **Entrar no Meet**. "Marca uma reunião amanhã às 14h com a Costare" monta um cartão; o evento só é criado quando você clica em **Criar**. |
| **Abrir as coisas da Zarb** | "Abre o Health Score", "abre o Monday". Já vem com Zarb OS e suas telas, Monday, Meta, Drive, Agenda, Gmail, WhatsApp, Vercel, Supabase, Fly e Claude. Na aba Atalhos você cria os seus (site, pasta ou programa), ou fala: "quando eu disser painel da Bianca, abre tal link". |
| **Histórico do que copia** | Tudo que você copia (Ctrl+C) fica 30 dias na aba Copiados, com busca. Clique para copiar de novo, fixe o que não pode sumir. `Ctrl+Shift+V` abre direto. Senha copiada de gerenciador de senha não entra. Dá para pausar e apagar. |
| **Claude Code por voz** | "Pede pro Claude Code ajustar a coluna Aviso no zarb-os". Aparece o pedido para você revisar e escolher o projeto; ao clicar em **Mandar**, abre o terminal com o Claude Code, que continua pedindo aprovação antes de mexer em algo. |
| **Voz** | `Ctrl+Shift+Espaço` começa a ouvir; para sozinho quando você para de falar. Com "Responder falando" ligado, ele responde em voz quando você falou. "Ei, Zarb" (desligado por padrão) chama sem apertar nada. |

Atalhos de teclado padrão (troque em Configurações): `Ctrl+Espaço` abre e recolhe, `Ctrl+Shift+Espaço` fala, `Ctrl+Shift+V` abre os copiados. `Esc` recolhe.

## Instalar

1. GitHub → aba **Actions** → execução mais recente de "Instalador Windows" → baixe o artefato **instalador** (zip com o `.exe`).
2. Rode o `.exe`. Como não é assinado, o Windows mostra "O Windows protegeu o computador": **Mais informações** → **Executar assim mesmo**.
3. O painel abre em Configurações na primeira vez. Cole a chave da Groq (crie grátis em console.groq.com → API Keys).

## Ligar o Google Agenda (uma vez)

Feito no Google Cloud da Zarb, logado com a conta `@zarbmedia.com.br` que administra o projeto:

1. Em console.cloud.google.com, escolha o projeto da Zarb (pode ser o mesmo do login do Zarb OS).
2. **APIs e serviços → Biblioteca**, procure **Google Calendar API** e clique em **Ativar**.
3. **Google Auth Platform** (ou "Tela de permissão OAuth"): o público deve ser **Interno**. Assim só contas da Zarb entram e o login não vence a cada 7 dias.
4. **Clientes** (ou "Credenciais → Criar credenciais → ID do cliente OAuth"): tipo **App para computador**, nome "Assistente Zarb", **Criar**.
5. Copie o **ID do cliente** e a **Chave secreta do cliente**.
6. No assistente: **Configurações → Google Agenda**, cole os dois, **Salvar**, depois **Conectar o Google Agenda**. O navegador abre; entre com a sua conta da Zarb e libere a agenda.

O assistente só pede acesso a eventos da agenda principal. Para tirar o acesso: **Desconectar** nas configurações (e, se quiser, em myaccount.google.com → Segurança → Apps de terceiros).

## Segurança e privacidade

- Chaves (Groq e Google) ficam no cofre do Windows, nunca em arquivo de texto.
- A IA só pode pedir ações de uma lista fechada, e o código confere cada uma. Criar evento, mandar ao Claude Code, salvar atalho e apagar qualquer coisa só acontecem com o seu clique.
- O que vai para a Groq: o que você falou ou escreveu, os nomes dos atalhos e dos projetos. Nunca o que você copiou.
- O áudio vai para a transcrição da Groq e não fica guardado. O "Ei, Zarb" roda no próprio PC e nada sai antes de ouvir o chamado.
- Nada fica escutando na rede. Só durante o login do Google (até 5 minutos) o app recebe a resposta do Google em `127.0.0.1`.
- Sem atualização automática: versão nova é instalada por você.
- Tarefas, atalhos, copiados e a cópia da agenda ficam em `%APPDATA%\Assistente Zarb`.

## Limites conhecidos

- O entalho fica por cima de tudo, inclusive vídeo em tela cheia. Dá para esconder em Configurações → "Entalho sempre visível".
- "Ei, Zarb" usa um reconhecedor pequeno que não conhece a palavra "Zarb": pode falhar ou disparar à toa. Está desligado por padrão.
- O plano grátis da Groq tem limite por minuto e por dia; se estourar, ele avisa, e tarefas, atalhos e copiados continuam funcionando.

## Desenvolver

```bash
npm install
npm run dev        # abre o app com recarga automática
npm test           # testes da lógica (src/shared)
npm run typecheck
npm run dist       # instalador (no Windows)
```
