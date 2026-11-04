import {notFound} from "next/navigation";
import type {Metadata} from "next";
import {getBuild} from "@/lib/storage";
import {GeneratedSite} from "@/components/site";
export const dynamic="force-dynamic";
export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{
 const {id}=await params;const build=await getBuild(id);
 return {title:(build?.record.artifacts.brand.core?.name||"Generated company")+" · Concept Website",description:build?.record.artifacts.brand.core?.tagline||"AI-generated concept website"};
}
export default async function SitePage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;const item=await getBuild(id);
 if(!item)notFound();return <GeneratedSite artifacts={item.record.artifacts}/>;
}
