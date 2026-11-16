
const BANK={
"Data Analyst":[["Walk me through a data analysis project you’re proud of.",["data","analysis","insight","dashboard","sql","excel","python","result"]],["How do you clean messy data before analysing it?",["missing","duplicate","clean","null","outlier","pandas","power query"]],["Explain the difference between INNER JOIN and LEFT JOIN with an example.",["join","table","rows","match","null","left","inner"]],["How would you explain a dashboard’s findings to a non-technical manager?",["story","simple","visual","chart","decision","audience","kpi"]],["Which charts would you use to show sales trends, and why?",["line","bar","trend","time","compare","power bi","tableau"]],["How would you handle outliers in a dataset?",["outlier","iqr","median","remove","investigate","z-score","distribution"]]],
"Software Developer":[["Tell me about a project where you built something end to end.",["project","python","flask","api","database","deploy","team"]],["What is the difference between a list and a tuple in Python?",["mutable","immutable","list","tuple","memory","hashable"]],["How would you debug a feature that works locally but fails in production?",["logs","environment","reproduce","config","test","version"]],["Explain REST APIs in simple terms.",["http","get","post","endpoint","json","stateless"]],["What is Git and how do you handle merge conflicts?",["branch","merge","commit","conflict","pull","resolve"]],["How do you make sure your code is readable and maintainable?",["naming","comments","test","review","modular","refactor"]]],
"Business Development":[["Why do you want to work in business development?",["client","growth","sales","communication","target","learn"]],["How would you approach a cold prospect for the first time?",["research","value","email","call","need","follow"]],["Describe a time you convinced someone to see your point of view.",["situation","listen","data","result","persuade","outcome"]],["How do you handle rejection from a client?",["learn","feedback","persist","next","improve","calm"]],["How would you plan to hit a monthly sales target?",["pipeline","lead","convert","track","target","priority"]]],
"HR / Operations":[["How do you prioritise when everything seems urgent?",["priority","deadline","impact","plan","communicate","schedule"]],["Tell me about a time you resolved a conflict in a team.",["conflict","listen","situation","solution","team","result"]],["What do you know about our company culture and how would you fit?",["values","culture","team","learn","contribute"]],["How do you handle confidential information?",["confidential","trust","policy","access","ethics"]],["How would you improve a slow internal process?",["process","bottleneck","measure","automate","feedback","improve"]]]};
const GEN=[["Tell me about yourself.",["student","skills","project","learn","goal","interest"]],["What is your biggest strength and a weakness you are working on?",["strength","weakness","improve","example","learning"]],["Describe a challenge you faced in a team project and how you solved it.",["situation","task","action","result","team","challenge"]],["Where do you see yourself in five years?",["grow","skills","goal","role","contribute","learn"]]];
const STOP=new Set("with that this from have will your their about which should would could experience skills required strong ability knowledge work working team years year good must also other such more than into them they what when where who able including etc and the for are you our job role candidate responsibilities company".split(" "));
const FILL=["um","uh","like","basically","actually","you know","kind of","sort of"];
const STAR={s:["situation","when","while","during","project","once"],t:["task","goal","responsible","needed","aim"],a:["i built","i created","i used","i decided","i led","i analysed","i analyzed","i implemented","i developed","i designed","i wrote","i worked"],r:["result","outcome","improved","increased","reduced","achieved","saved","learned","learnt","finally"]};
const $=id=>document.getElementById(id);
let S={};
const roleSel=$("role");Object.keys(BANK).forEach(r=>roleSel.add(new Option(r,r)));

function jdKeywords(t){const f={};(t.toLowerCase().match(/[a-z][a-z+#.]{3,}/g)||[]).forEach(w=>{if(!STOP.has(w))f[w]=(f[w]||0)+1});return Object.entries(f).sort((a,b)=>b[1]-a[1]).slice(0,6).map(e=>e[0])}
function shuffle(a){return a.map(v=>[Math.random(),v]).sort((x,y)=>x[0]-y[0]).map(e=>e[1])}

$("start").onclick=async()=>{
 const n=+$("cnt").value,role=roleSel.value,jd=$("jd").value,kw=jdKeywords(jd);
 let qs=[];
 if(+$("lvl").value===2){qs.push(["Describe a situation where you had to learn a new tool quickly. What was the outcome?",["learn","tool","quick","result","practice","outcome"]])}
 kw.slice(0,2).forEach(k=>qs.push(["The role mentions “"+k+"”. Tell me about your experience with it.",[k,"project","used","result","example"]]));
 qs=qs.concat(resumeQs($('rs').value).slice(0,3),shuffle(BANK[role]),shuffle(GEN));
 qs=qs.slice(0,n);
 S={name:$("name").value.trim()||"Candidate",role,qs,i:0,res:[],kw,t0:0,cam:[],faceOK:false};if($('usecam').checked){const ok=await camOn();if(!ok)alert('Camera was not allowed or the backend server is not running, so the interview will continue without video analysis.');S.faceOK=!!ok}
 $("setup").classList.add("hide");$("iv").classList.remove("hide");$("res").classList.add("hide");
 show();
};
let tick;
function show(){
 const q=S.qs[S.i];$("qt").textContent=q[0];$("ans").value="";$("wc").textContent="0 words";
 $("prog").textContent="Question "+(S.i+1)+" of "+S.qs.length;$("pb").style.width=(S.i/S.qs.length*100)+"%";
 $("fb").classList.add("hide");$("sub").disabled=false;$("skip").disabled=false;$("ans").disabled=false;
 S.t0=Date.now();if(CAM){S.cam[S.i]={fr:[]};prev=null}clearInterval(tick);tick=setInterval(()=>{const s=Math.floor((Date.now()-S.t0)/1000);$("timer").textContent=String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0")},500);
}
$("ans").oninput=()=>{const w=($("ans").value.trim().match(/\S+/g)||[]).length;$("wc").textContent=w+" words"};

function evaluate(text,q){
 const low=text.toLowerCase(),words=(low.match(/[a-z0-9’']+/g)||[]),wc=words.length;
 const has=l=>l.filter(p=>low.includes(p)).length;
 const len=wc>=60&&wc<=160?30:wc<20?4:wc<60?4+Math.round((wc-20)/40*26):Math.max(18,30-Math.round((wc-160)/20));
 const sc={s:has(STAR.s),t:has(STAR.t),a:has(STAR.a),r:has(STAR.r)};
 const struct=Math.min(25,Object.values(sc).filter(v=>v>0).length*6+Math.min(1,sc.r)*1);
 const nums=(text.match(/\d+%?/g)||[]).length;
 const spec=Math.min(20,nums*6+Math.min(2,(text.match(/\b[A-Z][a-zA-Z+#]{2,}\b/g)||[]).length)*3);
 const kws=q[1].concat(S.kw);const hit=kws.filter(k=>low.includes(k));
 const rel=Math.min(25,Math.round(hit.length/Math.max(3,Math.min(5,kws.length))*25));
 let fl=0;FILL.forEach(f=>{fl+=(low.match(new RegExp("\\b"+f+"\\b","g"))||[]).length});
 const pen=Math.min(10,fl*2);
 const total=Math.max(0,Math.min(100,len+struct+spec+rel-pen));
 const tips=[];
 if(wc<60)tips.push("Your answer is short. Add more detail about what you did and why.");
 if(wc>160)tips.push("Try to be more concise. Keep the answer under about 2 minutes.");
 if(!sc.r)tips.push("Mention the result or outcome of your work.");
 if(!sc.a)tips.push("Use “I” statements to show what you personally did.");
 if(!nums)tips.push("Add a number (%, count, time saved) to make your impact concrete.");
 if(fl>1)tips.push("Reduce filler words like “um”, “like”, “basically”.");
 if(rel<12)tips.push("Use more role-specific keywords, for example: "+q[1].slice(0,3).join(", ")+".");
 if(!tips.length)tips.push("Great answer! Practise delivering it out loud with confidence.");
 let fu;const tool=(text.match(/\b(Excel|SQL|Python|Power BI|Tableau|Flask|Pandas|Git|Java|React)\b/i)||[])[0];
 if(!nums)fu="Follow-up: Can you quantify the result of your work with a number or percentage?";
 else if(!sc.r)fu="Follow-up: What was the final outcome, and what did you learn from it?";
 else if(tool)fu="Follow-up: Why did you choose "+tool+" for this, and what alternatives did you consider?";
 else fu="Follow-up: If you could redo this, what would you do differently?";
 return{total,len,struct,spec,rel,pen,tips,fu,hit,wc};
}
function meter(l,v,max){return'<div class="m"><span>'+l+'</span><div class="bar"><i style="width:'+(v/max*100)+'%"></i></div><b>'+v+'</b></div>'}
async function submit(skipped){
 const text=$("ans").value.trim();
 if(!skipped&&text.split(/\s+/).length<5){alert("Please write a slightly longer answer (at least a few words).");return}
 clearInterval(tick);
 const q=S.qs[S.i];
 const r=skipped?{total:0,len:0,struct:0,spec:0,rel:0,pen:0,tips:["Skipped. Try attempting every question, even a short answer helps."],fu:"",hit:[],wc:0}:evaluate(text,q);
 r.q=q[0];if(S.cam[S.i]){S.cam[S.i].done=true;r.body=await bodyEval(S.cam[S.i])}S.res.push(r);
 $("sub").disabled=true;$("skip").disabled=true;$("ans").disabled=true;
 const fb=$("fb");fb.classList.remove("hide");
 const last=S.i===S.qs.length-1;
 fb.innerHTML='<div class="row" style="margin:0"><div class="score">'+r.total+'<small style="font-size:16px;color:var(--mut)">/100</small></div><div><b>'+(r.total>=75?"Strong answer":r.total>=50?"Decent, can improve":"Needs work")+'</b></div></div>'+
 meter("Length",r.len,30)+meter("Structure (STAR)",r.struct,25)+meter("Specifics",r.spec,20)+meter("Relevance",r.rel,25)+
 '<div class="chips" id="ch"></div><b>How to improve</b><ul id="tp"></ul>'+(r.fu?'<div class="fu" id="fu"></div>':"")+
 '<div class="row"><button id="nx">'+(last?"See results":"Next question")+'</button></div>';
 const ch=$("ch");r.hit.slice(0,8).forEach(k=>{const c=document.createElement("span");c.className="chip g";c.textContent="✓ "+k;ch.appendChild(c)});
 q[1].filter(k=>!r.hit.includes(k)).slice(0,3).forEach(k=>{const c=document.createElement("span");c.className="chip b";c.textContent="+ try: "+k;ch.appendChild(c)});
 r.tips.forEach(t=>{const li=document.createElement("li");li.textContent=t;$("tp").appendChild(li)});
 if(r.fu)$("fu").textContent=r.fu;
 if(r.body){const bd=document.createElement('div');bd.innerHTML=bodyHTML(r.body);fb.insertBefore(bd,$('nx').parentNode)}$("nx").onclick=()=>{if(last)finish();else{S.i++;show()}};
 fb.scrollIntoView({behavior:"smooth",block:"nearest"});
}
$("sub").onclick=()=>submit(false);$("skip").onclick=()=>submit(true);

let CAM=null,rec=null,chunks=[],fd=null,sampT=null,prev=null,cv=null,cx=null;const SKL=['Python','SQL','Excel','Power BI','Tableau','Pandas','NumPy','Flask','Java','JavaScript','HTML','CSS','React','Power Query','Git','MySQL','Machine Learning','Statistics','Data Visualization'];function resumeQs(t){const q=[];if(t.trim().length<40)return q;const low=t.toLowerCase(),flat=' '+low.replace(/[^a-z+#]+/g,' ')+' ';const sk=SKL.filter(k=>flat.includes(' '+k.toLowerCase()+' ')).slice(0,6);const i=low.indexOf('project');const sec=i>=0?t.slice(i+7,i+700):'';const pr=sec.split('\n').map(x=>x.replace(/^[^A-Za-z]+/,'').trim()).filter(x=>x.length>8&&x.length<90).slice(0,2);pr.forEach(p=>q.push([`Your resume mentions “${p}”. What problem did it solve, what was your role, and what was the result?`,['project','problem','role','result','used','built','team']]));sk.slice(0,3).forEach(k=>q.push([`You’ve listed ${k} on your resume. Describe a real situation where you used it and what you achieved.`,[k.toLowerCase(),'used','project','result','example']]));return q}
$('rf').onchange=async e=>{const f=e.target.files[0];if(!f)return;const st=$('rst');st.textContent='Reading…';try{let tx='';if(/\.pdf$/i.test(f.name)){const L=window.pdfjsLib;L.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';const d=await L.getDocument({data:await f.arrayBuffer()}).promise;for(let i=1;i<=d.numPages;i++){const p=await d.getPage(i);tx+=(await p.getTextContent()).items.map(x=>x.str+(x.hasEOL?'\n':' ')).join('')+'\n'}}else tx=await f.text();$('rs').value=tx;st.textContent='Resume loaded ('+tx.length+' characters). You can edit it below.'}catch(err){st.textContent='Could not read this file. Please paste your resume text below.'}};
function camOff(){clearInterval(sampT);$('cam').classList.add('hide');if(rec&&rec.state!=='inactive'){rec.onstop=()=>{const p=document.createElement('video');p.src=URL.createObjectURL(new Blob(chunks,{type:'video/webm'}));p.controls=true;p.style.transform='none';p.style.marginTop='12px';$('sum').appendChild(p)};rec.stop()}if(CAM)CAM.getTracks().forEach(t=>t.stop());CAM=null}
function bodyHTML(b){return '<b>Body language</b>'+meter('Posture and presence',b.sc,100)+meter('Calmness',b.calm,100)+'<ul>'+b.tips.map(t=>'<li>'+t+'</li>').join('')+'</ul>'}
function loadH(){try{return JSON.parse(localStorage.getItem("interviewmate_hist")||"[]")}catch(e){return[]}}
function saveH(h){try{localStorage.setItem("interviewmate_hist",JSON.stringify(h.slice(-12)))}catch(e){}}
function finish(){
 $("iv").classList.add("hide");$("res").classList.remove("hide");
 const avg=Math.round(S.res.reduce((a,r)=>a+r.total,0)/S.res.length);
 const best=S.res.reduce((a,b)=>b.total>a.total?b:a),worst=S.res.reduce((a,b)=>b.total<a.total?b:a);
 const h=loadH();h.push({r:S.role,a:avg});saveH(h);
 const sum=$("sum");
 sum.innerHTML='<div class="meta"><span></span><span></span></div><div class="score" id="av"></div><p id="vd"></p><b>Question-wise scores</b><div id="qs"></div><p id="bw" style="color:var(--mut);font-size:14px"></p>';
 $("av").textContent=avg+"/100";
 $("vd").textContent=S.name+", "+(avg>=75?"you’re interview-ready for "+S.role+"! Keep polishing.":avg>=50?"good effort for "+S.role+". Focus on adding results and numbers.":"keep practising. Use the STAR method: Situation, Task, Action, Result.");
 S.res.forEach((r,i)=>{const d=document.createElement("div");d.className="m";d.style.gridTemplateColumns="1fr 36px";d.innerHTML="<span></span><b>"+r.total+"</b>";d.firstChild.textContent=(i+1)+". "+r.q;$("qs").appendChild(d)});
 $("bw").textContent="Best: Q"+(S.res.indexOf(best)+1)+" · Needs most work: Q"+(S.res.indexOf(worst)+1);
 const bs=S.res.filter(r=>r.body);if(CAM){camOff();if(bs.length){const a=k=>Math.round(bs.reduce((x,r)=>x+r.body[k],0)/bs.length);const tp=[...new Set(bs.flatMap(r=>r.body.tips))];const d=document.createElement('div');d.innerHTML=`<hr style='border:0;border-top:1px solid var(--bd)'><b>Body language report (overall)</b>`+meter('Posture and presence',a('sc'),100)+meter('Calmness',a('calm'),100)+'<ul>'+tp.map(t=>'<li>'+t+'</li>').join('')+'</ul>'+(S.faceOK?'':`<p style='color:var(--mut);font-size:13px'>Note: this browser can’t track your face, so only movement and lighting were checked. Use Chrome for full results.</p>`)+`<p style='color:var(--mut);font-size:13px'>These are estimates from simple on-device video analysis, not a professional assessment. Watch your recording below.</p>`;sum.appendChild(d)}}const hs=$("hist");hs.innerHTML="";h.forEach((x,i)=>{const b=document.createElement("div");b.style.height=Math.max(12,x.a)+"%";b.textContent=x.a;b.title=x.r;hs.appendChild(b)});
}
$("again").onclick=()=>{$("res").classList.add("hide");$("setup").classList.remove("hide")};
$("clr").onclick=()=>{try{localStorage.removeItem("interviewmate_hist")}catch(e){}$("hist").innerHTML=""};

let busy=false;const API=window.API_BASE||'';const SID=Math.random().toString(36).slice(2);
async function camOn(){try{CAM=await navigator.mediaDevices.getUserMedia({video:{width:640,height:480,facingMode:'user'},audio:false});const h=await fetch(API+'/api/health');if(!h.ok)throw new Error('backend');const v=$('cam');v.srcObject=CAM;v.classList.remove('hide');await v.play();try{rec=new MediaRecorder(CAM);chunks=[];rec.ondataavailable=e=>chunks.push(e.data);rec.start()}catch(e){rec=null}cv=$('cv');cx=cv.getContext('2d');cv.width=320;cv.height=240;sampT=setInterval(sample,700);return true}catch(e){if(CAM)CAM.getTracks().forEach(t=>t.stop());CAM=null;return false}}
// Every 0.7s: send one frame to the FastAPI backend (MediaPipe + OpenCV analysis)
async function sample(){const v=$('cam');if(!CAM||v.readyState<2||busy)return;const B=S.cam[S.i];if(!B||B.done)return;busy=true;try{cx.drawImage(v,0,0,320,240);const r=await fetch(API+'/api/analyze-frame',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session:SID+'-'+S.i,image:cv.toDataURL('image/jpeg',0.7)})});if(r.ok)B.fr.push(await r.json())}catch(e){}busy=false}
// After each answer: ask the backend for the score and tips
async function bodyEval(B){if(!B||B.fr.length<3)return null;try{const r=await fetch(API+'/api/summarize',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({frames:B.fr})});return r.ok?await r.json():null}catch(e){return null}}
