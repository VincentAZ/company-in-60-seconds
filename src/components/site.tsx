"use client";
import {useState} from "react";
import {ArrowRight,ChevronDown,Check,Menu,ArrowUpRight} from "lucide-react";
import type {Artifacts,Finance,Section} from "@/lib/schema";
import {money} from "@/lib/finance";
import {BrandMark} from "./logo";
export function GeneratedSite({artifacts,financeOverride,embedded=false}:{artifacts:Artifacts;financeOverride?:Finance|null;embedded?:boolean}){
 const [opened,setOpened]=useState<number|null>(null);
 const [mobile,setMobile]=useState(false);
 const [submitted,setSubmitted]=useState(false);
 const {core,logo}=artifacts.brand;const setup=artifacts.website.setup;
 const finance=financeOverride||artifacts.finance;
 const p=core?.palette||{bg:"#141D2C",surface:"#263249",ink:"#F7FAFF",primary:"#B3EACC",accent:"#E6A96B"};
 const style={"--site-bg":p.bg,"--site-surface":p.surface,"--site-ink":p.ink,"--site-primary":p.primary,"--site-accent":p.accent} as React.CSSProperties;
 const name=core?.name||"Your company";
 const sections=artifacts.website.sections;
 const featureIcons=["✳","◈","✦","◉","⬡","◎"];
 return <div className={"generated-site "+(embedded?"site-embedded ":"")+"site-"+(setup?.archetype||"tech")+" site-"+(setup?.radius||"medium")} style={style}>
   <header className="site-header">
    <a className="site-logo" href="#top"><BrandMark core={core} logo={logo} size={32}/><strong>{name}</strong></a>
    <nav className={mobile?"site-nav open":"site-nav"}>{(setup?.navigation||["Why us","How it works","Pricing"]).map((n,i)=><a key={i} href={"#section-"+(i+1)} onClick={()=>setMobile(false)}>{n}</a>)}</nav>
    <a href="#contact" className="site-header-cta">Get started <ArrowUpRight size={15}/></a>
    <button className="site-menu" onClick={()=>setMobile(!mobile)} aria-label="Open menu"><Menu size={21}/></button>
   </header>
   <main id="top">
    {sections.length===0?<div className="site-skeleton"><div/><div/><div/></div>:sections.map((s,i)=>{
      const isHero=s.type==="hero",isCard=["benefits","features","steps","stats"].includes(s.type);
      return <section key={i} id={"section-"+i} className={"site-section section-"+s.type+" variant-"+s.variant}>
       <div className="site-section-inner">
        {isHero?<div className="site-hero-layout">
          <div className="site-hero-copy"><span className="site-eyebrow"><span className="site-eyebrow-dash"/> {s.kicker}</span><h1>{s.headline}</h1><p>{s.body}</p><a className="site-button" href="#contact">{s.cta}<ArrowRight size={17}/></a><div className="site-hero-foot">Thoughtfully designed. Beautifully simple.</div></div>
          <div className="site-art"><div className="site-art-ring first"/><div className="site-art-ring second"/><div className="site-art-disc"><BrandMark core={core} logo={logo} size={124}/></div><span className="site-art-label">{core?.industry||"THE NEXT BIG IDEA"}</span></div>
         </div>:
         <>
          <div className="site-section-heading"><span className="site-eyebrow">{s.kicker}</span><h2>{s.headline}</h2>{s.body&&<p>{s.body}</p>}</div>
          {isCard&&<div className="site-feature-grid">{s.items.map((it,j)=><article className="site-feature" key={j}><span className="site-feature-icon">{featureIcons[j%featureIcons.length]}</span><span className="site-feature-number">0{j+1}</span><h3>{it.title}</h3><p>{it.body}</p></article>)}</div>}
          {s.type==="pricing"&&<div className="site-pricing-card"><div><span className="site-eyebrow">THE ESSENTIAL PLAN</span><h3>Everything you need to begin.</h3><p>Transparent, illustrative pricing for your concept.</p></div><div className="site-price"><strong>{finance?money(finance.monthlyPrice):"..."}</strong><span>/ {finance?.archetype==="subscription"?"month":finance?.archetype==="capacity"?"booking":"purchase"}</span></div><a href="#contact" className="site-button">{s.cta}<ArrowRight size={16}/></a><small>Illustrative price, not a real offer.</small></div>}
          {s.type==="faq"&&<div className="site-faq-list">{s.items.map((it,j)=><div className="site-faq" key={j}><button onClick={()=>setOpened(opened===j?null:j)} aria-expanded={opened===j}>{it.title}<ChevronDown size={18}/></button>{opened===j&&<p>{it.body}</p>}</div>)}</div>}
          {s.type==="cta"&&<a className="site-button" href="#contact">{s.cta}<ArrowRight size={17}/></a>}
          {s.type==="testimonial"&&<div className="site-feature-grid">{s.items.map((it,j)=><article className="site-feature" key={j}><h3>{it.title}</h3><p>{it.body}</p></article>)}</div>}
         </>}
       </div>
      </section>;
    })}
    <section id="contact" className="site-contact">
      <div><span className="site-eyebrow">SAY HELLO</span><h2>Ready for what&apos;s next?</h2><p>This is a concept website generated for a demo. The form demonstrates interaction and does not send your information anywhere.</p></div>
      {submitted?<div className="site-contact-confirm"><Check size={22}/> Demo complete. No information was submitted.</div>:<form onSubmit={e=>{e.preventDefault();setSubmitted(true);}}><label htmlFor="demo-email">Your email</label><input id="demo-email" type="email" placeholder="you@example.com" required/><button type="submit">Try the demo form <ArrowRight size={16}/></button></form>}
    </section>
   </main>
   <footer className="site-footer"><strong>{name}.</strong><span>Built in the Company in 60 Seconds studio · Concept demo</span></footer>
 </div>;
}
