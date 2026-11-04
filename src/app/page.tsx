import Link from "next/link";
import {ArrowRight,ArrowUpRight,BrainCircuit,ChartNoAxesCombined,Globe,Palette,Play,Sparkles,Presentation} from "lucide-react";
import {getGallery} from "@/lib/storage";
import {BrandMark} from "@/components/logo";
import {IdeaForm} from "@/components/idea-form";
export const dynamic="force-dynamic";
export default async function Home(){
 const gallery=await getGallery();
 return <>
  <div className="shell"><header className="topbar"><Link href="/" className="brand-link"><span className="brand-symbol"><Sparkles size={18}/></span> Company / 60</Link><nav className="top-links"><a href="#how">How it works</a><a href="#gallery">The gallery</a><Link className="small-btn" href="/b/demo-1">Watch a replay ↗</Link></nav></header></div>
  <main>
   <section className="home-hero"><div className="shell">
    <span className="eyebrow">A NEW KIND OF CREATIVE MACHINE · AI-NATIVE STUDIO</span>
    <h1>One idea.<br/><em>A whole company.</em><br/>Before your eyes.</h1>
    <p>Describe a business in one sentence. Watch a crew of AI agents build its identity, website, financial model and pitch deck, with every decision appearing live.</p>
    <IdeaForm/>
    <p className="home-note"><strong>No signup required.</strong> Live generation is subject to availability and usage caps. Explore finished replays for free.</p>
    <div id="how" className="home-visual"><div className="visual-top"><span className="window-dots"><i/><i/><i/></span><span>THE ORCHESTRATION ENGINE · REAL EVENTS, REAL ARTIFACTS</span><span style={{color:"#9ce9c7"}}>● SYSTEM READY</span></div><div className="visual-grid">
     {[[Palette,"Brand architect","A name, unique identity and custom vector mark."],[ChartNoAxesCombined,"Finance strategist","Assumptions and a 36-month financial model."],[Globe,"Website designer","A live, responsive, interactive landing page."],[Presentation,"Pitch storyteller","A compelling deck backed by the same model."]].map(([Icon,label,desc])=>{const I=Icon as typeof Palette;return <div className="visual-agent" key={String(label)}><div className="agent-glow"/><I size={22} color="#a2edcd"/><h3>{String(label)}</h3><p>{String(desc)}</p><div className="mini-bar"><span/></div></div>;})}
    </div></div>
   </div></section>
   <section className="shell" id="gallery">
    <div className="section-head"><div><span className="eyebrow">REPLAY THE MAGIC</span><h2>Companies, already born.</h2></div><p>Every finished build is an interactive story. Watch the decisions unfold or explore the final websites. These are clearly labeled concept demonstrations.</p></div>
    <div className="gallery">{gallery.map((r)=>{
     const core=r.artifacts.brand.core;
     return <Link className="gallery-card" href={"/b/"+r.id} key={r.id}>
      <div className="gallery-art" style={{background:core?.palette.bg,color:core?.palette.ink}}><BrandMark core={core} logo={r.artifacts.brand.logo} size={96}/></div>
      <div className="gallery-meta"><h3>{core?.name||"New concept"}</h3><p>{core?.tagline||r.prompt}</p><span><Play size={12} fill="currentColor"/> WATCH REPLAY <ArrowUpRight size={13}/></span></div>
     </Link>;
    })}</div>
   </section>
  </main>
  <footer className="shell bottom-note"><div style={{display:"flex",justifyContent:"space-between",gap:15,flexWrap:"wrap"}}><span>© 2026 Company / 60 · Made to showcase AI-assisted engineering.</span><span>Every example is a fictional concept. Financials are illustrative.</span></div></footer>
 </>;
}
