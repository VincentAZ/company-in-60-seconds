"use client";
import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import Link from "next/link";
import {ArrowLeft,ArrowRight,Pause,Play,RotateCcw,Share2,ExternalLink,Palette,Globe,ChartNoAxesCombined,Presentation,BrainCircuit,Check,Copy,Sparkles} from "lucide-react";
import type {Artifacts,BuildEvent,BuildRecord,Finance,Slide} from "@/lib/schema";
import {emptyArtifacts,reduceEvents} from "@/lib/reducer";
import {calculateFinance,money} from "@/lib/finance";
import {BrandMark} from "./logo";
import {GeneratedSite} from "./site";
type Tab="website"|"brand"|"finance"|"pitch";
const AGENTS=[
 {name:"Brief",label:"Strategy",description:"Understanding the opportunity",icon:BrainCircuit},
 {name:"Brand",label:"Brand identity",description:"Naming, palette & symbol",icon:Palette},
 {name:"Finance",label:"Financial model",description:"Pricing & unit economics",icon:ChartNoAxesCombined},
 {name:"Website",label:"Landing page",description:"Designing a living website",icon:Globe},
 {name:"Pitch",label:"Investor deck",description:"Creating the story",icon:Presentation}
] as const;
const tabs:[Tab,typeof Globe][]=[["website",Globe],["brand",Palette],["finance",ChartNoAxesCombined],["pitch",Presentation]];
const fmt=(n:number)=>(n/1000).toFixed(1)+"s";
const fmtClock=(ms:number)=>{const s=Math.floor(ms/1000);return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0")+"."+String(Math.floor(ms%1000/100));};
function BrandPanel({a}:{a:Artifacts}){
 const core=a.brand.core,logo=a.brand.logo;
 if(!core)return <PreviewEmpty title="Finding the brand's character" description="The brand agent is researching the idea and generating its name, voice and visual identity."/>;
 return <div className="preview-brand">
 <div className="brand-hero" style={{background:core.palette.bg,color:core.palette.ink}}>
  <BrandMark core={core} logo={logo} size={95}/>
  <h2>{core.name}</h2><p>{core.tagline}</p>
  <span style={{opacity:.55,fontSize:11,textTransform:"uppercase",letterSpacing:2}}>{core.industry}</span>
 </div>
 <div className="swatches">{Object.entries(core.palette).map(([key,value])=><div key={key} className="swatch" style={{background:value,color:key==="ink"||key==="bg"?"#fff":"#111"}}><strong>{key} · {value}</strong></div>)}</div>
 <div className="brand-detail"><span>Voice: {core.voice}</span><span>Typography: {core.font}</span><span>{logo?"Custom geometric mark complete":"Designing symbol…"}</span></div>
 </div>;
}
function PreviewEmpty({title,description}:{title:string;description:string}){
 return <div className="preview-empty"><div className="spinner-ring"/><h3>{title}</h3><p>{description}</p></div>;
}
const labels:[keyof Finance,string,string][]=[
 ["monthlyPrice","Price per customer ($)","USD"],
 ["initialCustomers","Initial customers","customers"],
 ["monthlyGrowthPct","Monthly growth (%)","%"],
 ["churnPct","Monthly churn (%)","%"],
 ["variableCostPct","Variable costs (%)","%"],
 ["monthlyFixedCosts","Fixed monthly costs ($)","USD"],
 ["startupCost","Startup costs ($)","USD"]
];
function FinancePanel({finance,onChange}:{finance:Finance|null;onChange:(f:Finance)=>void}){
 if(!finance)return <PreviewEmpty title="Modeling the business" description="Finance is choosing assumptions. Every projection will be calculated in code, not invented by an agent."/>;
 const {months,metrics}=calculateFinance(finance);
 const max=Math.max(1,...months.map(m=>m.revenue));const width=650,height=180;
 const points=months.map((m,i)=>(i/(months.length-1)*width).toFixed(1)+","+(height-m.revenue/max*(height-25)).toFixed(1)).join(" ");
 return <div>
 <div className="finance-grid">
  {[["Year 1 revenue",money(metrics.year1Revenue)],["Year 3 revenue",money(metrics.year3Revenue)],["Year 1 profit",money(metrics.year1Profit)],["Break-even",metrics.breakEvenMonth?"Month "+metrics.breakEvenMonth:"Not within 36 months"]].map(([key,value])=><div className="metric-box" key={key}><span>{key}</span><strong>{value}</strong></div>)}
 </div>
 <div className="chart-box"><div style={{display:"flex",justifyContent:"space-between",marginBottom:20,fontSize:12}}><strong>Revenue projection</strong><span style={{color:"#9cafc6"}}>36 months · modeled</span></div><svg viewBox={"0 0 "+width+" "+height} preserveAspectRatio="none" role="img" aria-label="36-month illustrative revenue projection">
   {[0,.25,.5,.75,1].map(f=><line key={f} x1="0" x2={width} y1={height*(1-f)} y2={height*(1-f)} stroke="#53637b" strokeWidth=".7" strokeDasharray="3 8" opacity=".45"/>)}
   <polyline points={points} fill="none" stroke="#9DECCA" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="chart-draw"/>
 </svg><div style={{display:"flex",justifyContent:"space-between",color:"#8a9bb3",fontSize:10}}><span>MONTH 1</span><span>MONTH 18</span><span>MONTH 36</span></div></div>
 <div className="panel-top" style={{padding:"16px 0",border:0}}><h3>Editable assumptions</h3><small>Everything recalculates</small></div>
 <div className="finance-editor">{labels.map(([key,label])=><label key={key}>{label}<input type="number" value={finance[key] as number} step={key==="monthlyGrowthPct"||key==="churnPct"?"0.5":"1"} onChange={e=>{const n=Number(e.target.value);if(Number.isFinite(n))onChange({...finance,[key]:n});}}/></label>)}</div>
 <p className="assumption-note"><strong>Important:</strong> This is a hypothetical scenario, not an investment forecast. Assumptions were invented for demonstration, not sourced from market research. {finance.rationale}</p>
 </div>;
}
function PitchPanel({a,finance}:{a:Artifacts;finance:Finance|null}){
 const slides=a.pitch.slides,core=a.brand.core;
 const [index,setIndex]=useState(0);
 const active=slides[Math.min(index,slides.length-1)];
 if(!active)return <PreviewEmpty title="The story is taking shape" description="Pitch is synthesizing the brand, problem, solution and assumption-based financial narrative."/>;
 const palette=core?.palette||{bg:"#18253A",ink:"#F1F6FF",primary:"#A1E9C8",accent:"#E4B478"};
 const {metrics}=finance?calculateFinance(finance):{metrics:{} as Record<string,number|null>};
 const metricLabel:Record<string,string>={monthlyPrice:"Customer price",year1Revenue:"Year 1 revenue",year3Revenue:"Year 3 revenue",year1Profit:"Year 1 profit",breakEvenMonth:"Break-even month"};
 return <div className="slide-deck">
 <div className="slide-main" style={{background:palette.bg,color:palette.ink}}>
   <span className="slide-kicker">0{Math.min(index+1,slides.length)} / 0{slides.length} · {active.eyebrow}</span>
   <h2>{active.title}</h2>{active.body&&<p>{active.body}</p>}
   {active.bullets.length>0&&<ul>{active.bullets.map((s,i)=><li key={i}>{s}</li>)}</ul>}
   {active.metricKeys.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:30,marginTop:25}}>{active.metricKeys.map(k=><div key={k}><div style={{fontSize:23,fontWeight:800,color:palette.primary}}>{k==="breakEvenMonth"?(metrics[k]?"Month "+metrics[k]:"N/A"):money(Number(metrics[k]||0))}</div><div style={{fontSize:10,opacity:.7,marginTop:6}}>{metricLabel[k]}</div></div>)}</div>}
   <span style={{position:"absolute",bottom:20,right:30,fontSize:12,opacity:.5}}>{core?.name}</span>
 </div>
 <div className="slide-filmstrip">{slides.map((s,i)=><button key={i} onClick={()=>setIndex(i)} className={"slide-thumb "+(i===Math.min(index,slides.length-1)?"active":"")} style={{background:i%2===0?palette.bg:"#26354D",color:palette.ink}}><span style={{opacity:.5,fontSize:9}}>0{i+1}</span><b>{s.title}</b></button>)}</div>
 <div className="assumption-note">Live deck preview. Financial values are linked to the assumptions, not copied into slides.</div>
 </div>;
}
function displayEvent(e:BuildEvent){
 if(e.type==="artifact.patch"){
  const p=e.payload;const names:Record<string,string>={core:"Brand direction established",logo:"Logo mark drawn",assumptions:"Financial assumptions ready",setup:"Website design system ready",sections:"Website section assembled",slides:"Pitch slide created",data:"Business concept structured"};
  return names[String(p.path)]||"Artifact updated";
 }
 if(e.type==="handoff")return "Brand and Finance handed off to Website and Pitch";
 if(e.type==="agent.started")return e.agent+" agent engaged";
 if(e.type==="agent.completed")return e.agent+" agent complete";
 if(e.type==="agent.failed")return e.agent+" failed: "+String(e.payload.message||"Unknown");
 if(e.type==="build.completed")return "Build "+String(e.payload.status||"completed");
 return String(e.payload.message||e.type);
}
function Stage({events,prompt,elapsed,replay=false,id,problem}:{events:BuildEvent[];prompt:string;elapsed:number;replay?:boolean;id?:string;problem?:string}){
 const artifacts=useMemo(()=>{try{return reduceEvents(events)}catch{return emptyArtifacts();}},[events]);
 const [tab,setTab]=useState<Tab>("website"),[manual,setManual]=useState(false),[finance,setFinance]=useState<Finance|null>(null),[copied,setCopied]=useState(false);
 const last=events[events.length-1];
 const financeSerialized=JSON.stringify(artifacts.finance);
 useEffect(()=>{if(artifacts.finance)setFinance(artifacts.finance);},[financeSerialized]); // intentionally tracks only content changes
 useEffect(()=>{if(manual||!last||last.type!=="artifact.patch")return;const agent=last.agent.toLowerCase();if(["brand","finance","website","pitch"].includes(agent))setTab(agent as Tab);},[last?.seq,manual]);
 const statuses:Record<string,"waiting"|"working"|"done"|"failed">={};
 for(const a of AGENTS)statuses[a.name]="waiting";
 for(const e of events){
  if(e.type==="agent.started")statuses[e.agent]="working";
  if(e.type==="agent.completed")statuses[e.agent]="done";
  if(e.type==="agent.failed")statuses[e.agent]="failed";
 }
 const finished=last?.type==="build.completed";
 const tabsReady={website:artifacts.website.sections.length,brand:artifacts.brand.core?1:0,finance:artifacts.finance?1:0,pitch:artifacts.pitch.slides.length};
 const title=artifacts.brand.core?.name||"Your next big idea";
 const shareUrl=id?(typeof window!=="undefined"?window.location.origin:"")+"/b/"+id:"";
 return <div className="studio-shell">
  <div className="studio-top"><Link href="/" className="brand-link"><span className="brand-symbol"><Sparkles size={17}/></span> Company / 60</Link>
   <div className="studio-top-right"><span className="studio-status">{replay?"REPLAY MODE":finished?"BUILD COMPLETE":"LIVE BUILD"}</span><span className="clock">{fmtClock(elapsed)}</span><Link className="small-btn" href="/">New idea</Link></div>
  </div>
  <div className="studio-title"><div><span className="eyebrow">{replay?"THE REPLAY EXPERIENCE":"THE BUILD IS THE SHOW"}</span><h1>{title}<span style={{color:"#95a2b7"}}> / </span>Building in public.</h1><p>{prompt}</p></div><span className="panel-tag">5 model stages / 4 artifacts</span></div>
  {problem&&<div className="error-msg">{problem} <Link href="/" style={{textDecoration:"underline"}}>Browse the free replays instead.</Link></div>}
  <div className="studio-layout">
   <aside className="studio-left">
    <div className="panel"><div className="panel-top"><h3>Agent orchestration</h3><small>{finished?"Finalized":"In progress"}</small></div><div className="agent-list">{AGENTS.map(a=>{
      const Icon=a.icon;const state=statuses[a.name];
      return <div className="agent-row" key={a.name}><div className="agent-icon"><Icon size={17}/></div><div><h4>{a.label}</h4><p>{state==="working"?"Generating live...":state==="done"?"Artifact ready":state==="failed"?"Generation failed":a.description}</p></div><div className={"agent-led "+(state==="working"?"active":state)}/></div>;
    })}</div></div>
    <div className="panel"><div className="panel-top"><h3>Event stream</h3><small>{events.length} events</small></div><div className="event-feed">{events.slice(-22).reverse().map(e=><div className="event-line" key={e.seq}><span className="time">{fmt(e.t_ms)}</span><span>{displayEvent(e)}</span></div>)}{events.length===0&&<div style={{padding:12,color:"#8090aa",fontSize:12}}>Waiting for the first event...</div>}</div></div>
    <div className="panel" style={{padding:17,fontSize:12,lineHeight:1.7,color:"#9eacc0"}}><strong style={{color:"#a4efc9"}}>The dependencies are real.</strong><p style={{margin:"8px 0 0"}}>Brand and Finance start together. Website and Pitch wait for both to deliver usable inputs. Every event is timestamped for deterministic replay.</p></div>
   </aside>
   <div>
    <div className="main-panel">
     <div className="preview-tabs"><div className="tab-buttons">{tabs.map(([name,Icon])=><button key={name} className={"tab-button "+(tab===name?"selected":"")} onClick={()=>{setTab(name);setManual(true);}}><Icon size={15}/> {name[0].toUpperCase()+name.slice(1)} {tabsReady[name]>0&&<Check size={12} style={{color:"#a2ebc4"}}/>}</button>)}</div><span className="panel-tag">LIVE ARTIFACT</span></div>
     <div className="preview-body" key={tab}>
      {tab==="website"?(artifacts.website.sections.length?<div className="preview-website"><GeneratedSite artifacts={artifacts} financeOverride={finance}/></div>:<PreviewEmpty title="Waiting for the first section" description="Website construction begins the moment brand direction and financial assumptions arrive."/>) :
       tab==="brand"?<BrandPanel a={artifacts}/>:
       tab==="finance"?<FinancePanel finance={finance||artifacts.finance} onChange={setFinance}/>:
       <PitchPanel a={artifacts} finance={finance||artifacts.finance}/>}
     </div>
    </div>
    <div className="studio-share">
     {id&&<><Link href={"/c/"+id}>Open generated website <ExternalLink size={13} style={{display:"inline"}}/></Link>
     <button onClick={async()=>{await navigator.clipboard.writeText(shareUrl);setCopied(true);setTimeout(()=>setCopied(false),1800);}}>{copied?<Check size={13}/>:<Copy size={13}/>} {copied?"Link copied":"Copy replay link"}</button></>}
     <span style={{fontSize:11,color:"#8d9bb0",marginLeft:"auto"}}>{replay?"Recorded events, not a rendered video":"Real AI events. No fabricated progress."}</span>
    </div>
   </div>
  </div>
 </div>;
}
export function LiveStudio({prompt}:{prompt:string}){
 const [events,setEvents]=useState<BuildEvent[]>([]),[error,setError]=useState(""),[elapsed,setElapsed]=useState(0),[done,setDone]=useState(false),[id,setId]=useState("");
 const started=useRef(false);
 useEffect(()=>{
  if(started.current)return;started.current=true;let cancelled=false;const start=Date.now();
  const timer=setInterval(()=>{if(!cancelled)setElapsed(Date.now()-start);},100);
  (async()=>{
   try{
    const response=await fetch("/api/build",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt})});
    if(!response.ok){const body=await response.json();throw new Error(body.error||"Could not start build");}
    if(!response.body)throw new Error("No stream returned");
    const reader=response.body.getReader(),decoder=new TextDecoder();let buffer="";
    while(true){
     const {value,done:ended}=await reader.read();if(ended)break;
     buffer+=decoder.decode(value,{stream:true});
     let pos;
     while((pos=buffer.indexOf("\n\n"))>=0){
      const block=buffer.slice(0,pos);buffer=buffer.slice(pos+2);
      const raw=block.split("\n").find(x=>x.startsWith("data: "));
      if(!raw)continue;
      try{
       const e=JSON.parse(raw.slice(6)) as BuildEvent;
       if(typeof e.seq!=="number")continue;
       setEvents(old=>old.some(a=>a.seq===e.seq)?old:[...old,e]);
       if(e.type==="build.started")setId(e.build_id);
       if(e.type==="build.completed"){setDone(true);setElapsed(e.t_ms);}
      }catch{}
     }
    }
   }catch(e){if(!cancelled)setError(e instanceof Error?e.message:"Unable to build");}
   finally{clearInterval(timer);if(!cancelled)setDone(true);}
  })();
  return()=>{cancelled=true;clearInterval(timer);};
 },[prompt]);
 return <Stage events={events} prompt={prompt} elapsed={elapsed} id={done?id:undefined} problem={error}/>;
}
export function ReplayStudio({record,events}:{record:BuildRecord;events:BuildEvent[]}){
 const duration=Math.max(record.duration_ms,events.at(-1)?.t_ms||1);
 const [pos,setPos]=useState(0),[playing,setPlaying]=useState(true),[speed,setSpeed]=useState(1);
 const last=useRef(Date.now());
 useEffect(()=>{last.current=Date.now();const timer=setInterval(()=>{
  const now=Date.now();const delta=now-last.current;last.current=now;
  if(playing)setPos(p=>Math.min(duration,p+delta*speed));
 },55);return()=>clearInterval(timer);},[playing,speed,duration]);
 useEffect(()=>{if(pos>=duration)setPlaying(false);},[pos,duration]);
 const visible=useMemo(()=>events.filter(e=>e.t_ms<=pos),[events,pos]);
 return <><div style={{maxWidth:1600,margin:"12px auto 0",padding:"0 24px"}}><div className="replay-controls">
   <button onClick={()=>{if(pos>=duration)setPos(0);setPlaying(!playing||pos>=duration);}} aria-label={playing?"Pause":"Play"}>{playing?<Pause size={17}/>:<Play size={17}/>}</button>
   <button onClick={()=>{setPos(0);setPlaying(true);}} aria-label="Restart"><RotateCcw size={17}/></button>
   <span style={{fontSize:12,color:"#a5b4ca",whiteSpace:"nowrap"}}>{fmtClock(pos)}</span>
   <input aria-label="Replay position" type="range" min="0" max={duration} value={pos} onChange={e=>{setPos(Number(e.target.value));setPlaying(false);}}/>
   <span style={{fontSize:12,color:"#a5b4ca",whiteSpace:"nowrap"}}>{fmtClock(duration)}</span>
   <button className={speed===1?"selected":""} onClick={()=>setSpeed(1)}>1×</button><button className={speed===4?"selected":""} onClick={()=>setSpeed(4)}>4×</button>
  </div></div>
  <Stage replay events={visible} prompt={record.prompt} elapsed={pos} id={record.id}/>
 </>;
}
