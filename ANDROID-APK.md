# Entrega365 para Android e Google Play

O Entrega365 usa Capacitor para empacotar o aplicativo web em Android.

## Build de produção

O workflow **Build Entrega365 AAB Release** gera um **Android App Bundle (.aab)** assinado com a chave de upload configurada nos Secrets do GitHub.

O Google Play exige Android App Bundle para novos aplicativos e usa o pacote enviado para gerar os APKs específicos dos dispositivos. urlDocumentação do Android App Bundlehttps://developer.android.com/guide/app-bundle

### Requisitos configurados

- pacote: `br.com.entrega365.app`;
- nome: **Entrega365**;
- Capacitor 8;
- compileSdk 36;
- targetSdk 36;
- versão e versionCode informados manualmente no workflow;
- build de produção `bundleRelease`;
- assinatura de upload separada da chave de assinatura do app do Google Play;
- AAB publicado como artefato do GitHub Actions.

O target API 36 é necessário para novos apps e atualizações enviados ao Google Play desde 31 de agosto de 2026. urlRequisito de API de destino do Google Playhttps://developer.android.com/google/play/requirements/target-sdk

## Secrets necessários

No GitHub, em **Settings → Secrets and variables → Actions**, configure:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

A chave de upload é uma chave privada e não deve ser colocada no repositório. O Google recomenda manter o keystore seguro e usar a Assinatura de apps do Google Play. urlAssinatura de apps do Google Playhttps://support.google.com/googleplay/android-developer/answer/9842756?hl=pt-BR

## Como gerar o AAB

1. Abra **Actions** no GitHub.
2. Selecione **Build Entrega365 AAB Release**.
3. Clique em **Run workflow**.
4. Informe o `version_code` e o `version_name`.
5. Aguarde o workflow terminar.
6. Em **Artifacts**, baixe o `Entrega365-AAB-release...`.
7. No Play Console, crie uma versão de teste ou produção e envie o `.aab`.

O Google Play permite configurar a Assinatura de apps do Google Play no primeiro lançamento. urlPreparar e lançar uma versão no Play Consolehttps://support.google.com/googleplay/android-developer/answer/9859348?hl=pt-BR

## Importante

A chave de upload deve ser preservada para futuras versões. O `versionCode` precisa aumentar a cada atualização e o pacote precisa permanecer `br.com.entrega365.app`. urlRegras de atualização de appshttps://support.google.com/googleplay/android-developer/answer/9859350?hl=pt-BR

A localização/rastreamento continua removida do aplicativo. O backup não foi alterado nesta preparação.
