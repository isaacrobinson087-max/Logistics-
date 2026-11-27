(()=>{
  'use strict';
  const $=(id)=>document.getElementById(id);
  const header=$('header');
  const menu=$('menu-button');
  const mobileNav=$('mobile-nav');
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const orderStorageKey='kinetic_v4_demo_orders';
  const clock=(date)=>new Date(date).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});
  const safeString=(x)=>String(x ?? '').trim().slice(0,200);
  let activeRoute='home', scrollFrame=0;
  function closeMenu(returnFocus=false){const wasOpen=!mobileNav.hidden;mobileNav.hidden=true;document.body.classList.remove('menu-open');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Open menu');if(returnFocus&&wasOpen)menu.focus();}
  menu.addEventListener('click',()=>{
    const open=mobileNav.hidden;mobileNav.hidden=!open;
    document.body.classList.toggle('menu-open',open);
    menu.setAttribute('aria-expanded',String(open));
    menu.setAttribute('aria-label',open?'Close menu':'Open menu');
    if(open)mobileNav.querySelector('a')?.focus();else menu.focus();
  });
  document.addEventListener('keydown',ev=>{
    if(mobileNav.hidden)return;
    if(ev.key==='Escape'){closeMenu(true);return}
    if(ev.key!=='Tab')return;
    const items=[...mobileNav.querySelectorAll('a')];
    if(!items.length)return;
    const first=items[0],last=items.at(-1);
    if(ev.shiftKey&&document.activeElement===first){ev.preventDefault();last.focus()}
    else if(!ev.shiftKey&&document.activeElement===last){ev.preventDefault();first.focus()}
  });
  window.addEventListener('resize',()=>{if(window.innerWidth>950)closeMenu()});
  mobileNav.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
  function showPage(){
    const raw=location.hash.replace(/^#\/?/,'').split(/[/?]/)[0];
    activeRoute=['home','about','book','contact','account','ops','rider'].includes(raw)?raw:'home';
    document.querySelectorAll('main>.route').forEach(el=>{el.hidden=el.id!=='page-'+activeRoute});
    document.querySelectorAll('[data-page-link]').forEach(el=>{if(el.dataset.pageLink===activeRoute)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current')});
    closeMenu();
    document.title=`KINETIC — ${{home:'Every move matters',about:'Our approach',book:'Book & Track',contact:'Contact',account:'Account access',ops:'Operations preview',rider:'Rider preview'}[activeRoute]}`;
    window.scrollTo({top:0,behavior:'auto'});
    if(activeRoute==='book')renderTracking();
    if(activeRoute==='ops')renderOperations();
    if(activeRoute==='rider')renderRider();
    updateHeader();
  }
  function updateHeader(){
    const light=['about','book','account','ops','rider'].includes(activeRoute);
    header.classList.toggle('is-light',light);
    header.classList.toggle('is-solid',!light&&((activeRoute!=='home')||window.scrollY>85));
    header.classList.toggle('scrolled',window.scrollY>80);
  }
  function onScroll(){
    if(scrollFrame)return;
    scrollFrame=requestAnimationFrame(()=>{scrollFrame=0;updateHeader()});
  }
  window.addEventListener('scroll',onScroll,{passive:true});
  window.addEventListener('resize',onScroll,{passive:true});
  window.addEventListener('hashchange',showPage);
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
  function initializeReveals(){
    const parts=document.querySelectorAll('#page-home [data-reveal]');
    if(reducedMotion||!('IntersectionObserver' in window)){
      parts.forEach(el=>el.classList.add('is-visible'));return;
    }
    document.documentElement.classList.add('motion-ready');
    // Reveal lower homepage content in both scroll directions.
    const observer=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        entry.target.classList.toggle('is-visible',entry.isIntersecting);
      });
    },{threshold:.08,rootMargin:'0px 0px -35px 0px'});
    parts.forEach(el=>observer.observe(el));
  }

  // Two scroll-driven sticky scenes. Each frame derives from the actual amount
  // scrolled while a scene is pinned, then eases toward that progress.
  // Scrolling upward runs the same exact sequence backward.
  function initScrollStory(){
    const scenes=[...document.querySelectorAll('#page-home [data-scroll-animate]')];
    if(!scenes.length||reducedMotion)return;
    const clamp=n=>Math.max(0,Math.min(1,n));
    const ease=n=>{n=clamp(n);return n*n*(3-2*n)};
    const items=scenes.map(el=>({el,position:0}));
    let frame=0,previous=0;
    const write=(item,p)=>{
      const inverse=1-p;
      const css=item.el.style;
      css.setProperty('--kinetic-enter',p.toFixed(4));
      css.setProperty('--kinetic-inverse',inverse.toFixed(4));
      // Intro labels arrive first, then main title, then photograph.
      css.setProperty('--story-label',ease(p/.30).toFixed(4));
      css.setProperty('--story-title',ease((p-.11)/.45).toFixed(4));
      css.setProperty('--story-copy',ease((p-.34)/.39).toFixed(4));
      css.setProperty('--story-image',ease((p-.20)/.66).toFixed(4));
      // Last-mile copy rises with the road, followed by the floating rider.
      css.setProperty('--story-movement-title',ease((p-.10)/.54).toFixed(4));
      css.setProperty('--story-movement-copy',ease((p-.44)/.42).toFixed(4));
      css.setProperty('--story-rider',ease((p-.22)/.58).toFixed(4));
      css.setProperty('--story-road',p.toFixed(4));
    };
    const getProgress=el=>{
      const available=Math.max(1,el.offsetHeight-window.innerHeight);
      const top=el.getBoundingClientRect().top;
      return ease(-top/available);
    };
    function tick(now){
      frame=0;
      if(activeRoute!=='home')return;
      const dt=previous?Math.min(64,now-previous):16;
      previous=now;
      let changing=false;
      for(const item of items){
        const aim=getProgress(item.el);
        item.position+=(aim-item.position)*(1-Math.exp(-dt/125));
        if(Math.abs(aim-item.position)<.0006)item.position=aim;
        else changing=true;
        write(item,item.position);
      }
      if(changing)frame=requestAnimationFrame(tick);
    }
    function schedule(){if(!frame){previous=0;frame=requestAnimationFrame(tick)}}
    items.forEach(item=>{item.position=getProgress(item.el);write(item,item.position)});
    document.documentElement.classList.add('kinetic-motion-ready');
    window.addEventListener('scroll',schedule,{passive:true});
    window.addEventListener('resize',schedule,{passive:true});
    window.addEventListener('hashchange',schedule);
    schedule();
  }

  initializeReveals();initScrollStory();showPage();
})();
