"use client";
import {useSearchParams} from "next/navigation";
import {LiveStudio} from "./studio";
export function StudioEntry(){const query=useSearchParams();const prompt=(query.get("idea")||"").slice(0,200);const request=query.get("request")||"";const requestId=/^[a-f0-9-]{36}$/i.test(request)?request:undefined;return <LiveStudio requestId={requestId} key={prompt+":"+requestId} prompt={prompt||"A new neighborhood coffee shop"}/>;}
