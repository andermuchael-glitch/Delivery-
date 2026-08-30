# Entrega365 Android — versão de teste

Esta branch é isolada da versão web estável.

## Objetivo
Criar uma primeira versão Android com Capacitor sem alterar o funcionamento do site publicado.

## Arquitetura inicial
O aplicativo de teste abre a versão web estável hospedada em:

https://www.entrega365.com.br

O código web do site não é alterado por esta branch.

## Próximos passos
1. Instalar dependências Node.
2. Executar `npx cap add android`.
3. Gerar o projeto Android localmente.
4. Testar login, sincronização Google Drive e plano Pro.
5. Somente depois decidir se recursos nativos serão adicionados.

## Importante
Esta configuração usa o domínio de produção apenas como conteúdo remoto para o APK de teste. Nenhuma alteração é feita na branch main.
