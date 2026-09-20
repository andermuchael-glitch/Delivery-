# Entrega365 para Android

O Entrega365 continua sendo o mesmo aplicativo web/PWA. A camada Android usa Capacitor para empacotar a versão web em um aplicativo instalável.

## Como gerar o APK

O GitHub Actions executa automaticamente o workflow **Build Entrega365 APK** quando alterações relevantes chegam à branch `main`.

O resultado fica em:

**Actions → Build Entrega365 APK → workflow concluído → Artifacts → Entrega365-APK-debug**

Esse primeiro APK é de teste (debug), próprio para instalar e validar no celular.

## Próxima etapa

Depois de validar o APK, podemos preparar uma versão **release assinada**, com:

- nome e ícone Entrega365;
- tela de abertura;
- botão voltar do Android integrado;
- tratamento de links externos;
- integração nativa de localização;
- notificações;
- assinatura para distribuição.

A versão web continua funcionando separadamente; o trabalho Android não substitui nem apaga o site.
