/** Incremental bounded JSONL parser. Invalid output is never silently skipped. */
export class JsonLinesParser {
 private buffer="";
 private total=0;
 private count=0;
 constructor(private accept:(value:unknown)=>void,private maxLines=10,private maxCharacters=55000,private maxLineCharacters=12000){}
 push(chunk:string){
  this.total+=chunk.length;
  if(this.total>this.maxCharacters)throw new Error("Model output exceeded safety limit");
  this.buffer+=chunk;
  let end:number;
  while((end=this.buffer.indexOf("\n"))!==-1){
   this.line(this.buffer.slice(0,end));this.buffer=this.buffer.slice(end+1);
  }
  if(this.buffer.length>this.maxLineCharacters)throw new Error("Model line exceeded safety limit");
 }
 finish(){this.line(this.buffer);this.buffer="";if(!this.count)throw new Error("No structured patches emitted");}
 private line(raw:string){
  if(raw.length>this.maxLineCharacters)throw new Error("Model line exceeded safety limit");
  const line=raw.trim();if(!line)return;
  if(++this.count>this.maxLines)throw new Error("Too many model patches");
  let value:unknown;
  try{value=JSON.parse(line);}catch{throw new Error("Model returned malformed JSONL");}
  if(!value||Array.isArray(value)||typeof value!=="object")throw new Error("Expected a JSONL object");
  this.accept(value);
 }
}
export function parseModelObject(text:string):unknown{
 if(text.length>12000)throw new Error("Model object exceeded safety limit");
 let value:unknown;
 try{value=JSON.parse(text.trim());}catch{throw new Error("Model returned malformed JSON");}
 if(!value||Array.isArray(value)||typeof value!=="object")throw new Error("Expected a JSON object");
 return value;
}
