import {notFound} from "next/navigation";
import type {Metadata} from "next";
import {getBuild} from "@/lib/storage";
import {ReplayStudio} from "@/components/studio";
export const dynamic="force-dynamic";
export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{
 const {id}=await params;const build=await getBuild(id);
 return {title:(build?.record.artifacts.brand.core?.name||"Company")+" · Watch the build replay",description:build?.record.prompt};
}
export default async function BuildPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;const item=await getBuild(id);
 if(!item)notFound();
 return <ReplayStudio record={item.record} events={item.events}/>;
}
