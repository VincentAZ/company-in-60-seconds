import {Suspense} from 'react';
import Link from 'next/link';
import {StudioEntry} from '@/components/studio-entry';
import {generationEnabled} from '@/lib/build-security';
export const dynamic='force-dynamic';
export default function StudioPage(){
 if(!generationEnabled())return <main className="shell" style={{paddingTop:80,paddingBottom:80}}><p className="eyebrow">COMPANY / 60</p><h1>Live generation is not available yet.</h1><p>The gallery contains twelve hand-authored demonstrations you can replay and explore.</p><Link className="primary-btn" href="/b/demo-1">Watch a demo replay</Link></main>;
 return <Suspense fallback={<div style={{padding:55}}>Preparing the studio…</div>}><StudioEntry/></Suspense>;
}
