import {ImageResponse} from "next/og";
import {getBuild} from "@/lib/storage";
export const runtime="nodejs";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;const item=await getBuild(id);
 if(!item?.record.featured)return new Response("Not found",{status:404});
 const core=item.record.artifacts.brand.core;
 if(!core)return new Response("Not found",{status:404});
 const p=core.palette;
 return new ImageResponse(<div style={{display:"flex",flexDirection:"column",justifyContent:"space-between",width:"100%",height:"100%",padding:60,background:p.bg,color:p.ink,fontFamily:"sans-serif"}}>
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:22}}><span>COMPANY / 60</span><span style={{color:p.primary}}>{id.startsWith("demo-")?"HAND-AUTHORED DEMO":"FICTIONAL CONCEPT"}</span></div>
  <div style={{display:"flex",gap:45,alignItems:"center"}}><div style={{display:"flex",width:165,height:165,flexShrink:0,borderRadius:40,background:p.surface,alignItems:"center",justifyContent:"center"}}><svg width={140} height={140} viewBox="0 0 100 100">{item.record.artifacts.brand.logo?.shapes.map((shape,i)=>{const fill=p[shape.fill];if(shape.kind==="circle")return <circle key={i} cx={shape.cx} cy={shape.cy} r={shape.r} fill={fill}/>;if(shape.kind==="rect")return <rect key={i} x={shape.x} y={shape.y} width={shape.width} height={shape.height} rx={shape.rx} fill={fill}/>;if(shape.kind==="line")return <line key={i} x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} stroke={fill} strokeWidth={shape.width}/>;return <path key={i} d={shape.d} fill={fill}/>;})}</svg></div><div style={{display:"flex",flexDirection:"column",gap:16}}><div style={{fontSize:68,fontWeight:800,letterSpacing:-2}}>{core.name}</div><div style={{fontSize:30,maxWidth:800,lineHeight:1.4}}>{core.tagline}</div></div></div>
  <div style={{display:"flex",justifyContent:"space-between",fontSize:22,color:p.primary}}><span>{core.industry}</span><span>Brand · Website · Finance · Pitch →</span></div>
 </div>,{width:1200,height:630,headers:{"Cache-Control":"public, max-age=3600, stale-while-revalidate=86400"}});
}
