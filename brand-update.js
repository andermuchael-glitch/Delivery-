const FULL_LOGO="./logo-entrega365.jpg?v=118";
const ICON_LOGO="./app-icon.svg?v=118";
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
    el.style.width="min(94vw,520px)";
    el.style.height="300px";
  });
  document.querySelectorAll(".logo").forEach(el=>{
    el.style.background="none";
    el.style.backgroundImage=`url(\"${ICON_LOGO}\")`;
    el.style.backgroundSize="contain";
    el.style.backgroundPosition="center";
    el.style.backgroundRepeat="no-repeat";
    el.style.border="0";
    el.style.boxShadow="none";
  });
  const icon=document.querySelector('link[rel="icon"]');
  if(icon)icon.href=ICON_LOGO;
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",applyEntrega365Brand);
else applyEntrega365Brand();
setTimeout(applyEntrega365Brand,250);
