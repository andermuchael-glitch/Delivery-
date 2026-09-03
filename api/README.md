# Entrega365 API

Backend da nova plataforma Entrega365.

## Princípios

- A `main` e o aplicativo atual permanecem independentes.
- Firebase Auth continua sendo usado para autenticação nesta primeira etapa.
- Os dados financeiros atuais não são migrados nem alterados nesta fase.
- A Comunidade e o Marketplace serão migrados para a nova API/PostgreSQL somente depois dos testes.

## Endpoint inicial

`GET /api/health`

Retorna o estado básico da API. A conexão com PostgreSQL será adicionada em uma etapa separada, usando variável de ambiente e nunca credenciais no código-fonte.
