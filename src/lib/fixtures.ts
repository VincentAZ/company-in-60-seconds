import type {Artifacts,BuildEvent,BuildRecord,Core,Finance,Section,Slide,WebsiteSetup,Logo,Brief} from "./schema";
import {emptyArtifacts,reduceEvents} from "./reducer";

type Seed={idea:string;name:string;tagline:string;industry:string;archetype:WebsiteSetup["archetype"];colors:[string,string,string,string,string];price:number;customers:number;growth:number;benefits:[string,string][]};
export const seeds:Seed[]=[
 {idea:"A luxury pet hotel with video suites and private playtime",name:"Paw Palace",tagline:"Five-star stays for four-legged guests.",industry:"Pet hospitality",archetype:"luxury",colors:["#111722","#1C2634","#F6F3E9","#E8B879","#80B3AA"],price:95,customers:70,growth:6,benefits:[["Private suites","A tranquil retreat built around their routine."],["Daily adventures","Supervised playtime, every single day."],["Stay connected","A window into every tail wag."]]},
 {idea:"A zero-waste coffee subscription for remote workers",name:"Bloom & Bean",tagline:"Good coffee. Lighter footprint.",industry:"Coffee",archetype:"organic",colors:["#F1EEDB","#E2E7CE","#233A2B","#365C40","#DB794D"],price:29,customers:210,growth:9,benefits:[["Roasted to order","Small-batch flavor delivered fresh."],["Refill, repeat","Returnable packaging makes waste history."],["Every cup counts","Feel better about your daily ritual."]]},
 {idea:"An AI-powered booking assistant for independent salons",name:"LumaDesk",tagline:"Your front desk, beautifully handled.",industry:"Salon software",archetype:"tech",colors:["#0F1024","#242241","#F6F2FF","#9387F9","#EEA6D3"],price:89,customers:110,growth:12,benefits:[["Always on","Appointments booked after hours."],["No more no-shows","Reminders that work for your business."],["Your voice","Thoughtful replies that sound like you."]]},
 {idea:"A traveling pop-up science museum for kids",name:"WonderCart",tagline:"Curiosity delivered to your doorstep.",industry:"Education",archetype:"playful",colors:["#FFF8E8","#FDECC5","#142F4C","#EB5E40","#3D9DB1"],price:350,customers:35,growth:7,benefits:[["Hands-on wonder","Experiments that make ideas click."],["We bring everything","A whole discovery lab in one visit."],["Created for curious minds","Age-appropriate and endlessly fun."]]}
];
function buildSeed(seed:Seed,i:number):{record:BuildRecord,events:BuildEvent[]}{
 const now=new Date("2026-11-04T18:00:00Z").toISOString(),id="demo-"+(i+1),seq={n:0};let t=0;const events:BuildEvent[]=[];
 const emit=(agent:BuildEvent["agent"],type:BuildEvent["type"],payload:Record<string,unknown>,advance=700)=>{
  t+=advance;events.push({build_id:id,seq:++seq.n,t_ms:t,agent,type,payload});
 };
 const patch=(agent:BuildEvent["agent"],artifact:string,path:string,value:unknown,op="set")=>emit(agent,"artifact.patch",{artifact,path,value,op},850);
 const palette={bg:seed.colors[0],surface:seed.colors[1],ink:seed.colors[2],primary:seed.colors[3],accent:seed.colors[4]};
 const core:Core={name:seed.name,tagline:seed.tagline,description:seed.idea,industry:seed.industry,voice:"Confident, human, memorable",font:seed.archetype==="luxury"?"editorial":seed.archetype==="organic"?"warm":seed.archetype==="tech"?"technical":"playful",palette};
 const finance:Finance={archetype:seed.archetype==="tech"?"subscription":"transactional",monthlyPrice:seed.price,initialCustomers:seed.customers,monthlyGrowthPct:seed.growth,churnPct:2,variableCostPct:30,monthlyFixedCosts:2000,startupCost:12000,currency:"USD",rationale:"Illustrative assumptions for demonstration. Replace with researched business inputs."};
 const brief:Brief={idea:seed.idea,audience:"Early adopters and local customers",offering:seed.industry,category:seed.industry,positioning:seed.tagline,archetype:seed.archetype,allowed:true,reason:"Demo business idea"};
 const logo:Logo={shapes:[{kind:"circle",cx:50,cy:50,r:38,fill:"primary"},{kind:"circle",cx:50,cy:50,r:17,fill:"accent"}]};
 const setup:WebsiteSetup={archetype:seed.archetype,domainSuggestion:seed.name.toLowerCase().replace(/[^a-z]/g,"")+".com",navigation:["Why us","How it works","Pricing"],radius:seed.archetype==="playful"?"round":"medium",density:"airy"};
 const sections:Section[]=[
 {type:"hero",variant:"split",kicker:seed.industry,headline:seed.tagline,body:seed.idea+". Designed for people who expect a little more.",items:[],cta:"Explore "+seed.name},
 {type:"benefits",variant:"cards",kicker:"WHY "+seed.name.toUpperCase(),headline:"Not business as usual.",body:"Thoughtful details make the biggest difference.",items:seed.benefits.map(([title,body])=>({title,body})),cta:"Learn more"},
 {type:"steps",variant:"editorial",kicker:"THE EXPERIENCE",headline:"Simple from the start.",body:"A better way to get what you need.",items:[{title:"Discover",body:"Find the right fit for you."},{title:"Choose",body:"Select a plan that makes sense."},{title:"Enjoy",body:"Leave the details to us."}],cta:"Get started"},
 {type:"pricing",variant:"minimal",kicker:"STRAIGHTFORWARD PRICING",headline:"A good thing, made simple.",body:"Transparent pricing that grows with your needs.",items:[],cta:"Start today"},
 {type:"faq",variant:"cards",kicker:"THE DETAILS",headline:"Questions? Answered.",body:"Everything you need to get going.",items:[{title:"How do I get started?",body:"Choose the plan that works for you and reach out."},{title:"Can I cancel?",body:"Our team can walk you through your options."}],cta:"Contact us"},
 {type:"cta",variant:"bold",kicker:"READY?",headline:"Make room for better.",body:"Be among the first to experience "+seed.name+".",items:[],cta:"Get in touch"}
 ];
 const slides:Slide[]=[
 {layout:"statement",eyebrow:"THE BIG IDEA",title:seed.name,body:seed.tagline,bullets:[],metricKeys:[]},
 {layout:"problem",eyebrow:"THE PROBLEM",title:"The old way isn't working.",body:seed.idea,bullets:["Poor customer experience","Too much friction","A clear opening in the market"],metricKeys:[]},
 {layout:"solution",eyebrow:"OUR ANSWER",title:seed.tagline,body:seed.idea,bullets:seed.benefits.map(a=>a[0]),metricKeys:[]},
 {layout:"metrics",eyebrow:"ASSUMPTION-BASED",title:"The model",body:"Illustrative scenario, not verified performance.",bullets:[],metricKeys:["monthlyPrice","year1Revenue","year3Revenue"]},
 {layout:"roadmap",eyebrow:"NEXT STEPS",title:"From idea to momentum.",body:"A focused roadmap to validate demand.",bullets:["Validate with customers","Launch a focused pilot","Measure conversion and retention","Scale what works"],metricKeys:[]},
 {layout:"closing",eyebrow:"LET'S BUILD",title:"The future belongs to builders.",body:seed.name+". "+seed.tagline,bullets:[],metricKeys:[]}
 ];
 emit("System","build.started",{prompt:seed.idea},0);
 emit("Brief","agent.started",{});
 patch("Brief","brief","data",brief);emit("Brief","agent.completed",{});
 emit("Brand","agent.started",{});emit("Finance","agent.started",{});
 patch("Brand","brand","core",core);
 emit("System","handoff",{from:"Brand",to:["Website","Pitch"],message:"Brand direction unlocked"});
 patch("Finance","finance","assumptions",finance);
 emit("System","handoff",{from:"Finance",to:["Website","Pitch"],message:"Financial assumptions unlocked"});
 emit("Website","agent.started",{});emit("Pitch","agent.started",{});
 patch("Website","website","setup",setup);
 patch("Brand","brand","logo",logo);emit("Brand","agent.completed",{});
 for(let j=0;j<Math.max(sections.length,slides.length);j++){
  if(sections[j])patch("Website","website","sections",sections[j],"append");
  if(slides[j])patch("Pitch","pitch","slides",slides[j],"append");
 }
 emit("Finance","agent.completed",{});emit("Website","agent.completed",{});emit("Pitch","agent.completed",{});
 emit("System","build.completed",{duration_ms:t},500);
 const artifacts=reduceEvents(events,emptyArtifacts());
 const record:BuildRecord={id,slug:seed.name.toLowerCase().replace(/[^a-z0-9]+/g,"-"),prompt:seed.idea,status:"completed",started_at:now,duration_ms:t,artifacts,featured:true,schema_version:1};
 return {record,events};
}
export const examples=seeds.map(buildSeed);
export const exampleById=(id:string)=>examples.find(x=>x.record.id===id||x.record.slug===id);
