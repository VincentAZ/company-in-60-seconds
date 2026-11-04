import {getBuild} from '@/lib/storage';
import {accessCookie} from '@/lib/build-security';
import {cookies} from 'next/headers';
export const runtime='nodejs';
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const after=new URL(req.url).searchParams.get('after')??'0';
 if(!/^\d{1,6}$/.test(after))return Response.json({error:'Invalid event cursor'},{status:400});
 try{
  const result=await getBuild(id,{accessToken:(await cookies()).get(accessCookie(id))?.value,after:Number(after)});
  if(!result)return Response.json({error:'Build not found'},{status:404});
  return Response.json(result,{headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }catch{return Response.json({error:'Saved events are temporarily unavailable.'},{status:503});}
}
