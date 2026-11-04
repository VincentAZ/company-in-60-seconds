"use client";
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {ArrowRight} from 'lucide-react';
export function IdeaForm({enabled=false}:{enabled?:boolean}){
 const [idea,setIdea]=useState('');
 const router=useRouter();
 const submit=(e:React.FormEvent)=>{e.preventDefault();if(enabled&&idea.trim().length>=10)router.push('/studio?idea='+encodeURIComponent(idea.trim().slice(0,200))+'&request='+crypto.randomUUID());};
 if(!enabled)return <div className="idea-form"><p style={{margin:0,flex:1,fontSize:14}}>Live generation is not available yet.<br/>Explore twelve complete demo companies.</p><Link className="primary-btn" href="/b/demo-1">Watch a demo <ArrowRight size={18}/></Link></div>;
 return <form className="idea-form" onSubmit={submit}>
  <input className="idea-input" aria-label="Describe a business idea" value={idea} onChange={e=>setIdea(e.target.value)} maxLength={200} minLength={10} required placeholder="e.g. A luxury dog hotel with private suites and video check-ins"/>
  <button className="primary-btn" type="submit">Build my company <ArrowRight size={18}/></button>
 </form>;
}
