/* KINETIC scroll-film: reversible scroll-to-WebP animation, isolated to homepage. */
(()=>{
  'use strict';
  const section=document.querySelector('[data-scroll-hero]');
  if(!section)return;
  const canvas=section.querySelector('[data-scroll-canvas]');
  const poster=section.querySelector('[data-scroll-poster]');
  const progressBar=section.querySelector('[data-scroll-progress]');
  const readout=section.querySelector('[data-scroll-readout]');
  const context=canvas.getContext('2d',{alpha:false});
  if(!context)return;
  const FRAME_COUNT=120,PER_SHEET=15,COLS=5,SHEET_COUNT=8;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile=window.matchMedia('(max-width: 700px)');
  const dataSaver=navigator.connection?.saveData===true;
  const folderFor=()=>mobile.matches?'mobile':'desktop';
  const dimensionsFor=()=>mobile.matches?[480,854]:[854,480];
  const sheetUrl=(n)=>'assets/scroll/'+folder+'/atlas/sheet-'+String(n+1).padStart(2,'0')+'.webp';
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const cache=new Map();
  const queue=[];
  const pending=new Set();
  let folder=folderFor(),generation=0,loading=0,target=0,drawn=-1,loadedCanvas=false,lastSize='';
  let scheduled=false,lastMotion=1,lastTarget=0;
  const active=()=>!section.closest('.route')?.hidden;

  function configure(){
    folder=folderFor();generation++;
    cache.clear();pending.clear();queue.length=0;loading=0;
    loadedCanvas=false;drawn=-1;lastSize='';
    poster.src='assets/scroll/'+folder+'/atlas/poster.webp';
    poster.classList.remove('is-loaded');
    canvas.classList.remove('is-ready');
    requestSheet(0);pump();
  }
  function resizeCanvas(){
    const box=canvas.getBoundingClientRect();
    const dpr=Math.min(window.devicePixelRatio||1,2);
    const w=Math.max(1,Math.round(box.width*dpr)),h=Math.max(1,Math.round(box.height*dpr));
    const signature=w+'x'+h;
    if(lastSize!==signature){canvas.width=w;canvas.height=h;lastSize=signature;drawn=-1;}
  }
  function paint(sheet,index){
    resizeCanvas();
    const [sw,sh]=dimensionsFor();
    const ix=index%PER_SHEET;
    const col=ix%COLS,row=Math.floor(ix/COLS);
    const w=canvas.width,h=canvas.height;
    const scale=Math.max(w/sw,h/sh);
    const visibleW=w/scale,visibleH=h/scale;
    const cropX=(sw-visibleW)/2,cropY=(sh-visibleH)/2;
    context.drawImage(sheet,col*sw+cropX,row*sh+cropY,visibleW,visibleH,0,0,w,h);
    drawn=index;
    loadedCanvas=true;
    canvas.classList.add('is-ready');
    poster.classList.add('is-loaded');
  }
  function render(){
    if(!active())return;
    const sheet=cache.get(Math.floor(target/PER_SHEET));
    if(sheet?.complete&&sheet.naturalWidth){if(drawn!==target)paint(sheet,target);return;}
    // Leave the last successfully rendered frame on-screen while a new sheet decodes.
    if(loadedCanvas)return;
    for(const [n,image] of cache){if(image.complete&&image.naturalWidth){paint(image,Math.min(FRAME_COUNT-1,n*PER_SHEET));break;}}
  }
  function requestSheet(n){
    if(n<0||n>=SHEET_COUNT||cache.has(n)||pending.has(n))return;
    pending.add(n);queue.push(n);
  }
  function pump(){
    const gen=generation;
    while(loading<(dataSaver?1:2)&&queue.length){
      const n=queue.shift();pending.delete(n);
      if(cache.has(n))continue;
      const img=new Image();img.decoding='async';
      cache.set(n,img);loading++;
      img.onload=()=>{
        if(gen!==generation)return;
        loading--;
        if(Math.floor(target/PER_SHEET)===n||!loadedCanvas)render();
        pump();
      };
      img.onerror=()=>{if(gen!==generation)return;loading--;cache.delete(n);pump()};
      img.src=sheetUrl(n);
    }
  }
  function preload(){
    const current=Math.floor(target/PER_SHEET);
    requestSheet(current);
    requestSheet(current+lastMotion);
    if(!dataSaver)requestSheet(current-lastMotion);
    // Limit decoded image memory on low-end mobile devices.
    for(const key of cache.keys())if(Math.abs(key-current)>2)cache.delete(key);
    pump();
  }
  function update(){
    scheduled=false;
    if(!active())return;
    const scrollable=Math.max(1,section.offsetHeight-window.innerHeight);
    const rect=section.getBoundingClientRect();
    const p=clamp(-rect.top/scrollable,0,1);
    const next=reduced.matches?0:Math.round(p*(FRAME_COUNT-1));
    if(progressBar)progressBar.style.transform='scaleX('+p.toFixed(5)+')';
    if(readout)readout.textContent=String(next+1).padStart(3,'0')+' / '+String(FRAME_COUNT);
    if(next!==target){lastMotion=next>=target?1:-1;lastTarget=target;target=next;}
    preload();render();
  }
  function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(update)}}
  function resize(){if(folderFor()!==folder)configure();lastSize='';schedule();}
  configure();
  if(reduced.matches){section.classList.add('scroll-hero-static');}
  else{
    window.addEventListener('scroll',schedule,{passive:true});
    window.addEventListener('resize',resize,{passive:true});
    mobile.addEventListener?.('change',resize);
  }
  window.addEventListener('hashchange',schedule);
  document.addEventListener('kinetic:routechange',schedule);
  schedule();
})();
