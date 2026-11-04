import type {Metadata} from "next";
import type {BuildRecord} from "./schema";

export function publicBuildMetadata(record:BuildRecord|null|undefined,kind:"replay"|"website"):Metadata {
 // Never include an unlisted build's prompt, name or artwork in crawler metadata.
 if(!record?.featured)return {title:"Private concept · Company / 60",description:"A private concept in the Company / 60 studio.",robots:{index:false,follow:false},openGraph:{title:"Company / 60",description:"An idea, brought to life.",images:["/opengraph-image"]},twitter:{card:"summary_large_image",title:"Company / 60",description:"An idea, brought to life.",images:["/opengraph-image"]}};
 const core=record.artifacts.brand.core;
 const title=`${core?.name||"Company"} · ${kind==="replay"?"Watch the build replay":"Concept website"}`;
 const description=`${record.id.startsWith("demo-")?"Hand-authored fictional demo. ":"Fictional business concept. "}${core?.tagline||"Explore the brand, website, financial model and pitch."}`;
 const image=`/api/og/${encodeURIComponent(record.id)}`;
 const url=`/${kind==="replay"?"b":"c"}/${encodeURIComponent(record.id)}`;
 return {title,description,alternates:{canonical:url},robots:{index:true,follow:true},openGraph:{type:"website",title,description,url,images:[{url:image,width:1200,height:630,alt:`${core?.name||"Company"} concept preview`}]},twitter:{card:"summary_large_image",title,description,images:[image]}};
}
