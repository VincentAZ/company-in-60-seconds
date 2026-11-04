import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
export const validBuildId=(id:string)=>/^(?:demo-(?:[1-9]|1[0-2])|[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.test(id);
export const hashToken=(token:string)=>createHash('sha256').update(token).digest('hex');
export const accessCookie=(id:string)=>`build_${id}`;
export function buildToken(id:string){
 const secret=process.env.BUILD_ACCESS_SECRET;
 if(!secret||secret.length<32)throw new Error('Build access secret is not configured');
 return createHmac('sha256',secret).update(id).digest('hex');
}
export function tokenMatches(token:string|undefined,hash:string){
 if(!token||!/^[a-f0-9]{64}$/.test(hash))return false;
 return timingSafeEqual(Buffer.from(hashToken(token),'hex'),Buffer.from(hash,'hex'));
}
export function generationEnabled(){
 return process.env.ENABLE_PUBLIC_BUILDS==='true' && process.env.GENERATION_VERIFIED==='true' &&
 Boolean(process.env.ANTHROPIC_API_KEY&&process.env.SUPABASE_URL&&process.env.SUPABASE_SERVICE_ROLE_KEY)&&
 (process.env.IP_HASH_SALT?.length??0)>=32 && (process.env.BUILD_ACCESS_SECRET?.length??0)>=32;
}
export function hashIp(ip:string){
 const salt=process.env.IP_HASH_SALT;
 if(!salt||salt.length<32)throw new Error('IP salt is not configured');
 return createHmac('sha256',salt).update(ip).digest('hex');
}
