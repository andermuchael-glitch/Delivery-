# Delivery Comandas

PWA para controle de comandas, taxas, fechamento diário, KM, gastos, mecânica/troca de óleo e relatório mensal.

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

O Service Worker agora usa uma versão de cache própria, remove caches antigos após atualização e inclui `app.js` no cache. O manifesto também declara o ícone da aplicação.

## Publicação

A aplicação é estática e pode ser publicada pelo GitHub Pages.
