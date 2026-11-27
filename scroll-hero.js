/* KINETIC opening: play existing atlas frames automatically once, pause,
   then reveal words cumulatively while visitors scroll through the same hero. */
(()=>{
  'use strict';
  const section=document.querySelector('[data-scroll-hero]');
  if(!section)return;
  const canvas=section.querySelector('[data-scroll-canvas]');
  const poster=section.querySelector('[data-scroll-poster]');
  const progress=section.querySelector('[data-scroll-progress]');
  const readout=section.querySelector('[data-scroll-readout]');
  const context=canvas?.getContext('2d',{alpha:false});
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile=window.matchMedia('(max-width: 700px)');
  const lowData=navigator.connection?.saveData===true;
  const FRAME_COUNT=120,FRAMES_PER_SHEET=15,COLUMNS=5,SHEETS=8,FPS=24;
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const folderFor=()=>mobile.matches?'mobile':'desktop';
  const dimensionsFor=()=>mobile.matches?[480,854]:[854,480];
  const homeActive=()=>!section.closest('.route')?.hidden;
  let folder=folderFor(),epoch=0,queue=[],cache=new Map(),pending=new Set(),inflight=0;
  let shown=-1,frame=0,startedAt=0,raf=0,done=false,phase=-1,scrollRaf=0,awaiting=0;
  let lastCanvasSize='';
  const sheetUrl=(n)=>'assets/scroll/'+folder+'/atlas/sheet-'+String(n+1).padStart(2,'0')+'.webp';

  function markComplete(staticFallback=false){
    if(done)return;
    done=true;
    if(raf){cancelAnimationFrame(raf);raf=0}
    if(staticFallback)section.classList.add('is-static');
    section.classList.add('film-finished');
    updateWords();
  }
  function drawSheet(image,index){
    if(!context||!image?.naturalWidth)return;
    const rect=canvas.getBoundingClientRect();
    if(rect.width<1||rect.height<1)return;
    const ratio=Math.min(devicePixelRatio||1,1.75);
    const w=Math.max(1,Math.round(rect.width*ratio)),h=Math.max(1,Math.round(rect.height*ratio));
    const size=w+'x'+h;
    if(size!==lastCanvasSize){canvas.width=w;canvas.height=h;lastCanvasSize=size;shown=-1}
    const [sw,sh]=dimensionsFor();
    const cell=index%FRAMES_PER_SHEET,col=cell%COLUMNS,row=Math.floor(cell/COLUMNS);
    const scale=Math.max(w/sw,h/sh),vw=w/scale,vh=h/scale;
    context.drawImage(image,col*sw+(sw-vw)/2,row*sh+(sh-vh)/2,vw,vh,0,0,w,h);
    shown=index;
    canvas.classList.add('is-ready');
    poster.classList.add('is-loaded');
  }
  function request(n){
    if(n<0||n>=SHEETS||cache.has(n)||pending.has(n))return;
    pending.add(n);queue.push(n);
    pump();
  }
  function pump(){
    const generation=epoch;
    while(inflight<(lowData?1:2)&&queue.length){
      const n=queue.shift();pending.delete(n);
      if(cache.has(n))continue;
      const image=new Image();image.decoding='async';
      cache.set(n,image);inflight++;
      image.onload=()=>{
        if(generation!==epoch)return;
        inflight--;
        if(n===0&&!startedAt&&!done)begin();
        if(done&&n===SHEETS-1)drawSheet(image,FRAME_COUNT-1);
        pump();
      };
      image.onerror=()=>{
        if(generation!==epoch)return;
        inflight--;cache.delete(n);
        if(n===0)markComplete(true);
        pump();
      };
      image.src=sheetUrl(n);
    }
  }
  function begin(){
    if(done||raf||!homeActive())return;
    startedAt=performance.now();
    raf=requestAnimationFrame(tick);
  }
  function tick(now){
    raf=0;
    if(done||!homeActive())return;
    if(document.hidden){raf=requestAnimationFrame(tick);return}
    if(!startedAt)startedAt=now;
    const wanted=Math.min(FRAME_COUNT-1,Math.floor((now-startedAt)*FPS/1000));
    const targetSheet=Math.floor(wanted/FRAMES_PER_SHEET);
    request(targetSheet);
    request(targetSheet+1);
    request(targetSheet+2);
    const image=cache.get(targetSheet);
    if(image?.complete&&image.naturalWidth){
      if(shown!==wanted)drawSheet(image,wanted);
      frame=wanted;
      // Release long-past atlases to limit decoded image memory on phones.
      for(const key of cache.keys())if(key<targetSheet-2)cache.delete(key);
      if(wanted===FRAME_COUNT-1){markComplete();return}
    }else{
      // Hold the current frame until the next atlas arrives; don't skip ahead.
      startedAt=now-(frame*1000/FPS);
    }
    raf=requestAnimationFrame(tick);
  }
  function updateWords(){
    if(!homeActive())return;
    const length=Math.max(1,section.offsetHeight-innerHeight);
    const p=clamp(-section.getBoundingClientRect().top/length);
    const next=done?(section.classList.contains('is-static')?4:p>=.52?4:p>=.33?3:p>=.14?2:1):0;
    if(next!==phase){section.dataset.phase=String(next);phase=next}
    if(readout)readout.textContent=!done?'OPENING FILM':(p>=.52?'READY TO MOVE':'SCROLL TO REVEAL');
    if(progress)progress.style.transform='scaleX('+p.toFixed(5)+')';
  }
  function scheduleWords(){
    if(scrollRaf)return;
    scrollRaf=requestAnimationFrame(()=>{scrollRaf=0;updateWords()});
  }
  function setup(){
    if(raf)cancelAnimationFrame(raf);
    epoch++;queue=[];pending.clear();cache.clear();inflight=0;
    folder=folderFor();shown=-1;frame=0;startedAt=0;lastCanvasSize='';phase=-1;done=false;
    poster.src='assets/scroll/'+folder+'/atlas/poster.webp';
    poster.classList.remove('is-loaded');
    canvas.classList.remove('is-ready');
    if(motion.matches||lowData||!context){
      markComplete(true);
      return;
    }
    request(0);request(1);
  }
  document.getElementById('home-scroll')?.addEventListener('click',()=>{
    // Don't navigate away; reveal the words here on the existing screen.
    if(!done){markComplete();request(SHEETS-1)}
  });
  window.addEventListener('scroll',scheduleWords,{passive:true});
  window.addEventListener('resize',()=>{
    if(folderFor()!==folder)setup();
    else lastCanvasSize='';
    scheduleWords();
  },{passive:true});
  mobile.addEventListener?.('change',()=>{if(folderFor()!==folder)setup()});
  motion.addEventListener?.('change',setup);
  window.addEventListener('hashchange',()=>{
    if(homeActive()&&!done&&!raf&&startedAt)raf=requestAnimationFrame(tick);
    else if(homeActive()&&!done&&!startedAt&&cache.get(0)?.naturalWidth)begin();
    scheduleWords();
  });
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden&&!done&&homeActive()){
      startedAt=performance.now()-(frame*1000/FPS);
      if(!raf)raf=requestAnimationFrame(tick);
    }
  });
  // Missing media should never leave a blank, inaccessible homepage.
  setTimeout(()=>{if(!done)markComplete(true)},11500);
  setup();
  scheduleWords();
})();
