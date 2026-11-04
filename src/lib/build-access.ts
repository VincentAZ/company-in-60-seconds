import {cookies} from 'next/headers';
import {getBuild} from './storage';
import {accessCookie} from './build-security';
export async function getAccessibleBuild(id:string){
 return getBuild(id,{accessToken:(await cookies()).get(accessCookie(id))?.value});
}
