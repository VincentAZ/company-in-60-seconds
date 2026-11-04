"use client";
import {useSearchParams} from "next/navigation";
import {LiveStudio} from "./studio";
export function StudioEntry(){const query=useSearchParams();const prompt=(query.get("idea")||"").slice(0,200);return <LiveStudio prompt={prompt||"A new neighborhood coffee shop"}/>;}
