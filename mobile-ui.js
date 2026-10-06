export const mobileLayout = matchMedia('(max-width:760px), (max-width:1024px) and (max-height:520px)');

export function sceneInsets() {
  if (!mobileLayout.matches) return {top:95,bottom:110};
  const header=document.querySelector('.masthead').getBoundingClientRect();
  const gesture=document.querySelector('.mobile-gesture-hint').getBoundingClientRect();
  const views=document.querySelector('.viewbar-shell').getBoundingClientRect();
  const top=header.bottom+12;
  return {top,bottom:innerHeight-Math.min(gesture.height?gesture.top:views.top,views.top)+12};
}

export function setupMobileUI({onReset,onPanelChange}) {
  const panel=document.getElementById('scene-settings');
  const toggle=document.getElementById('panel-toggle');
  const close=document.getElementById('panel-close');
  const backdrop=document.getElementById('panel-backdrop');
  const background=[document.getElementById('scene'),document.querySelector('.masthead'),document.querySelector('.viewbar-shell'),document.querySelector('.mobile-dock')];
  let opened=false,previousFocus=null;

  function setOpen(value,restoreFocus=true) {
    const wasOpen=opened;
    opened=Boolean(value&&mobileLayout.matches);
    if(opened&&!wasOpen)previousFocus=document.activeElement;
    panel.classList.toggle('open',opened);
    backdrop.hidden=!opened;
    toggle.setAttribute('aria-expanded',String(opened));
    panel.inert=mobileLayout.matches&&!opened;
    for(const element of background)element.inert=opened;
    if(opened){
      panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
      panel.setAttribute('aria-labelledby','settings-title');
      close.focus({preventScroll:true});
    }else{
      panel.removeAttribute('role');panel.removeAttribute('aria-modal');panel.removeAttribute('aria-labelledby');
      if(wasOpen&&restoreFocus){
        const target=previousFocus?.isConnected&&!previousFocus.inert?previousFocus:toggle;
        target.focus({preventScroll:true});
      }
    }
    onPanelChange(opened);
  }
  toggle.addEventListener('click',()=>setOpen(!opened));
  close.addEventListener('click',()=>setOpen(false));
  document.getElementById('panel-done').addEventListener('click',()=>setOpen(false));
  backdrop.addEventListener('click',()=>setOpen(false));
  document.getElementById('reset-view').addEventListener('click',onReset);

  document.addEventListener('keydown',event=>{
    if(!opened||document.querySelector('dialog[open]'))return;
    if(event.key==='Escape'){event.preventDefault();setOpen(false);return;}
    if(event.key!=='Tab')return;
    const items=[...panel.querySelectorAll('button,input,summary,a[href],[tabindex="0"]')].filter(element=>!element.disabled&&element.getClientRects().length);
    const first=items[0],last=items.at(-1);
    if(event.shiftKey&&(document.activeElement===first||!panel.contains(document.activeElement))){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&(document.activeElement===last||!panel.contains(document.activeElement))){event.preventDefault();first?.focus();}
  });
  mobileLayout.addEventListener('change',()=>{
    const focusInPanel=panel.contains(document.activeElement);
    setOpen(false,false);
    if(focusInPanel)(mobileLayout.matches?toggle:panel).focus({preventScroll:true});
  });
  setOpen(false,false);
  return {close:()=>setOpen(false)};
}
