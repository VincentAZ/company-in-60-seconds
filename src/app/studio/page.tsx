import {Suspense} from "react";
import {StudioEntry} from "@/components/studio-entry";
export default function StudioPage(){return <Suspense fallback={<div style={{padding:55}}>Preparing the studio…</div>}><StudioEntry/></Suspense>}
