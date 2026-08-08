const menu=document.getElementById('menu');
const drawer=document.getElementById('drawer');
const backdrop=document.getElementById('drawerBackdrop');
const close=document.getElementById('drawerClose');
function setDrawer(open){drawer.classList.toggle('open',open);backdrop.classList.toggle('open',open);drawer.setAttribute('aria-hidden',String(!open));menu.setAttribute('aria-expanded',String(open))}
menu.addEventListener('click',()=>setDrawer(true));
close.addEventListener('click',()=>setDrawer(false));
backdrop.addEventListener('click',()=>setDrawer(false));
addEventListener('keydown',event=>{if(event.key==='Escape')setDrawer(false)});
