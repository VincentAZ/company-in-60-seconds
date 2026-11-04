/** Next's internal Request URL can use localhost behind a reverse proxy. The HTTP
 * Host header identifies the origin the browser actually requested; browsers do
 * not allow scripts to forge it. Do not trust caller-supplied forwarded hosts.
 */
export function requestOrigin(request:Request):string {
 const internal=new URL(request.url);
 const host=request.headers.get('host');
 if(!host)return internal.origin;
 const origin=new URL(internal.protocol+'//'+host);
 if(origin.host.toLowerCase()!==host.toLowerCase()||origin.username||origin.password)throw new Error('Invalid request host');
 return origin.origin;
}
export function sameOrigin(request:Request):boolean {
 try{return request.headers.get('origin')===requestOrigin(request);}catch{return false;}
}
