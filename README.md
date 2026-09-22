# Designer Fechaduras — versão básica sem banco

Site estático para teste e publicação. O fluxo de orçamento não usa PostgreSQL, Prisma ou cadastro persistente.

## Fluxo do cliente

1. O cliente adiciona produtos ao orçamento.
2. Clica em **Solicitar Orçamento**.
3. Escolhe **Já sou cliente** ou **Sou novo por aqui**.
4. Informa somente o nome.
5. Recebe a mensagem de boas-vindas correspondente.
6. Clica em **Continuar para o orçamento**.
7. O site monta a mensagem e redireciona para o WhatsApp.

A classificação enviada na mensagem é exatamente a opção escolhida pelo cliente. Nada é salvo em banco.

## WhatsApp

O número do WhatsApp usado no teste está em `js/config.js`, na variável `window.WHATSAPP_NUMBER`.

## Teste local

No Windows, dê duplo clique em `iniciar.bat`. Ele inicia um servidor local simples em `http://127.0.0.1:3000` e abre o site no navegador.

## Vercel

Este projeto é estático e não precisa de PostgreSQL nem Prisma. Na Vercel, importe o repositório e publique a raiz do projeto, sem configurar banco.
