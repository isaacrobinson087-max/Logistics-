(()=>{
  'use strict';
  const $=(id)=>document.getElementById(id);
  const header=$('header');
  const menu=$('menu-button');
  const mobileNav=$('mobile-nav');
  const hero=$('hero');
  const heroVideo=$('hero-video');
  const journey=$('journey');
  const stage=$('story-stage');
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover=window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  const orderStorageKey='kinetic_v4_demo_orders';
  const clock=(date)=>new Date(date).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});
  const safeString=(x)=>String(x ?? '').trim().slice(0,200);
  let activeRoute='home', heroCompleted=false, currentScene=-1, scrollFrame=0;
  const vids=[ $('story-video-parcel'), $('story-video-conveyor'), $('story-video-rider') ];
  const chapterNames=['Preparation','Operations','The road','Visibility'];
  function welcome(){if(heroCompleted)return;heroCompleted=true;hero.classList.add('has-welcomed');$('skip-intro').hidden=true}
  function initializeHero(){
    if(reducedMotion){heroVideo.pause();welcome();return;}
    const stopAt=3.73;
    const stop=()=>{if(heroVideo.currentTime>=stopAt){heroVideo.pause();welcome()}};
    heroVideo.addEventListener('timeupdate',stop);
    heroVideo.addEventListener('ended',welcome);
    heroVideo.addEventListener('error',welcome);
    const attempt=heroVideo.play();
    if(attempt&&typeof attempt.catch==='function')attempt.catch(welcome);
    window.setTimeout(welcome,5100);
    $('skip-intro').addEventListener('click',()=>{heroVideo.pause();welcome()});
  }
  function closeMenu(){mobileNav.hidden=true;menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Open menu');}
  menu.addEventListener('click',()=>{const open=mobileNav.hidden;mobileNav.hidden=!open;menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Close menu':'Open menu')});
  mobileNav.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
  function showPage(){
    const raw=location.hash.replace(/^#\/?/,'').split(/[/?]/)[0];
    activeRoute=['home','about','book','contact','account','ops','rider'].includes(raw)?raw:'home';
    document.querySelectorAll('main>.route').forEach(el=>{el.hidden=el.id!=='page-'+activeRoute});
    document.querySelectorAll('[data-page-link]').forEach(el=>{if(el.dataset.pageLink===activeRoute)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current')});
    closeMenu();
    document.title=`KINETIC — ${{home:'Every move matters',about:'Our approach',book:'Book & Track',contact:'Contact',account:'Account access',ops:'Operations preview',rider:'Rider preview'}[activeRoute]}`;
    window.scrollTo({top:0,behavior:'instant'});
    if(activeRoute!=='home'){heroVideo.pause();vids.forEach(v=>v.pause())}
    if(activeRoute==='book')renderTracking();
    if(activeRoute==='ops')renderOperations();
    if(activeRoute==='rider')renderRider();
    updateHeader();
    if(activeRoute==='home')requestAnimationFrame(updateStory);
  }
  function updateHeader(){
    const light=['about','book','account','ops','rider'].includes(activeRoute)||(activeRoute==='home'&&window.scrollY>journey.offsetTop+journey.offsetHeight-120);
    header.classList.toggle('is-light',light);
    header.classList.toggle('is-solid',!light&&((activeRoute!=='home')||window.scrollY>85));
    header.classList.toggle('scrolled',window.scrollY>80);
  }
  const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
  function updateStory(){
    if(activeRoute!=='home'||journey.hidden)return;
    const outer=journey.getBoundingClientRect();
    const range=Math.max(1,journey.offsetHeight-window.innerHeight);
    const p=clamp(-outer.top/range);
    // Map story progress to 4 independent chapters. Scrolling backwards reverses the visual story.
    const chapter=Math.min(3,Math.floor(p*4.00001));
    if(chapter!==currentScene){
      currentScene=chapter;
      stage.dataset.active=String(chapter);
      document.querySelectorAll('[data-story-back]').forEach(el=>el.classList.toggle('active',Number(el.dataset.storyBack)===chapter));
      document.querySelectorAll('[data-story-caption]').forEach(el=>el.classList.toggle('active',Number(el.dataset.storyCaption)===chapter));
      $('story-count').textContent=`0${chapter+1} — 04`;
      updateHeader();
    }
    $('story-progress-bar').style.width=(p*100).toFixed(2)+'%';
    if(!reducedMotion&&chapter<3){
      // Throttle seeks on mobile: repeated fine seeks on compressed video cause visible stutter.
      const vid=vids[chapter];
      const dur=(Number.isFinite(vid.duration)&&vid.duration>0)?vid.duration:0;
      const seg=clamp(p*4-chapter);
      const target=dur?clamp(seg*(dur-.15),0,dur-.15):0;
      const now=performance.now();
      if(dur&&!vid.seeking&&Math.abs(vid.currentTime-target)>.20&&now-(vid._seekAt||0)>(canHover?55:135)){
        try{vid.pause();vid.currentTime=target;vid._seekAt=now}catch{}
      }
    }
    const marker=$('demo-marker');
    if(marker){const pr=clamp((p-.75)/.25);marker.setAttribute('transform',`translate(${(145+630*pr).toFixed(0)} ${(430-310*pr).toFixed(0)})`)}
  }
  function onScroll(){if(scrollFrame)return;scrollFrame=requestAnimationFrame(()=>{scrollFrame=0;updateHeader();updateStory()})}
  window.addEventListener('scroll',onScroll,{passive:true});
  window.addEventListener('resize',onScroll,{passive:true});
  window.addEventListener('hashchange',showPage);
  $('explore-journey').addEventListener('click',(ev)=>{ev.preventDefault();journey.scrollIntoView({behavior:reducedMotion?'instant':'smooth'})});
  if(canHover&&!reducedMotion)hero.addEventListener('pointermove',ev=>{const rect=hero.getBoundingClientRect();hero.style.setProperty('--mx',(((ev.clientX-rect.left)/rect.width-.5)*12).toFixed(2)+'px');hero.style.setProperty('--my',(((ev.clientY-rect.top)/rect.height-.5)*10).toFixed(2)+'px')},{passive:true});
  // Demo data belongs only to this browser and does not sync across devices or send messages.
  let memoryOrders=[];
  function getOrders(){try{const saved=JSON.parse(localStorage.getItem(orderStorageKey)||'[]');return Array.isArray(saved)?saved:memoryOrders}catch{return memoryOrders}}
  function setOrders(list){memoryOrders=list;try{localStorage.setItem(orderStorageKey,JSON.stringify(list))}catch{}}
  const statuses=['Request received','Assigned','Accepted','Collected','In transit','Delivered'];
  function createElement(tag,cls,value){const el=document.createElement(tag);if(cls)el.className=cls;if(value!==undefined)el.textContent=value;return el}
  function uniqueRef(){const buf=new Uint8Array(4);if(window.crypto?.getRandomValues)crypto.getRandomValues(buf);else buf.forEach((_,i)=>buf[i]=Math.floor(Math.random()*256));return 'KNT-'+Array.from(buf,b=>b.toString(16).padStart(2,'0')).join('').slice(0,7).toUpperCase()}
  function makeBooking(ev){ev.preventDefault();const fd=new FormData(ev.currentTarget);const pickup=safeString(fd.get('pickup'));const dropoff=safeString(fd.get('dropoff'));const description=safeString(fd.get('parcel'));const sender=safeString(fd.get('sender'));const phone=safeString(fd.get('phone'));
    if(!pickup||!dropoff||!description||!sender||!phone){$('booking-message').textContent='Please complete all fields to create a demonstration order.';return}
    const ref=uniqueRef();const data={ref,pickup,dropoff,description,created:new Date().toISOString(),status:'Request received',rider:null,events:[{status:'Request received',at:new Date().toISOString()}]};
    // We intentionally do not persist the sender's phone number or name in this public prototype.
    setOrders([data,...getOrders()]);
    $('booking-message').textContent=`Demo request created: ${ref}. It is saved only in this browser. No pickup has been booked.`;
    $('tracking-input').value=ref;renderTracking();ev.currentTarget.reset();
  }
  $('booking-form').addEventListener('submit',makeBooking);
  function renderTracking(){
    const box=$('track-results');if(!box)return;box.replaceChildren();
    const ref=$('tracking-input').value.trim().toUpperCase();
    if(!ref){box.append(createElement('p','muted','Create a demo booking to generate a tracking reference. Real GPS isn\'t connected.'));return}
    const order=getOrders().find(x=>x.ref===ref);
    if(!order){box.append(createElement('p','muted','No matching demonstration order in this browser.'));return}
    const title=createElement('strong','',`${order.ref} · ${order.status}`);
    const route=createElement('p','muted',`${order.pickup} → ${order.dropoff}`);
    const update=createElement('p','muted',`Last demo update: ${clock(order.events?.at(-1)?.at||order.created)}`);
    const rider=createElement('p','muted',order.rider?`Assigned rider: ${order.rider} (fictional demo profile)`:'Awaiting rider assignment');
    const note=createElement('p','muted','This is a demo status timeline. It is not live GPS or a real delivery.');
    box.append(title,route,update,rider,note);
  }
  $('lookup-button').addEventListener('click',renderTracking);
  $('tracking-input').addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();renderTracking()}});
  function button(label,action,ref){const b=createElement('button','',label);b.type='button';b.dataset.action=action;b.dataset.ref=ref;return b}
  function renderOperations(){const orders=getOrders();$('metric-all').textContent=String(orders.length);$('metric-open').textContent=String(orders.filter(o=>o.status==='Request received').length);$('metric-active').textContent=String(orders.filter(o=>!['Request received','Delivered'].includes(o.status)).length);$('metric-done').textContent=String(orders.filter(o=>o.status==='Delivered').length);
    const list=$('ops-list');list.replaceChildren();if(!orders.length){list.append(createElement('p','empty-orders','No test orders yet. Make a booking to see the dispatch workflow.'));return}
    orders.forEach(order=>{const row=createElement('div','order-row');const first=createElement('div','');first.append(createElement('strong','',order.ref),createElement('span','',`${order.pickup} → ${order.dropoff}`));const second=createElement('div','');second.append(createElement('strong','',order.description),createElement('span','',clock(order.created)));const status=createElement('div','');status.append(createElement('strong','order-status',order.status),createElement('span','',order.rider?`Rider: ${order.rider}`:'No rider yet'));const actions=createElement('div','order-actions');if(!order.rider){const sel=document.createElement('select');sel.setAttribute('aria-label',`Assign rider for ${order.ref}`);sel.dataset.ref=order.ref;['Amara','Tunde'].forEach(n=>{const opt=document.createElement('option');opt.value=n;opt.textContent=n+' (demo)';sel.append(opt)});actions.append(sel,button('Assign','assign',order.ref));}else if(order.status!=='Delivered'){actions.append(button('Advance status','advance',order.ref));}else actions.append(createElement('span','','Delivery complete'));row.append(first,second,status,actions);list.append(row)});
  }
  function advanceOrder(ref,action){const orders=getOrders();const found=orders.find(x=>x.ref===ref);if(!found)return;if(action==='assign'&&!found.rider){const sel=$('ops-list').querySelector(`select[data-ref="${ref}"]`);found.rider=sel?.value||'Amara';found.status='Assigned'}else if(action==='advance'){const idx=statuses.indexOf(found.status);found.status=statuses[Math.min(idx+1,statuses.length-1)]}else return;found.events=found.events||[];found.events.push({status:found.status,at:new Date().toISOString()});setOrders(orders);renderOperations();renderRider();renderTracking();}
  $('ops-list').addEventListener('click',ev=>{const b=ev.target.closest('button[data-action]');if(!b)return;advanceOrder(b.dataset.ref,b.dataset.action)});
  function renderRider(){const rider=$('rider-select').value;const list=$('rider-tasks');list.replaceChildren();const assignments=getOrders().filter(o=>o.rider===rider&&o.status!=='Delivered');if(!assignments.length){list.append(createElement('p','empty-orders',`No active demonstration assignments for ${rider}. Assign an order from the operations demo.`));return}
    assignments.forEach(order=>{const row=createElement('div','rider-task');const left=createElement('div','');left.append(createElement('strong','',order.ref),createElement('p','',`${order.pickup} → ${order.dropoff}`));const middle=createElement('div','');middle.append(createElement('strong','order-status',order.status),createElement('p','',order.description));const right=createElement('div','rider-actions');const next={Assigned:'Accept job',Accepted:'Confirm pickup',Collected:'Start journey','In transit':'Complete delivery'}[order.status];if(next)right.append(button(next,'riderAdvance',order.ref));row.append(left,middle,right);list.append(row)})
  }
  $('rider-select').addEventListener('change',renderRider);
  $('rider-tasks').addEventListener('click',ev=>{const b=ev.target.closest('button[data-action="riderAdvance"]');if(!b)return;const orders=getOrders();const found=orders.find(o=>o.ref===b.dataset.ref);if(!found)return;const idx=statuses.indexOf(found.status);if(idx<1||idx>=statuses.length-1)return;found.status=statuses[idx+1];found.events=found.events||[];found.events.push({status:found.status,at:new Date().toISOString()});setOrders(orders);renderRider();renderOperations();renderTracking();});
  // Ensure that a click on the brand works even when the user is already on the home route.
  document.querySelector('.brand').addEventListener('click',()=>{if(activeRoute==='home')window.scrollTo({top:0,behavior:'smooth'})});
  initializeHero();showPage();updateStory();
})();
