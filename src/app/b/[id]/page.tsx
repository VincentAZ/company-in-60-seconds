import {notFound} from "next/navigation";
import type {Metadata} from "next";
import {getBuild} from "@/lib/storage";
import {getAccessibleBuild} from "@/lib/build-access";
import {publicBuildMetadata} from "@/lib/site-metadata";
import {LiveStudio,ReplayStudio} from "@/components/studio";
export const dynamic="force-dynamic";
export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{
 const {id}=await params;const build=await getBuild(id);
 return publicBuildMetadata(build?.record,"replay");
}
export default async function BuildPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;const item=await getAccessibleBuild(id);
 if(!item)notFound();
 if(item.record.status==="running")return <LiveStudio key={id} prompt={item.record.prompt} existingBuildId={id} initialEvents={item.events} startedAt={item.record.started_at}/>;
 return <ReplayStudio record={item.record} events={item.events}/>;
}
