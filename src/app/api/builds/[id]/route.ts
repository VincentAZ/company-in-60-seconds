import {getBuild} from "@/lib/storage";
export const runtime="nodejs";
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const result=await getBuild(id);
 if(!result)return Response.json({error:"Build not found"},{status:404});
 return Response.json(result,{headers:{"Cache-Control":"public, max-age=30"}});
}
