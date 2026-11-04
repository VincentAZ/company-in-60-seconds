import {requestOrigin,sameOrigin} from '@/lib/request-origin';
import {cookies} from 'next/headers';
import {getBuild} from '@/lib/storage';
import {accessCookie} from '@/lib/build-security';
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 if(!sameOrigin(req))return Response.json({error:'Same-origin requests required.'},{status:403});
 const origin=requestOrigin(req);
 const {id}=await params;const token=(await cookies()).get(accessCookie(id))?.value;
 const build=await getBuild(id,{accessToken:token});
 if(!build)return Response.json({error:'Build not found'},{status:404});
 const url=build.record.featured?`${origin}/b/${id}`:`${origin}/share/${id}?token=${encodeURIComponent(token!)}`;
 return Response.json({url},{headers:{'Cache-Control':'private, no-store'}});
}
