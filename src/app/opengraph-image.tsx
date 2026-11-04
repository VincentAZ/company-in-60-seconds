import {ImageResponse} from "next/og";
export const alt="Company / 60 — one idea, four artifacts";
export const size={width:1200,height:630};
export const contentType="image/png";
export default function Image(){
 return new ImageResponse(<div style={{display:"flex",flexDirection:"column",justifyContent:"space-between",width:"100%",height:"100%",padding:65,background:"#0C1420",color:"#F0F5F9",fontFamily:"sans-serif"}}>
  <div style={{fontSize:24,color:"#A2EDCD",letterSpacing:4}}>COMPANY / 60</div>
  <div style={{display:"flex",flexDirection:"column",fontSize:82,fontWeight:800,lineHeight:1.08,letterSpacing:-3}}><span>One idea.</span><span style={{color:"#A2EDCD"}}>A whole company.</span><span>Before your eyes.</span></div>
  <div style={{display:"flex",justifyContent:"space-between",fontSize:23,color:"#A9B8CA"}}><span>Brand · Website · Finance · Pitch</span><span>12 fictional demos to explore →</span></div>
 </div>,size);
}
