// Local pet animation only. Does not imply an agent seat or archive success.
(()=>{
 const home=document.getElementById('pet-program-cyberhome'),rat=document.getElementById('home-rat'),toy=document.getElementById('home-toy'),message=document.getElementById('home-message');
 const pause=document.getElementById('home-pause'),play=document.getElementById('home-play'),deck=document.getElementById('cyber-deck'),launcher=document.getElementById('cyberdeck-launcher');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');let paused=reduced.matches,x=0,y=0,targetX=.5,targetY=.48,last=0,nextWander=0,frame=0,started=false;
 const bounds=()=>({w:Math.max(0,home.clientWidth-rat.offsetWidth-12),h:Math.max(0,home.clientHeight-rat.offsetHeight-46)});
 function draw(){const {w,h}=bounds();x=Math.max(6,Math.min(w,x));y=Math.max(6,Math.min(h,y));rat.style.transform=`translate(${x}px,${y}px)`;}
 function updatePause(){pause.textContent=paused?'Resume motion':'Pause motion';pause.setAttribute('aria-pressed',String(paused));}
 function tick(now){frame=0;if(paused||document.hidden)return;const dt=Math.min((now-last)/1000||0,.05);last=now;const {w,h}=bounds();if(!started){x=w*.45;y=h*.48;started=true;}
  if(now>nextWander){targetX=.12+Math.random()*.76;targetY=.15+Math.random()*.64;nextWander=now+3200+Math.random()*2200;message.textContent='Chat Rat is exploring its garden.';}
  const dx=targetX*w-x,dy=targetY*h-y,d=Math.hypot(dx,dy),step=Math.min(d,50*dt);if(d>1){x+=dx/d*step;y+=dy/d*step;}draw();frame=requestAnimationFrame(tick);
 }
 function resume(){if(!frame&&!paused&&!document.hidden){last=performance.now();frame=requestAnimationFrame(tick);}}
 function toss(){const {w,h}=bounds();targetX=.12+Math.random()*.72;targetY=.2+Math.random()*.55;nextWander=performance.now()+6500;toy.style.left=Math.min(home.clientWidth-toy.offsetWidth-12,Math.max(12,targetX*w+rat.offsetWidth*.5))+'px';toy.style.top=Math.min(home.clientHeight-toy.offsetHeight-46,Math.max(12,targetY*h+rat.offsetHeight*.65))+'px';message.textContent=paused?'The ball is ready. Resume motion to let Chat Rat chase it.':'Chat Rat is chasing its ball!';resume();}
 home.addEventListener('pointermove',event=>{if(event.pointerType==='touch'||paused)return;const r=home.getBoundingClientRect(),b=bounds();targetX=Math.max(0,Math.min(1,(event.clientX-r.left-rat.offsetWidth/2)/Math.max(1,b.w)));targetY=Math.max(0,Math.min(1,(event.clientY-r.top-rat.offsetHeight/2)/Math.max(1,b.h)));nextWander=performance.now()+3500;});
 pause.onclick=()=>{paused=!paused;if(paused){cancelAnimationFrame(frame);frame=0;message.textContent='Chat Rat is resting in its cyberhome.';}else{message.textContent='Chat Rat is exploring its garden.';resume();}updatePause();};
 play.onclick=toy.onclick=toss;document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else resume();});
 reduced.addEventListener('change',()=>{paused=reduced.matches;cancelAnimationFrame(frame);frame=0;updatePause();resume();});
 new ResizeObserver(()=>{if(!started){const b=bounds();x=b.w*.45;y=b.h*.48;}draw();}).observe(home);
 launcher.onclick=()=>{if(!deck.open)deck.showModal();launcher.setAttribute('aria-expanded','true');};
 document.getElementById('deck-close').onclick=()=>deck.close();deck.addEventListener('close',()=>{launcher.setAttribute('aria-expanded','false');launcher.focus();});
 document.getElementById('deck-home').onclick=()=>{deck.close();home.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'center'});play.focus({preventScroll:true});};
 document.getElementById('deck-save').onclick=()=>{deck.close();const save=document.getElementById('save');save.scrollIntoView({block:'center'});save.click();};
 updatePause();if(paused)message.textContent='Chat Rat is resting. Reduced motion is enabled.';resume();
})();
