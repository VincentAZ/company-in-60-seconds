"use client";
import type {Core,Logo as LogoType} from "@/lib/schema";
export function BrandMark({core,logo,size=80,animated=true}:{core?:Core|null;logo?:LogoType|null;size?:number;animated?:boolean}){
 const palette=core?.palette||{bg:"#161D2A",surface:"#233046",ink:"#E7EDF8",primary:"#88E6C4",accent:"#E8AF6E"};
 return <svg aria-label={(core?.name||"Company")+" symbol"} role="img" viewBox="0 0 100 100" width={size} height={size} className={animated?"brand-mark animated":"brand-mark"} style={{flexShrink:0}}>
  {!logo?.shapes?.length?<><rect x="12" y="12" width="76" height="76" rx="22" fill={palette.primary}/><path d="M31 55 L48 70 L73 30" fill="none" stroke={palette.bg} strokeWidth="9" strokeLinecap="round"/></>:
   logo.shapes.map((s,i)=>{
    const fill=palette[s.fill]||palette.primary;
    if(s.kind==="circle")return <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={fill} style={{animationDelay:(i*140)+"ms"}}/>;
    if(s.kind==="rect")return <rect key={i} x={s.x} y={s.y} width={s.width} height={s.height} rx={s.rx} fill={fill} style={{animationDelay:(i*140)+"ms"}}/>;
    if(s.kind==="line")return <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={fill} strokeWidth={s.width} strokeLinecap="round" style={{animationDelay:(i*140)+"ms"}}/>;
    return <path key={i} d={s.d} fill={fill} style={{animationDelay:(i*140)+"ms"}}/>;
   })
  }
 </svg>;
}
