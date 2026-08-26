/* A sessão do Entrega365 só deve ser encerrada pelo botão Sair. */
(function(){
  // Não remova dcv2:session em pagehide/unload: esses eventos também
  // acontecem durante o retorno do OAuth (Google) e podem apagar a sessão
  // recém-criada antes do app terminar de inicializar.
})();
