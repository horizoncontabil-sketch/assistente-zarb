# Assistente Zarb (nome provisório)

O assistente de mesa do Paulo. Um entalho preto no topo da tela, sempre à mão, que mostra a hora e o próximo compromisso, avisa de lembretes e reuniões, e abre num painel quando você chama, por atalho, clique ou voz.

Só Windows, só o PC do Paulo. Escopo completo no segundo cérebro (`_knowledge/assistente-de-mesa-escopo.md`).

## O que ele faz

| Função | Como usar |
|---|---|
| **Entalho** | Fica no topo, com a hora e o próximo compromisso. Segure e arraste para outra borda (embaixo, esquerda, direita): ele gruda onde soltar. Clique para abrir o painel. |
| **Hoje** | O dia numa linha (reuniões, lembretes e agora), o que vem a seguir e os hábitos do dia. |
| **Lembretes e tarefas** | "Me lembra amanhã às 9 de ligar pra Costare", "cria uma tarefa: revisar o deck". Aviso na hora com Feito, 10 min, 1 hora e Amanhã. |
| **Hábitos** | De sim ou não, ou com quantidade (2 L de água, 30 min, 10 páginas). Visão do dia e da semana, sequência de dias, lembrete por horário ou a cada tantas horas. Fale "bebi 500 ml de água" ou "li 3 páginas". |
| **Google Agenda** | Entre com o Google em Configurações. Aviso 10 min antes (um toque) e 1 min antes com o botão Entrar no Meet. "Marca reunião quinta às 14h com a Tia Nena" monta o evento; ele só é criado no clique. |
| **Copiados** | O que você copia fica 30 dias, com busca e fixar. Senhas de gerenciador não entram. `Ctrl+Shift+V` abre. |
| **Atalhos** | Telas do Zarb OS, ferramentas e os seus. "Abre o Health Score". |
| **PC** | Volume, brilho (tela de notebook), silenciar avisos, bloquear, suspender, reiniciar, desligar, lixeira, temporários, programa travado, downloads e organizar a área de trabalho. O que apaga ou desliga pede confirmação. Fale "abaixa o volume", "bloqueia o PC". |
| **Claude Code por voz** | "Pede pro Claude ajustar…": o pedido aparece para revisar e abre o terminal visível, que pede aprovação antes de mexer. |
| **Voz** | `Ctrl+Shift+Espaço` ouve e para sozinho no silêncio. Resposta simples aparece só no entalho e é falada; se ele perguntar algo, volta a ouvir sozinho. "Ei, Zarb" opcional. |
| **Atualização** | Chega e instala sozinha quando o painel está fechado, só se a assinatura for a nossa. |

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
6. No GitHub do repositório: **Settings → Secrets and variables → Actions**, crie `GOOGLE_CLIENT_ID` (o ID) e `GOOGLE_CLIENT_SECRET` (a chave). A próxima versão já vem com o botão **Entrar com Google** funcionando; ninguém precisa colar nada no app.

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
