# Rastreamento GPS — Entrega365

## Escopo desta etapa

- Módulo acessível pelo menu **Mais → Rastreamento GPS**.
- Entregador inicia e encerra o compartilhamento manualmente em cada expediente.
- Serviço Android nativo de localização em primeiro plano, com notificação persistente.
- Atualizações de localização enviadas ao backend PostgreSQL/Neon.
- Painel administrativo com mapa, estado de conexão e horário da última posição.
- Atualização automática do painel a cada 10 segundos.
- A API só permite que cada entregador grave a própria localização; a listagem geral é restrita a administradores autorizados.

## Configuração obrigatória na Vercel

Configure a variável de ambiente:

- `NEON_DATABASE_URL` (ou `DATABASE_URL`) — conexão PostgreSQL já usada pelo backend.
- `TRACKING_ADMIN_EMAILS` — lista de e-mails Google autorizados a visualizar o mapa, separados por vírgula. Exemplo: `andermuchael@gmail.com`.

O valor padrão, se `TRACKING_ADMIN_EMAILS` não for definido, é `andermuchael@gmail.com`. O administrador deve entrar no Entrega365 com um dos e-mails autorizados.

As tabelas de rastreamento são criadas automaticamente pela API. Não é necessário apagar ou migrar as tabelas existentes de comandas.

## Compilação Android

O plugin nativo está em `plugins/entrega365-location` e é instalado como dependência local pelo `package.json`. O fluxo de build precisa executar `npm install` e `npx cap sync android` antes de compilar.

No Android, o motoboy deve conceder a permissão de localização solicitada pelo app, manter o GPS ligado e iniciar o expediente dentro do aplicativo. A notificação persistente informa quando o GPS está ativo. Restrições de bateria do fabricante podem afetar a frequência das atualizações; testar em aparelhos reais antes de usar em produção.

## Privacidade e retenção

- O rastreamento começa apenas após o motoboy tocar em **Iniciar expediente**.
- Ao tocar em **Encerrar expediente**, o serviço nativo é parado e o status fica inativo.
- O painel mostra somente expedientes ativos e marca a conexão como desatualizada quando não recebe posição por mais de 90 segundos.
- As posições históricas ficam na tabela `entrega365_location_points`. Defina uma política de retenção antes da entrada em produção, conforme a necessidade operacional e a LGPD.
- O mapa utiliza tiles públicos do OpenStreetMap. Para volume maior, avalie um provedor de mapas com política de uso adequada.

## Testes de aceitação

1. Login de administrador autorizado e não autorizado.
2. Login de motoboy com conta Google própria.
3. Iniciar expediente, confirmar primeira posição e confirmar atualização no painel.
4. Bloquear a tela por pelo menos 15 minutos e confirmar que o serviço continua enviando posições.
5. Desligar a internet e confirmar que o painel marca a localização como desatualizada.
6. Restaurar a internet e confirmar reconexão.
7. Encerrar expediente e confirmar que novas posições deixam de ser recebidas.
8. Verificar Android 13+ e 14+ com permissões de notificação/localização e otimização de bateria.
