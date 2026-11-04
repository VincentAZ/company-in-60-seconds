"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {ArrowRight} from "lucide-react";
export function IdeaForm(){
 const [idea,setIdea]=useState("");
 const router=useRouter();
 const submit=(e:React.FormEvent)=>{e.preventDefault();if(idea.trim().length>=10)router.push("/studio?idea="+encodeURIComponent(idea.trim().slice(0,200)));};
 return <form className="idea-form" onSubmit={submit}>
  <input className="idea-input" aria-label="Describe a business idea" value={idea} onChange={e=>setIdea(e.target.value)} maxLength={200} minLength={10} required placeholder="e.g. A luxury dog hotel with private suites and video check-ins"/>
  <button className="primary-btn" type="submit">Build my company <ArrowRight size={18}/></button>
 </form>;
}
