import {notFound} from "next/navigation";
import Link from "next/link";
import type {Metadata} from "next";
import {getBuild} from "@/lib/storage";
import {getAccessibleBuild} from "@/lib/build-access";
import {publicBuildMetadata} from "@/lib/site-metadata";
import {GeneratedSite} from "@/components/site";
export const dynamic="force-dynamic";
export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{
 const {id}=await params;const build=await getBuild(id);
 return publicBuildMetadata(build?.record,"website");
}
export default async function SitePage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;const item=await getAccessibleBuild(id);
 if(!item)notFound();
 const running=item.record.status==="running";
 const hasWebsite=Boolean(item.record.artifacts.brand.core&&item.record.artifacts.website.sections.length);
 if(running||!hasWebsite)return <main className="studio-shell" data-build-state={running?"running":"unavailable"}>
  <div className="studio-top"><Link href="/" className="brand-link">Company / 60</Link></div>
  <div className="preview-empty"><h1>{running?"Your website is still building":"No website was completed"}</h1><p>{running?"Follow the live build to see each saved section arrive. The concept website will be available when the build finishes.":"This build stopped before a website was ready. Its saved events preserve the available artifacts and the actual outcome."}</p><Link className="small-btn" href={"/b/"+id}>{running?"Follow the live build":"View the recorded build"}</Link></div>
 </main>;
 return <GeneratedSite artifacts={item.record.artifacts}/>;
}
