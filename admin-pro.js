/* Compatibilidade v149: não existe mais exceção de administrador para o plano PRO.
   O status PRO é definido exclusivamente pela assinatura validada no Mercado Pago. */
(function(){
  localStorage.removeItem('entrega365:adminPro');
})();