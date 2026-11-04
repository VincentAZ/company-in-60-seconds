import {NextResponse} from 'next/server';
import {getBuild} from '@/lib/storage';
import {accessCookie,validBuildId} from '@/lib/build-security';
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;const token=new URL(req.url).searchParams.get('token')??'';
 if(!validBuildId(id)||!/^[a-f0-9]{64}$/.test(token))return new Response('Build not found',{status:404});
 const build=await getBuild(id,{accessToken:token});
 if(!build)return new Response('Build not found',{status:404});
 const response=NextResponse.redirect(new URL('/b/'+id,req.url));
 response.cookies.set(accessCookie(id),token,{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',path:'/',maxAge:2592000});
 response.headers.set('Cache-Control','private, no-store');response.headers.set('Referrer-Policy','no-referrer');response.headers.set('X-Robots-Tag','noindex, nofollow');
 return response;
}
