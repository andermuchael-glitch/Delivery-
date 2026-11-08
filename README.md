# Entrega365

PWA mobile-first para controle de entregas, taxas, fechamento diário, KM, gastos, mecânica/troca de óleo e relatório mensal.

## Entrega365 PRO

A versão PRO foi preparada para assinatura recorrente de **R$ 9,90/mês** com Mercado Pago.

O fluxo implementado é:
- usuário entra com um e-mail válido;
- o servidor cria a assinatura recorrente no Mercado Pago;
- o usuário é direcionado ao checkout oficial;
- o ID da assinatura é guardado no dispositivo;
- o aplicativo consulta o Mercado Pago antes de considerar o plano `active`;
- o endpoint de webhook valida a assinatura HMAC quando `MERCADOPAGO_WEBHOOK_SECRET` estiver configurado.

### Configuração do backend

O frontend continua podendo ser servido como PWA estático, mas os endpoints `/api/pro-checkout`, `/api/pro-status` e `/api/mp-webhook` precisam ser publicados em uma plataforma com funções server-side, como Vercel.

Configure no ambiente do servidor:

- `MERCADOPAGO_ACCESS_TOKEN` — Access Token privado do Mercado Pago.
- `MERCADOPAGO_WEBHOOK_SECRET` — chave secreta dos Webhooks do Mercado Pago.
- `NEON_DATABASE_URL` ou `DATABASE_URL` — conexão com o PostgreSQL (Neon) usado pelo sync principal.

Nunca coloque essas credenciais no JavaScript do navegador ou no GitHub.

Webhook de produção:

`https://entrega365.com.br/api/mp-webhook`

No Mercado Pago, configure os eventos de assinaturas/pagamentos conforme a aplicação criada no painel de desenvolvedor.

## Sincronização de dados

A fonte de verdade preferida é o **PostgreSQL** via `data-sync.js` + endpoint `/api/data`.

- O módulo `cloud-sync.js` (Firebase Firestore) é legado e se desativa automaticamente quando o sync Postgres está ativo, evitando race conditions.
- Os dados continuam no `localStorage` por usuário e são sincronizados de forma offline-first com versionamento (CAS).
- Em caso de conflito, o cliente mescla as chaves alteradas localmente sobre a versão mais recente do servidor.

## Proteção dos dados

A versão atual mantém os dados separados por usuário no `localStorage`.

Na primeira abertura desta versão, existe uma migração automática da estrutura antiga `comandasdelivery:` para a estrutura `dcv2:`.

A migração:
- não apaga nenhuma chave antiga;
- cria uma cópia local de segurança dos dados encontrados antes de concluir;
- preserva comandas, taxas, conferências e arrancadas;
- preserva as descrições/anotações dos gastos;
- mantém os usuários antigos utilizáveis através do hash legado;
- não sobrescreve dados novos que já existam.

## PWA

O Service Worker usa uma versão de cache própria e injeta os módulos complementares, incluindo a camada PRO, após o shell principal.

## Publicação

A aplicação principal continua compatível com GitHub Pages. Para ativar a cobrança automática do PRO e o sync PostgreSQL, publique também a pasta `api/` em Vercel ou outro ambiente server-side compatível e configure as variáveis secretas.
