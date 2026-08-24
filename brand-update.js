const FULL_LOGO="./logo-entrega365.svg?v=76";
const ICON_LOGO="./icon-72.svg?v=76";
function applyEntrega365Brand(){
  document.querySelectorAll(".biglogo").forEach(el=>{
    el.style.background="none";
    el.style.border="0";
    el.style.borderRadius="0";
    el.style.boxShadow="none";
    el.innerHTML="";
    const img=document.createElement("img");
    img.src=FULL_LOGO;
    img.alt="Entrega365";
    img.decoding="async";
    img.loading="eager";
    img.style.cssText="display:block;width:100%;height:100%;object-fit:contain";
    el.appendChild(img);
    el.style.width="min(94vw,380px)";
    el.style.height="245px";
  });
  document.querySelectorAll(".logo").forEach(el=>{
    el.style.background="none";
    el.style.backgroundImage=`url(\"${ICON_LOGO}\")`;
    el.style.backgroundSize="contain";
    el.style.backgroundPosition="center";
    el.style.backgroundRepeat="no-repeat";
    el.style.border="0";
    el.style.borderRadius="12px";
    el.style.boxShadow="none";
  });
  let icon=document.querySelector('link[rel="icon"]');
  if(icon)icon.href="./app-icon.svg?v=76";
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(applyEntrega365Brand,120));
else setTimeout(applyEntrega365Brand,120);
setTimeout(applyEntrega365Brand,500);
