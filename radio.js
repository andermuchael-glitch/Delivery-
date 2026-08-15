(() => {
  "use strict";
  const STREAM = "https://stream.zeno.fm/c45wbq2us3buv";
  const OFFICIAL = "https://jovempan.com.br/ao-vivo/";
  const style = document.createElement("style");
  style.textContent = `
    #jp-radio{position:fixed;left:10px;right:10px;bottom:82px;z-index:25;display:none;align-items:center;gap:9px;padding:9px 10px;border:1px solid #1b4163;border-radius:14px;background:rgba(7,18,30,.97);box-shadow:0 8px 24px #0008;backdrop-filter:blur(12px)}
    #jp-radio .jp-title{flex:1;min-width:0}.jp-title b{display:block;font-size:12px}.jp-title span{display:block;color:#91a0b4;font-size:10px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #jp-radio button{border:1px solid #29465e;background:#0b1a29;color:#fff;border-radius:10px;min-width:38px;height:38px;font-size:17px}.jp-play{background:#087cff!important;border-color:#087cff!important}.jp-stop{border-color:#704047!important}.jp-hide{font-size:14px!important;min-width:32px!important}
    #jp-radio-fab{position:fixed;right:12px;bottom:86px;z-index:26;border:1px solid #1b4163;background:#0b1a29;color:#fff;border-radius:50%;width:48px;height:48px;font-size:21px;box-shadow:0 6px 20px #0008}
    @media(max-width:390px){#jp-radio{left:7px;right:7px}.jp-title span{max-width:150px}}
  `;
  document.head.appendChild(style);

  function getAudio() {
    if (window.__jpAudio) return window.__jpAudio;
    const audio = document.createElement("audio");
    audio.id = "jp-audio-persistent";
    audio.preload = "none";
    audio.playsInline = true;
    audio.src = STREAM;
    audio.setAttribute("aria-label", "Jovem Pan FM 100.9");
    // Mantém o elemento fora do conteúdo que o aplicativo reconstrói ao trocar de página.
    document.documentElement.appendChild(audio);
    window.__jpAudio = audio;
    return audio;
  }

  function install() {
    if (document.getElementById("jp-radio")) return;
    const audio = getAudio();
    const fab = document.createElement("button");
    fab.id = "jp-radio-fab";
    fab.title = "Jovem Pan FM 100.9";
    fab.textContent = "📻";

    const bar = document.createElement("div");
    bar.id = "jp-radio";
    bar.innerHTML = `<div class="jp-title"><b>Jovem Pan FM</b><span>100.9 FM • Rádio ao vivo</span></div><button class="jp-play" id="jp-play">▶</button><button class="jp-stop" id="jp-stop">⏹</button><button id="jp-volume">🔊</button><button class="jp-hide" id="jp-hide">×</button>`;
    document.body.append(fab, bar);

    const play = bar.querySelector("#jp-play");
    const volume = bar.querySelector("#jp-volume");

    const sync = () => { play.textContent = audio.paused ? "▶" : "⏸"; };
    fab.onclick = () => { bar.style.display = bar.style.display === "flex" ? "none" : "flex"; sync(); };
    // Esconder o player NÃO interrompe a rádio.
    bar.querySelector("#jp-hide").onclick = () => { bar.style.display = "none"; };
    // Só este botão interrompe a transmissão.
    bar.querySelector("#jp-stop").onclick = () => { audio.pause(); audio.currentTime = 0; sync(); };
    play.onclick = async () => {
      if (audio.paused) {
        try { await audio.play(); sync(); }
        catch { window.open(OFFICIAL, "_blank", "noopener,noreferrer"); }
      } else { audio.pause(); sync(); }
    };
    volume.onclick = () => { audio.muted = !audio.muted; volume.textContent = audio.muted ? "🔇" : "🔊"; };
    audio.addEventListener("pause", sync);
    audio.addEventListener("play", sync);
    sync();
  }

  new MutationObserver(install).observe(document.documentElement, { childList: true, subtree: true });
  install();
})();
