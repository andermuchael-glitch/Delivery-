# Plano de implementação — Vínculo logístico do Entrega365

Status: planejamento para branch de testes. Não publicar em produção até concluir os testes de aceitação.

## Decisões confirmadas
- O estabelecimento define a duração proposta do vínculo; o motoboy precisa aceitar explicitamente.
- Um motoboy pode ter vínculos simultâneos com vários estabelecimentos, cada um com seu próprio período, estado e histórico.
- O encerramento antecipado deve ser solicitado e confirmado por ambas as partes (acordo registrado no sistema).
- Preservar o controle existente de comandas, taxas e financeiro.
- O controle financeiro pessoal do motoboy continua disponível sem exigir que ele pague uma assinatura individual.
- Modelo comercial pretendido: R$ 19,90/mês por estabelecimento, motoboys ilimitados. A integração de pagamento deve ser validada antes de substituir o checkout existente.

## Princípios de arquitetura
1. Não reutilizar a comanda como se fosse uma entrega: manter comanda/taxas como núcleo existente e criar entidades logísticas relacionadas quando apropriado.
2. Cada registro operacional deve ter establishment_id; autorização sempre verifica o vínculo específico, não apenas o e-mail do motoboy.
3. Vínculos, entregas, confirmações e eventos de rota são históricos. Encerrar um vínculo não apaga registros anteriores.
4. Não começar nem continuar rastreamento em segundo plano sem expediente iniciado explicitamente e autorização visível.
5. Evitar alterações no fluxo de autenticação, cobrança Pro atual e dados existentes até que os testes de regressão passem.

## Fases propostas

### Fase 0 — Inventário e proteção
- Mapear o fluxo atual de comandas, taxas, financeiro, Pro e autenticação.
- Confirmar esquema PostgreSQL real, funções SQL e deploy Preview.
- Registrar testes de regressão do comportamento atual antes de editar código.
- Manter todas as alterações na branch feature/rastreamento-motoboys e PR em rascunho.

### Fase 1 — Vínculo contratual operacional
- Acrescentar ao membro do estabelecimento: estado, data inicial, data final proposta, texto/versão dos termos, quem propôs, data de aceite, data de encerramento e motivo.
- Estados sugeridos: invited, active, end_requested_by_establishment, end_requested_by_courier, ended, expired.
- Convite deve incluir o período e resumo das condições; somente o aceite do motoboy ativa o vínculo.
- Alterar prazo após aceite exige nova confirmação explícita.
- Saída antecipada: uma parte solicita; a outra confirma. Registrar ambas as identidades e horários. Definir um procedimento de suporte para desacordo sem apagar o histórico.
- Expiração não deve apagar o vínculo; bloqueia novas atribuições e encerra permissões de operação conforme regra definida.

### Fase 2 — Multiestabelecimento seguro
- Exibir ao motoboy a lista de vínculos ativos, com nome do estabelecimento e vigência.
- O motoboy seleciona para qual estabelecimento iniciar o expediente; nunca escolher silenciosamente o vínculo mais recente.
- Permitir apenas um expediente GPS ativo por dispositivo/conta por vez inicialmente, com estabelecimento explícito. Cada posição e sessão deve registrar esse estabelecimento.
- Filtrar rotas, posições e confirmações pelo vínculo/estabelecimento selecionado.
- Garantir que o proprietário de uma empresa não consulte dados de outra empresa, mesmo tentando chamadas diretas à API.

### Fase 3 — Entrega e confirmação
- Criar uma entidade de entrega separada da comanda existente, com identificador, estabelecimento, motoboy, endereço, estado e timestamps.
- Estados: aguardando atribuição, atribuída, em rota, entregue, ocorrência/tentativa sem sucesso, cancelada.
- Cada transição registra autor e horário; a confirmação de entrega pode incluir observação e comprovante opcional.
- A comanda existente não muda de semântica. A ligação com uma entrega deve ser opcional e adicionada sem migração destrutiva.
- Relatórios calculam tempos e taxas sem reescrever valores financeiros antigos.

### Fase 4 — Gestão do estabelecimento
- Painel de equipe e vigência dos vínculos.
- Quadro de entregas por estado.
- Indicadores de atrasos, entregas concluídas e ocorrências.
- Relatório exportável; dados financeiros de um estabelecimento não ficam visíveis a outro.
- Push/notificações somente após definir permissões e comportamento em segundo plano.

### Fase 5 — Financeiro e cobrança
- Manter o financeiro pessoal do motoboy independente do financeiro empresarial.
- Não misturar ganhos/taxas do motoboy com receitas/despesas privadas do estabelecimento.
- Auditar o checkout Mercado Pago existente antes de reaproveitá-lo. Confirmar se o plano editado no painel Mercado Pago corresponde à API de preapproval usada pelo app; não presumir que mudar o plano no painel altera automaticamente o endpoint.
- Não migrar nem alterar as assinaturas Pro existentes sem verificar seu estado e impacto.
- A assinatura do estabelecimento só habilita funcionalidades após confirmação autenticada do Mercado Pago.

## Testes de aceitação obrigatórios
1. Comandas, taxas e financeiro atuais continuam funcionando sem alterações de resultados.
2. Motoboy recebe convite com duração, aceita e vê o vínculo ativo.
3. Um motoboy aceita vínculos de dois estabelecimentos com períodos distintos.
4. Cada estabelecimento vê somente sua equipe, rotas, posições e entregas.
5. Expiração bloqueia novas atribuições sem apagar histórico.
6. Encerramento antecipado exige pedido e confirmação de ambas as partes.
7. A sessão GPS só inicia para o estabelecimento selecionado e para vínculo ativo.
8. Ao encerrar expediente, param novas posições; dados históricos permanecem acessíveis conforme permissão.
9. Confirmação de entrega registra autor, data/hora e estado sem alterar a comanda original.
10. Testes de API tentam acesso cruzado e devem retornar 403/404.
11. Testar em mobile/Android, inclusive tela bloqueada e perda de conexão.
12. Testar checkout/webhook em ambiente de teste antes de qualquer cobrança real.

## Critério de publicação
Não mesclar nem publicar até concluir revisão de segurança, regressão do núcleo atual, testes de isolamento multiestabelecimento, teste de pagamentos e revisão de privacidade/LGPD. Nenhuma assinatura ou dado existente deve ser apagado durante as migrações.