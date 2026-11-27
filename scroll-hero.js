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
  let shown=-1,frame=0,startedAt=0,lastAdvancedAt=0,raf=0,done=false,scrollRaf=0;
  let revealRaf=0,revealTime=0,revealStarted=0,scrollTarget=0,scrollPosition=0;
  const words=[...section.querySelectorAll('[data-hero-step]')];
  const header=document.getElementById('header');
  const nav=header?.querySelector('.nav');
  const access=header?.querySelector('.header-access');
  const menu=header?.querySelector('.menu-button');
  const pageElements=[nav,access,menu].filter(Boolean);
  const introMark=section.querySelector('.kinetic-brand-intro');
  const originalMark=header?.querySelector('.brand');
  if(introMark&&originalMark)introMark.append(originalMark.cloneNode(true));
  let introMarkMoved=false;
  let introLocked=false;
  const blockedKeys=new Set(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' ','Spacebar']);
  function preventIntroMovement(event){
    if(!introLocked||!homeActive())return;
    if(event.type==='keydown'&&!blockedKeys.has(event.key))return;
    if(event.cancelable)event.preventDefault();
  }
  window.addEventListener('wheel',preventIntroMovement,{passive:false,capture:true});
  window.addEventListener('touchmove',preventIntroMovement,{passive:false,capture:true});
  window.addEventListener('keydown',preventIntroMovement,{capture:true});
  function moveBrandHome(){
    if(introMarkMoved||!introMark||!originalMark)return;
    introMarkMoved=true;
    const target=originalMark.getBoundingClientRect();
    const current=introMark.getBoundingClientRect();
    const dx=(target.left+target.width/2)-(current.left+current.width/2);
    const dy=(target.top+target.height/2)-(current.top+current.height/2);
    const scale=Math.min(1,target.width/Math.max(1,current.width));
    introMark.style.transform='translate(-50%,-50%) translate('+dx.toFixed(1)+'px,'+dy.toFixed(1)+'px) scale('+scale.toFixed(3)+')';
    introMark.style.opacity='0';
    introMark.style.pointerEvents='none';
    window.setTimeout(()=>{introMark.hidden=true},950);
  }
  function setIntroVisibility(loading){
    const hidden=loading&&homeActive();
    introLocked=hidden;
    document.documentElement.classList.toggle('kinetic-intro-active',hidden);
    if(hidden&&window.scrollY!==0)window.scrollTo({top:0,behavior:'instant'});
    pageElements.forEach(el=>{el.inert=hidden});
    section.setAttribute('aria-busy',hidden?'true':'false');
  }

  let lastCanvasSize='';
  const sheetUrl=(n)=>'assets/scroll/'+folder+'/atlas/sheet-'+String(n+1).padStart(2,'0')+'.webp';

  function markComplete(staticFallback=false){
    if(done)return;
    done=true;
    if(raf){cancelAnimationFrame(raf);raf=0}
    if(staticFallback){
      const last=cache.get(SHEETS-1);
      if(last?.complete&&last.naturalWidth)drawSheet(last,FRAME_COUNT-1);
      section.classList.add('is-static');
    }
    section.classList.add('film-finished');
    moveBrandHome();
    setIntroVisibility(false);
    // Let the centered logo arrive at the header before the welcome copy begins.
    revealStarted=performance.now()+720;
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
        if((n===0||n===1)&&!startedAt&&!done&&cache.get(0)?.naturalWidth&&cache.get(1)?.naturalWidth)begin();
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
    lastAdvancedAt=0;
    raf=requestAnimationFrame(tick);
  }
  function tick(now){
    raf=0;
    if(done||!homeActive()||document.hidden)return;
    // On Android, clock-based jumps skipped the plane and rider transitions.
    // Advance every real frame in order; buffer atlases ahead of playback.
    const wanted=shown<0?0:Math.min(FRAME_COUNT-1,frame+1);
    const targetSheet=Math.floor(wanted/FRAMES_PER_SHEET);
    request(targetSheet);request(targetSheet+1);request(targetSheet+2);
    const image=cache.get(targetSheet);
    if(image?.complete&&image.naturalWidth){
      if(!lastAdvancedAt||now-lastAdvancedAt>=1000/FPS){
        drawSheet(image,wanted);
        frame=wanted;
        lastAdvancedAt=now;
        if(progress)progress.style.transform='scaleX('+(wanted/(FRAME_COUNT-1)).toFixed(5)+')';
        // Keep the final atlas cached so the landing image is consistent.
        for(const key of cache.keys())if(key<targetSheet-2)cache.delete(key);
        if(wanted===FRAME_COUNT-1){markComplete();return}
      }
    }
    // If a sheet isn't ready, hold the current frame instead of skipping.
    raf=requestAnimationFrame(tick);
  }
  const easing=t=>{const x=clamp(t);return x*x*(3-2*x)};
  function revealStrength(index,p){
    // The first headline and eyebrow arrive automatically after the movie.
    // Every later line follows continuous scroll motion in either direction.
    if(index<3)return 1;
    if(index===3)return easing((p-.04)/.21);
    // Let the booking invitation settle into a short readable hold before exit.
    return easing((p-.23)/.23);
  }
  function paintWords(now){
    if(!done||!homeActive())return;
    if(section.classList.contains('is-static')){
      words.forEach(el=>{el.style.opacity='1';el.style.transform='none';el.style.filter='none'});
      return;
    }
    const exit=1-easing((scrollPosition-.91)/.09);
    const initialMoves=[
      [0,-34],[-76,5],[78,5],[0,-37],[0,39]
    ];
    const mobileWidth=mobile.matches;
    words.forEach((el,index)=>{
      const delays=[130,440,920,0,0];
      const delay=delays[index]||0;
      const intro=easing((now-revealStarted-delay)/(index<3?950:850));
      const amount=clamp(intro*revealStrength(index,scrollPosition)*exit);
      const remainder=Math.pow(1-amount,1.15);
      const [startX,startY]=initialMoves[index]||[0,30];
      const dx=startX*(mobileWidth?.6:1)*remainder;
      const dy=startY*remainder-(1-exit)*28;
      const scale=1-.026*remainder;
      el.style.opacity=amount.toFixed(4);
      el.style.transform='translate3d('+dx.toFixed(2)+'px,'+dy.toFixed(2)+'px,0) scale('+scale.toFixed(4)+')';
      el.style.filter='blur('+(Math.min(mobileWidth?4:6,6*remainder)).toFixed(2)+'px)';
      if(el.tagName==='A'){
        el.style.pointerEvents=amount>.75?'auto':'none';
        el.tabIndex=amount>.75?0:-1;
      }
    });
  }
  function animateWords(now){
    revealRaf=0;
    if(!done||!homeActive())return;
    const dt=revealTime?Math.min(64,now-revealTime):16.7;
    revealTime=now;
    // Frame-rate independent damping: smooth both forward and reverse scrolling.
    const blend=1-Math.exp(-dt/205);
    scrollPosition+=(scrollTarget-scrollPosition)*blend;
    if(Math.abs(scrollTarget-scrollPosition)<.0003)scrollPosition=scrollTarget;
    paintWords(now);
    const introPending=now-revealStarted<2500;
    if(introPending||Math.abs(scrollTarget-scrollPosition)>.0003)
      revealRaf=requestAnimationFrame(animateWords);
  }
  function scheduleAnimation(){
    if(!revealRaf&&done&&!section.classList.contains('is-static')){
      revealTime=0;
      revealRaf=requestAnimationFrame(animateWords);
    }
  }
  function updateWords(){
    if(!homeActive())return;
    const length=Math.max(1,section.offsetHeight-innerHeight);
    const p=clamp(-section.getBoundingClientRect().top/length);
    scrollTarget=p;
    if(readout)readout.textContent=!done?'':p>=.78?'SCROLL UP TO REVISIT':'SCROLL TO BUILD THE STORY';
    if(progress&&done)progress.style.transform='scaleX('+p.toFixed(5)+')';
    if(done){
      if(section.classList.contains('is-static')){
        section.dataset.phase='4';
        paintWords(performance.now());
      }else scheduleAnimation();
    }
  }
  function scheduleWords(){
    if(scrollRaf)return;
    scrollRaf=requestAnimationFrame(()=>{scrollRaf=0;updateWords()});
  }
  function setup(){
    if(raf)cancelAnimationFrame(raf);
    if(revealRaf)cancelAnimationFrame(revealRaf);
    revealRaf=0;revealTime=0;revealStarted=0;scrollTarget=0;scrollPosition=0;
    epoch++;queue=[];pending.clear();cache.clear();inflight=0;
    folder=folderFor();shown=-1;frame=0;startedAt=0;lastAdvancedAt=0;lastCanvasSize='';done=false;
    section.classList.remove('is-static','film-finished');
    if(introMark){introMarkMoved=false;introMark.hidden=false;introMark.style.transform='';introMark.style.opacity=''}
    setIntroVisibility(!motion.matches&&!lowData&&!!context);
    if(progress)progress.style.transform='scaleX(0)';
    words.forEach(el=>{el.style.opacity='0';el.style.transform='none';el.style.filter='none'});
    poster.src='assets/scroll/'+folder+'/atlas/poster.webp';
    poster.classList.remove('is-loaded');
    canvas.classList.remove('is-ready');
    if(motion.matches||lowData||!context){
      markComplete(true);
      return;
    }
    request(0);request(1);request(SHEETS-1);
  }
  window.addEventListener('scroll',scheduleWords,{passive:true});
  window.addEventListener('resize',()=>{
    if(folderFor()!==folder)setup();
    else lastCanvasSize='';
    scheduleWords();
  },{passive:true});
  mobile.addEventListener?.('change',()=>{if(folderFor()!==folder)setup()});
  motion.addEventListener?.('change',setup);
  window.addEventListener('hashchange',()=>{
    setIntroVisibility(!done&&!motion.matches&&!lowData&&!!context);
    if(homeActive()&&!done&&!raf&&startedAt)raf=requestAnimationFrame(tick);
    else if(homeActive()&&!done&&!startedAt&&cache.get(0)?.naturalWidth)begin();
    scheduleWords();
  });
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden&&!done&&homeActive()){
      lastAdvancedAt=performance.now();
      if(!raf)raf=requestAnimationFrame(tick);
    }
  });
  // Missing media should never leave a blank, inaccessible homepage.
  setTimeout(()=>{if(!done)markComplete(true)},20000);
  setup();
  scheduleWords();
})();
