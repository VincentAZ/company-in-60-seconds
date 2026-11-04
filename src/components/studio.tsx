"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import Link from "next/link";
import {Pause,Play,RotateCcw,ExternalLink,Palette,Globe,ChartNoAxesCombined,Presentation,BrainCircuit,Check,Copy,Sparkles} from "lucide-react";
import type {Artifacts,BuildEvent,BuildRecord,Finance} from "@/lib/schema";
import {financeSchema,buildEventSchema} from "@/lib/schema";
import {BuildStreamParser,eventCursor,mergeBuildEvents,recoveryDeadline} from "@/lib/build-stream";
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
function BrandPanel({a,stopped=false}:{a:Artifacts;stopped?:boolean}){
 const core=a.brand.core,logo=a.brand.logo;
 if(!core)return <PreviewEmpty stopped={stopped} title="Finding the brand's character" description="The brand agent is researching the idea and generating its name, voice and visual identity."/>;
 return <div className="preview-brand">
 <div className="brand-hero" style={{background:core.palette.bg,color:core.palette.ink}}>
  <BrandMark core={core} logo={logo} size={95}/>
  <h2>{core.name}</h2><p>{core.tagline}</p>
  <span style={{opacity:.55,fontSize:11,textTransform:"uppercase",letterSpacing:2}}>{core.industry}</span>
 </div>
 <div className="swatches">{Object.entries(core.palette).map(([key,value])=><div key={key} className="swatch" style={{background:value}}><strong>{key} · {value}</strong></div>)}</div>
 <div className="brand-detail"><span>Voice: {core.voice}</span><span>Typography: {core.font}</span><span>{logo?"Custom geometric mark complete":stopped?"Symbol was not completed":"Designing symbol…"}</span></div>
 </div>;
}
function PreviewEmpty({title,description,stopped=false}:{title:string;description:string;stopped?:boolean}){
 return <div className="preview-empty">{!stopped&&<div className="spinner-ring"/>}<h3>{stopped?"No artifact was completed":title}</h3><p>{stopped?"This build has stopped. Its available outputs and failures are preserved in the event stream.":description}</p></div>;
}
const labels:[keyof Finance,string,number,number][]=[
 ["monthlyPrice","Unit revenue ($)",1,100000],
 ["initialCustomers","Initial monthly volume",1,100000],
 ["monthlyGrowthPct","Monthly growth (%)",-10,50],
 ["churnPct","Monthly churn (%)",0,20],
 ["variableCostPct","Variable costs (%)",0,90],
 ["monthlyFixedCosts","Fixed monthly costs ($)",0,1000000],
 ["startupCost","Startup costs ($)",0,10000000]
];
function FinancePanel({finance,onChange,stopped=false}:{finance:Finance|null;onChange:(f:Finance)=>void;stopped?:boolean}){
 if(!finance)return <PreviewEmpty stopped={stopped} title="Modeling the business" description="Finance is choosing assumptions. Every projection will be calculated in code, not invented by an agent."/>;
 const {months,metrics}=calculateFinance(finance);
 const unit = finance.archetype==="subscription"?"customer":finance.archetype==="capacity"?"booking":finance.archetype==="marketplace"?"transaction":"purchase";
 const max=Math.max(1,...months.map(m=>m.revenue));const width=650,height=180;
 const points=months.map((m,i)=>(i/(months.length-1)*width).toFixed(1)+","+(height-m.revenue/max*(height-25)).toFixed(1)).join(" ");
 return <div>
 <div className="finance-grid">
  {[["Year 1 revenue",money(metrics.year1Revenue)],["Year 3 revenue",money(metrics.year3Revenue)],["Year 1 profit",money(metrics.year1Profit)],["Break-even",metrics.breakEvenMonth?"Month "+metrics.breakEvenMonth:"Not within 36 months"]].map(([key,value])=><div className="metric-box" key={key}><span>{key}</span><strong>{value}</strong></div>)}
 </div>
 <div className="chart-box"><div style={{display:"flex",justifyContent:"space-between",marginBottom:20,fontSize:12}}><strong>Revenue projection</strong><span style={{color:"#9cafc6"}}>36 months · modeled</span></div><svg viewBox={"0 0 "+width+" "+height} preserveAspectRatio="none" role="img" aria-label="36-month illustrative revenue projection">
   {[0,.25,.5,.75,1].map(f=><line key={f} x1="0" x2={width} y1={height*(1-f)} y2={height*(1-f)} stroke="#53637b" strokeWidth=".7" strokeDasharray="3 8" opacity=".45"/>)}
   <polyline key={points} pathLength={1} points={points} fill="none" stroke="#9DECCA" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="chart-draw"/>
 </svg><div style={{display:"flex",justifyContent:"space-between",color:"#8a9bb3",fontSize:10}}><span>MONTH 1</span><span>MONTH 18</span><span>MONTH 36</span></div></div>
 <div className="panel-top" style={{padding:"16px 0",border:0}}><h3>Editable assumptions</h3><small>Everything recalculates</small></div>
 <div className="finance-editor">{labels.map(([key,label,min,max])=><label key={key}>{key==="monthlyPrice"?`Revenue per ${unit} ($)`:key==="initialCustomers"?`Initial monthly ${unit}s`:label}<input type="number" min={min} max={max} value={finance[key] as number} step={key==="monthlyGrowthPct"||key==="churnPct"?"0.5":"1"} onChange={e=>{if(!e.target.value)return;const parsed=financeSchema.safeParse({...finance,[key]:Number(e.target.value)});if(parsed.success)onChange(parsed.data);}}/></label>)}</div>
 <details className="monthly-model"><summary>Explore all 36 months</summary><div className="model-table-wrap" tabIndex={0} aria-label="Scrollable 36-month model"><table><thead><tr><th>Month</th><th>{unit[0].toUpperCase()+unit.slice(1)}s</th><th>Revenue</th><th>Costs</th><th>Profit</th></tr></thead><tbody>{months.map(month=><tr key={month.month}><th>{month.month}</th><td>{month.customers.toLocaleString("en-US")}</td><td>{money(month.revenue)}</td><td>{money(month.costs)}</td><td>{money(month.profit)}</td></tr>)}</tbody></table></div></details>
 <p className="assumption-note"><strong>Important:</strong> This is a hypothetical scenario, not an investment forecast. Assumptions are illustrative, not sourced from market research. Volume grows first, then churn applies. Marketplace unit revenue is the platform’s net revenue per transaction. {finance.rationale}</p>
 </div>;
}
function PitchPanel({a,finance,complete,stopped=false}:{a:Artifacts;finance:Finance|null;complete:boolean;stopped?:boolean}){
 const slides=a.pitch.slides,core=a.brand.core;
 const [selected,setSelected]=useState<number|null>(null);
 const filmstrip=useRef<HTMLDivElement>(null);
 const index=Math.min(selected??slides.length-1,slides.length-1);
 const active=slides[index];
 useEffect(()=>{const strip=filmstrip.current;if(strip&&selected===null)strip.scrollTo({left:strip.scrollWidth,behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});},[slides.length,selected]);
 if(!active)return <PreviewEmpty stopped={stopped} title="The story is taking shape" description="Pitch is synthesizing the brand, problem, solution and assumption-based financial narrative."/>;
 const palette=core?.palette||{bg:"#18253A",surface:"#26354D",ink:"#F1F6FF",primary:"#A1E9C8",accent:"#E4B478"};
 const {metrics}=finance?calculateFinance(finance):{metrics:{} as Record<string,number|null>};
 const metricLabel:Record<string,string>={monthlyPrice:"Unit revenue",year1Revenue:"Year 1 revenue",year3Revenue:"Year 3 revenue",year1Profit:"Year 1 profit",breakEvenMonth:"Break-even month"};
 return <div className="slide-deck">
 <div className="slide-main" key={index} style={{background:palette.bg,color:palette.ink}}>
   <span className="slide-kicker">0{Math.min(index+1,slides.length)} / 0{slides.length} · {active.eyebrow}</span>
   <h2>{active.title}</h2>{active.body&&<p>{active.body}</p>}
   {active.bullets.length>0&&<ul>{active.bullets.map((s,i)=><li key={i}>{s}</li>)}</ul>}
   {active.metricKeys.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:30,marginTop:25}}>{active.metricKeys.map(k=><div key={k}><div style={{fontSize:23,fontWeight:800,color:palette.primary}}>{k==="breakEvenMonth"?(metrics[k]?"Month "+metrics[k]:"N/A"):money(Number(metrics[k]||0))}</div><div style={{fontSize:10,opacity:.7,marginTop:6}}>{metricLabel[k]}</div></div>)}</div>}
   <span style={{position:"absolute",bottom:20,right:30,fontSize:12,opacity:.5}}>{core?.name}</span>
 </div>
 <div ref={filmstrip} className={"slide-filmstrip "+(complete?"filmstrip-complete":"")} aria-label="Pitch slides">{slides.map((s,i)=><button key={i} aria-label={"Slide "+(i+1)+": "+s.title} aria-current={i===index?"true":undefined} onClick={()=>setSelected(i)} className={"slide-thumb "+(i===Math.min(index,slides.length-1)?"active":"")} style={{background:i%2===0?palette.bg:palette.surface,color:palette.ink}}><span style={{opacity:.5,fontSize:9}}>0{i+1}</span><b>{s.title}</b></button>)}</div>
 <div className="assumption-note">{complete?"Deck assembled. ":stopped?"This deck is incomplete; the build has stopped. ":"Slides arrive as Pitch produces them. "}Financial values are linked to the assumptions. {selected!==null&&<button className="text-button" onClick={()=>setSelected(null)}>Follow newest slide</button>}</div>
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
function WebsitePreview({artifacts,finance,active,stopped=false}:{artifacts:Artifacts;finance:Finance|null;active:boolean;stopped?:boolean}){
 const viewport=useRef<HTMLDivElement>(null);
 const [follow,setFollow]=useState(true);
 const count=artifacts.website.sections.length;
 useEffect(()=>{
  const container=viewport.current;
  if(!active||!follow||!container||count<2)return;
  const section=container.querySelector<HTMLElement>(`#section-${count-1}`);
  if(section)container.scrollTo({top:container.scrollTop+section.getBoundingClientRect().top-container.getBoundingClientRect().top,behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});
 },[count,active,follow]);
 if(!count)return <PreviewEmpty stopped={stopped} title="Waiting for the first section" description="Website construction begins the moment brand direction and financial assumptions arrive."/>;
 return <><div className="preview-toolbar"><span>{count} sections assembled</span><button aria-pressed={follow} onClick={()=>setFollow(!follow)}>{follow?"Following new sections":"Follow new sections"}</button></div><div ref={viewport} className="preview-website" onWheel={()=>setFollow(false)} onTouchMove={()=>setFollow(false)}><GeneratedSite artifacts={artifacts} financeOverride={finance} embedded/></div></>;
}
function DependencyMap({events,artifacts}:{events:BuildEvent[];artifacts:Artifacts}){
 const handoff=events.find(event=>event.type==="handoff");
 return <div className={"dependency-map "+(handoff?"unlocked":"")} aria-label={handoff?"Brand and Finance have unlocked Website and Pitch":"Website and Pitch are waiting for Brand and Finance"}>
  <div className="dependency-row"><span className={artifacts.brand.core?"ready":""}>Brand core {artifacts.brand.core&&<Check size={11}/>}</span><span className={artifacts.finance?"ready":""}>Finance {artifacts.finance&&<Check size={11}/>}</span></div>
  <svg viewBox="0 0 260 56" aria-hidden="true" key={handoff?.seq??"waiting"}><path d="M60 0V12Q60 23 80 23H180Q200 23 200 12V0M130 23V35M60 56V46Q60 35 80 35H180Q200 35 200 46V56" fill="none" stroke="#40516a" strokeWidth="1.5"/>{handoff&&<path className="handoff-pulse" d="M60 0V12Q60 23 80 23H130V35H180Q200 35 200 46V56M200 0V12Q200 23 180 23H130V35H80Q60 35 60 46V56" fill="none" stroke="#a7f0cf" strokeWidth="3"/>}</svg>
  <div className="dependency-row"><span className={handoff?"ready":""}>Website</span><span className={handoff?"ready":""}>Pitch</span></div>
  <small>{handoff?`Handoff recorded at ${fmt(handoff.t_ms)}`:"Waiting for both inputs"}</small>
 </div>;
}
function Stage({events,prompt,elapsed,replay=false,demo=false,id,problem,notice,finalArtifacts}:{events:BuildEvent[];prompt:string;elapsed:number;replay?:boolean;demo?:boolean;id?:string;problem?:string;notice?:string;finalArtifacts?:Artifacts}){
 const reduction=useMemo(()=>{try{return {artifacts:reduceEvents(events),error:""}}catch{return {artifacts:emptyArtifacts(),error:"Saved events are inconsistent. This replay cannot reconstruct the artifacts safely."};}},[events]);
 const artifacts=reduction.artifacts;
 problem=problem||reduction.error;
 const [chosenTab,setTab]=useState<Tab|null>(null),[override,setOverride]=useState<{source:string;finance:Finance}|null>(null),[copied,setCopied]=useState(false),[copyError,setCopyError]=useState(""),[shareUrl,setShareUrl]=useState(""),[sharing,setSharing]=useState(false);
 const last=events[events.length-1];
 const lastPatch=events.findLast(event=>event.type==="artifact.patch"&&event.agent!=="Brief");
 const automaticTab=(lastPatch?.payload.artifact??"brand") as Tab;
 const tab=chosenTab??(tabs.some(([name])=>name===automaticTab)?automaticTab:"brand");
 const source=JSON.stringify(artifacts.finance);
 const finance=override?.source===source?override.finance:artifacts.finance;
 const statuses:Record<string,"waiting"|"working"|"done"|"failed"|"stopped">={};
 for(const a of AGENTS)statuses[a.name]="waiting";
 for(const e of events){
  if(e.type==="agent.started")statuses[e.agent]="working";
  if(e.type==="agent.completed")statuses[e.agent]="done";
  if(e.type==="agent.failed")statuses[e.agent]="failed";
 }
 const finished=last?.type==="build.completed";
 const availableArtifacts=finalArtifacts??artifacts;
 const canShare=Boolean(finalArtifacts)||finished;
 const stopped=finished||Boolean(problem);
 if(stopped)for(const agent of AGENTS)if(statuses[agent.name]==="working")statuses[agent.name]="stopped";
 const terminalStatus=finished?String(last.payload.status):"";
 const completed=finished&&terminalStatus==="completed"&&!reduction.error;
 const tabsReady={website:artifacts.website.sections.length,brand:artifacts.brand.core?1:0,finance:artifacts.finance?1:0,pitch:artifacts.pitch.slides.length};
 const title=artifacts.brand.core?.name||"Your next big idea";
 return <div className="studio-shell">
  <div className="studio-top"><Link href="/" className="brand-link"><span className="brand-symbol"><Sparkles size={17}/></span> Company / 60</Link>
   <div className="studio-top-right"><span className="studio-status">{replay?(demo?"DEMO REPLAY":"REPLAY MODE"):finished?`BUILD ${terminalStatus.toUpperCase()}`:problem?"BUILD INTERRUPTED":"LIVE BUILD"}</span><span className="clock">{fmtClock(elapsed)}</span><Link className="small-btn" href="/">New idea</Link></div>
  </div>
  <div className="studio-title"><div><span className="eyebrow">{replay?(demo?"PRERECORDED EXAMPLE · ILLUSTRATIVE CONTENT":"THE REPLAY EXPERIENCE"):"THE BUILD IS THE SHOW"}</span><h1>{title}<span style={{color:"#95a2b7"}}> / </span>{completed?"Ready to explore.":finished?"A work in progress.":stopped?"Build interrupted.":"Taking shape."}</h1><p>{prompt}</p></div><span className="panel-tag">5 model stages / 4 artifacts</span></div>
  {problem&&<div className="error-msg" role="alert">{problem} <Link href="/" style={{textDecoration:"underline"}}>Browse the free replays.</Link></div>}
  {notice&&!problem&&<div className="connection-notice" role="status">{notice}</div>}
  {finished&&!completed&&<div className="connection-notice" role="status">This build finished with {terminalStatus==="partial"?"some incomplete artifacts":"an error"}. The event stream preserves the actual outcome.</div>}
  <div className="studio-layout">
   <aside className="studio-left">
    <div className="panel"><div className="panel-top"><h3>Agent orchestration</h3><small>{finished?"Finalized":stopped?"Stopped":"In progress"}</small></div><div className="agent-list">{AGENTS.map(a=>{
      const Icon=a.icon;const state=statuses[a.name];
      return <div className={"agent-row agent-"+state} key={a.name}><div className="agent-icon"><Icon size={17}/></div><div><h4>{a.label}</h4><p>{state==="working"?(replay?"Working at this moment":"Generating live…"):state==="done"?"Artifact ready":state==="failed"?"Generation failed":state==="stopped"?"Stopped before completion":stopped?"Did not start":a.description}</p></div><div aria-label={state} className={"agent-led "+(state==="working"?"active":state)}/></div>;
    })}</div><DependencyMap events={events} artifacts={artifacts}/></div>
    <div className="panel"><div className="panel-top"><h3>Event stream</h3><small>{events.length} events</small></div><div className="event-feed" tabIndex={0} aria-label="Recorded build events">{events.slice(-22).reverse().map(e=><div className="event-line" key={e.seq}><span className="time">{fmt(e.t_ms)}</span><span>{displayEvent(e)}</span></div>)}{events.length===0&&<div style={{padding:12,color:"#8090aa",fontSize:12}}>Waiting for the first event…</div>}</div></div>
    <div className="panel" style={{padding:17,fontSize:12,lineHeight:1.7,color:"#9eacc0"}}><strong style={{color:"#a4efc9"}}>The dependencies are real.</strong><p style={{margin:"8px 0 0"}}>Brand and Finance start together. Website and Pitch wait for both to deliver usable inputs. Every event is timestamped for deterministic replay.</p></div>
   </aside>
   <div className="studio-artifacts">
    <div className="main-panel">
     <div className="preview-tabs"><div className="tab-buttons" role="tablist" aria-label="Company artifacts">{tabs.map(([name,Icon])=><button role="tab" tabIndex={tab===name?0:-1} onKeyDown={event=>{const current=tabs.findIndex(([value])=>value===name);const next=event.key==="ArrowRight"?(current+1)%tabs.length:event.key==="ArrowLeft"?(current+tabs.length-1)%tabs.length:event.key==="Home"?0:event.key==="End"?tabs.length-1:null;if(next!==null){event.preventDefault();setTab(tabs[next][0]);document.getElementById("tab-"+tabs[next][0])?.focus();}}} aria-selected={tab===name} aria-controls={"panel-"+name} id={"tab-"+name} key={name} className={"tab-button "+(tab===name?"selected":"")} onClick={()=>setTab(name)}><Icon size={15}/> {name[0].toUpperCase()+name.slice(1)} {tabsReady[name]>0&&<Check size={12} style={{color:"#a2ebc4"}}/>}</button>)}</div><button className="auto-follow" aria-pressed={chosenTab===null} onClick={()=>setTab(null)}>Follow agents</button></div>
     <div className="preview-body">
      <div role="tabpanel" id="panel-website" aria-labelledby="tab-website" hidden={tab!=="website"}><WebsitePreview artifacts={artifacts} finance={finance} active={tab==="website"} stopped={stopped}/></div>
      <div role="tabpanel" id="panel-brand" aria-labelledby="tab-brand" hidden={tab!=="brand"}><BrandPanel a={artifacts} stopped={stopped}/></div>
      <div role="tabpanel" id="panel-finance" aria-labelledby="tab-finance" hidden={tab!=="finance"}><FinancePanel finance={finance} onChange={value=>setOverride({source,finance:value})} stopped={stopped}/></div>
      <div role="tabpanel" id="panel-pitch" aria-labelledby="tab-pitch" hidden={tab!=="pitch"}><PitchPanel a={artifacts} finance={finance} complete={statuses.Pitch==="done"} stopped={stopped}/></div>
     </div>
    </div>
    {completed&&<div className="build-finale" key={last.seq}><Sparkles size={17}/><strong>One idea. Four connected artifacts.</strong><span>Explore the website, edit the numbers, share the replay.</span></div>}
    <div className="studio-share">
     {id&&canShare&&<>{availableArtifacts.brand.core&&availableArtifacts.website.sections.length>0&&<Link href={"/c/"+id}>Open concept website <ExternalLink size={13} style={{display:"inline"}}/></Link>}
     <button disabled={sharing} onClick={async()=>{
      setSharing(true);setCopyError("");
      try{
       let url=shareUrl||window.location.origin+"/b/"+id;
       if(!demo&&!shareUrl){const response=await fetch(`/api/builds/${id}/share`,{method:"POST"});const body=await response.json();if(!response.ok||typeof body.url!=="string")throw new Error(body.error||"Could not create a replay link.");const resolved=new URL(body.url,window.location.origin);if(resolved.origin!==window.location.origin)throw new Error("Invalid sharing link.");url=resolved.href;}
       setShareUrl(url);
       try{await navigator.clipboard.writeText(url);setCopied(true);}catch{setCopyError("Copy is unavailable. Open the replay link to share it.");}
      }catch(cause){setCopyError(cause instanceof Error?cause.message:"Could not create a replay link.");}
      finally{setSharing(false);}
     }}>{copied?<Check size={13}/>:<Copy size={13}/>} {sharing?"Preparing link…":copied?"Link copied":"Copy replay link"}</button>{copyError&&<span role="status">{copyError} {shareUrl&&<a href={shareUrl}>Open replay link</a>}</span>}</>}
     <span style={{fontSize:11,color:"#8d9bb0",marginLeft:"auto"}}>{demo?"Hand-curated demo · stored event replay":replay?"Recorded events, not a rendered video":"Real AI events. No fabricated progress."}</span>
    </div>
   </div>
  </div>
 </div>;
}

interface SavedBuild {requestId:string;id?:string}
function savedBuild(storageKey:string,requestId?:string):SavedBuild {
 try{
  const stored=JSON.parse(sessionStorage.getItem(storageKey)||"null") as SavedBuild|null;
  if(stored&&/^[a-f0-9-]{36}$/i.test(stored.requestId)&&(!stored.id||/^[a-z0-9-]{1,80}$/i.test(stored.id)))return stored;
 }catch{}
 return {requestId:requestId||crypto.randomUUID()};
}
function rememberBuild(storageKey:string,build:SavedBuild){try{sessionStorage.setItem(storageKey,JSON.stringify(build));}catch{}}
const waitForPoll=(signal:AbortSignal)=>new Promise<void>((resolve,reject)=>{
 const finish=()=>{signal.removeEventListener("abort",abort);resolve();};
 const timer=setTimeout(finish,1500);
 const abort=()=>{clearTimeout(timer);reject(new DOMException("Aborted","AbortError"));};
 signal.addEventListener("abort",abort,{once:true});
 if(signal.aborted)abort();
});
type LiveStudioProps={prompt:string}&({existingBuildId:string;initialEvents:BuildEvent[];startedAt:string;requestId?:never}|{existingBuildId?:never;initialEvents?:never;startedAt?:never;requestId?:string});
const NO_EVENTS:BuildEvent[]=[];
export function LiveStudio({prompt,requestId,existingBuildId,initialEvents=NO_EVENTS,startedAt:recordStartedAt}:LiveStudioProps){
 const [events,setEvents]=useState<BuildEvent[]>(initialEvents),[error,setError]=useState(""),[notice,setNotice]=useState(""),[elapsed,setElapsed]=useState(initialEvents.at(-1)?.t_ms||0),[id,setId]=useState(existingBuildId||"");
 useEffect(()=>{
  const controller=new AbortController();
  const signal=controller.signal;
  let collected:BuildEvent[]=initialEvents,terminal=initialEvents.at(-1)?.type==="build.completed",stopped=false;
  let startedAt=recordStartedAt?Date.parse(recordStartedAt):Date.now();
  if(!Number.isFinite(startedAt))startedAt=Date.now();
  const storageKey="company-build:v1:"+(requestId||prompt);
  // Existing build views are read-only, even with absent or corrupt session storage.
  const readOnly=existingBuildId!==undefined;
  const saved:SavedBuild=readOnly?{requestId:"",id:existingBuildId}:savedBuild(storageKey,requestId);
  if(!readOnly)rememberBuild(storageKey,saved);
  const timer=setInterval(()=>{if(!signal.aborted&&!terminal&&!stopped)setElapsed(Date.now()-startedAt);},100);
  const identify=(value:string)=>{if(!/^[a-z0-9-]{1,80}$/i.test(value))throw new Error("Invalid build identifier.");saved.id=value;if(!readOnly)rememberBuild(storageKey,saved);if(!signal.aborted)setId(value);};
  const accept=(incoming:BuildEvent[])=>{
   if(signal.aborted)return;
   if(incoming[0]){if(saved.id&&incoming[0].build_id!==saved.id)throw new Error("Unexpected build identifier.");identify(incoming[0].build_id);}
   collected=mergeBuildEvents(collected,incoming);
   const cursor=eventCursor(collected);
   const visible=collected.filter(event=>event.seq<=cursor);
   setEvents(visible);
   const end=visible.at(-1);
   if(end?.type==="build.completed"){terminal=true;setElapsed(end.t_ms);setNotice("");}
  };
  const poll=async()=>{
   if(!saved.id)throw new Error("Connection interrupted before the build was identified. Reload to retry the same request safely.");
   let failures=0;
   let deadline=recoveryDeadline(new Date(startedAt).toISOString());
   while(!signal.aborted&&!terminal){
    try{
     const response=await fetch(`/api/builds/${saved.id}?after=${eventCursor(collected)}`,{cache:"no-store",signal:AbortSignal.any([signal,AbortSignal.timeout(15000)])});
     if(!response.ok)throw new Error(response.status===404?"Build not found or access expired.":"Could not recover the build stream.");
     const body=await response.json() as {record?:BuildRecord;events?:unknown[]};
     if(!body.record||!Array.isArray(body.events))throw new Error("Invalid build recovery response.");
     const parsed=body.events.map(value=>buildEventSchema.parse(value) as BuildEvent);
     accept(parsed);
     const start=Date.parse(body.record.started_at);if(Number.isFinite(start)){startedAt=start;deadline=recoveryDeadline(body.record.started_at);}
     if(body.record.status!=="running"&&!terminal)throw new Error("The build stopped before its final event was stored. Available artifacts are preserved.");
     failures=0;
    }catch(cause){
     if(signal.aborted)throw cause;
     failures++;
     if(failures>=4)throw cause;
    }
    if(Date.now()>deadline&&!terminal)throw new Error("The build has not finished within its time limit. Reload to check its saved status.");
    if(!terminal)await waitForPoll(signal);
   }
  };
  const run=async()=>{
   try{
    if(readOnly){identify(existingBuildId);setNotice("Recovering saved events…");await poll();return;}
    if(saved.id){identify(saved.id);setNotice("Recovering saved events…");await poll();return;}
    const response=await fetch("/api/build",{method:"POST",headers:{"Content-Type":"application/json","Idempotency-Key":saved.requestId},body:JSON.stringify({prompt}),signal});
    if(!response.ok){const body=await response.json();throw new Error(body.error||"Could not start build.");}
    const buildId=response.headers.get("X-Build-Id");if(buildId)identify(buildId);
    if(response.headers.get("Content-Type")?.includes("application/json")){
     const body=await response.json();if(typeof body.id==="string")identify(body.id);
     setNotice("Reconnecting to your existing build…");await poll();return;
    }
    if(!response.body)throw new Error("No build stream returned.");
    const reader=response.body.getReader(),decoder=new TextDecoder(),parser=new BuildStreamParser();
    let streamProblem="";
    try{
     while(!signal.aborted&&!terminal){
      let readTimer:ReturnType<typeof setTimeout>|undefined;
      const timeout=new Promise<never>((_,reject)=>{readTimer=setTimeout(()=>reject(new Error("The stream paused. Recovering saved events…")),45000);});
      const chunk=await Promise.race([reader.read(),timeout]).finally(()=>clearTimeout(readTimer));
      if(chunk.done){accept(parser.push(decoder.decode()));accept(parser.finish());break;}
      accept(parser.push(decoder.decode(chunk.value,{stream:true})));
     }
    }catch(cause){if(signal.aborted)throw cause;streamProblem=cause instanceof Error?cause.message:"Stream interrupted.";}
    finally{await reader.cancel().catch(()=>{});}
    if(!terminal&&!signal.aborted){setNotice(streamProblem||"Connection interrupted. Recovering saved events…");await poll();}
   }catch(cause){if(!signal.aborted){stopped=true;setError(cause instanceof Error?cause.message:"Unable to build.");}}
   finally{clearInterval(timer);}
  };
  // Strict Mode's first setup is cleaned up before this task starts. A persistent
  // idempotency key also protects real remounts, lost responses, and reloads.
  const kickoff=setTimeout(()=>void run(),0);
  return()=>{clearTimeout(kickoff);clearInterval(timer);controller.abort();};
 },[prompt,requestId,existingBuildId,initialEvents,recordStartedAt]);
 return <Stage events={events} prompt={prompt} elapsed={elapsed} id={id||undefined} problem={error} notice={notice}/>;
}
export function ReplayStudio({record,events}:{record:BuildRecord;events:BuildEvent[]}){
 const duration=Math.max(record.duration_ms,events.at(-1)?.t_ms||1);
 const [pos,setPos]=useState(0),[playing,setPlaying]=useState(true),[speed,setSpeed]=useState(1),[epoch,setEpoch]=useState(0);
 const last=useRef(0);
 useEffect(()=>{last.current=Date.now();const timer=setInterval(()=>{
  const now=Date.now();const delta=now-last.current;last.current=now;
  if(playing)setPos(p=>Math.min(duration,p+delta*speed));
 },55);return()=>clearInterval(timer);},[playing,speed,duration]);
 const running=playing&&pos<duration;
 const visible=useMemo(()=>events.filter(e=>e.t_ms<=pos),[events,pos]);
 return <><div style={{maxWidth:1600,margin:"12px auto 0",padding:"0 24px"}}><div className="replay-controls">
   <button onClick={()=>{if(pos>=duration){setPos(0);setEpoch(value=>value+1);}setPlaying(!running);}} aria-label={running?"Pause":"Play"}>{running?<Pause size={17}/>:<Play size={17}/>}</button>
   <button onClick={()=>{setPos(0);setEpoch(value=>value+1);setPlaying(true);}} aria-label="Restart"><RotateCcw size={17}/></button>
   <span style={{fontSize:12,color:"#a5b4ca",whiteSpace:"nowrap"}}>{fmtClock(pos)}</span>
   <input aria-label="Replay position" type="range" min="0" max={duration} value={pos} onChange={e=>{setPos(Number(e.target.value));setEpoch(value=>value+1);setPlaying(false);}}/>
   <span style={{fontSize:12,color:"#a5b4ca",whiteSpace:"nowrap"}}>{fmtClock(duration)}</span>
   <button className={speed===1?"selected":""} onClick={()=>setSpeed(1)}>1×</button><button className={speed===4?"selected":""} onClick={()=>setSpeed(4)}>4×</button>
  </div></div>
  <Stage key={record.id+":"+epoch} replay demo={record.id.startsWith("demo-")} events={visible} prompt={record.prompt} elapsed={pos} id={record.id} finalArtifacts={record.status!=="running"&&events.at(-1)?.type==="build.completed"?record.artifacts:undefined}/>
 </>;
}
