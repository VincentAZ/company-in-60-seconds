import type {Artifacts,BuildEvent,BuildRecord,Core,Finance,Section,Slide,WebsiteSetup,Logo,Brief} from "./schema";

type Seed = {
 idea:string; name:string; tagline:string; industry:string; audience:string;
 archetype:WebsiteSetup["archetype"]; font:Core["font"]; voice:string;
 colors:[string,string,string,string,string]; finance:Omit<Finance,"currency">;
 benefits:[string,string][]; steps:[string,string][]; problem:string; logo:Logo;
};
const finance=(archetype:Finance["archetype"],monthlyPrice:number,initialCustomers:number,monthlyGrowthPct:number,churnPct:number,variableCostPct:number,monthlyFixedCosts:number,startupCost:number,rationale:string):Omit<Finance,"currency">=>({archetype,monthlyPrice,initialCustomers,monthlyGrowthPct,churnPct,variableCostPct,monthlyFixedCosts,startupCost,rationale});
export const seeds:Seed[]=[
 {
  idea:"A luxury pet hotel with video suites and private playtime",name:"Paw Palace",tagline:"Five-star stays for four-legged guests.",industry:"Pet hospitality",audience:"Pet owners planning overnight travel",archetype:"luxury",font:"editorial",voice:"Reassuring, attentive, quietly luxurious",colors:["#111722","#1C2634","#F6F3E9","#E8B879","#80B3AA"],
  finance:finance("capacity",95,70,6,2,35,4200,28000,"Illustrative booking-nights per month at $95 each; assumes room capacity expands with demand. Validate occupancy, staffing and premises costs."),
  benefits:[["Private suites","A tranquil retreat built around their routine."],["Daily adventures","Supervised playtime, every single day."],["Stay connected","A window into every tail wag."]],steps:[["Meet the team","Share routines, dietary needs and favorite games."],["Reserve a suite","Choose your guest's dates and care preferences."],["Check in together","Settle in, then follow their stay from afar."]],problem:"Travel should not mean worrying about the guest you leave behind.",
  logo:{shapes:[{kind:"path",d:"M20 42 L20 24 L38 36 L50 18 L62 36 L80 24 L80 42 Z",fill:"primary"},{kind:"circle",cx:50,cy:65,r:21,fill:"primary"},{kind:"circle",cx:50,cy:65,r:8,fill:"accent"}]}
 },
 {
  idea:"A zero-waste coffee subscription for remote workers",name:"Bloom & Bean",tagline:"Good coffee. Lighter footprint.",industry:"Coffee",audience:"Remote workers who brew coffee at home",archetype:"organic",font:"warm",voice:"Earthy, inviting, practical",colors:["#F1EEDB","#E2E7CE","#233A2B","#365C40","#DB794D"],
  finance:finance("subscription",29,210,9,3,55,2200,8000,"Illustrative monthly coffee subscriptions; variable costs include beans, roasting, packaging and shipping. Return rates need validation."),
  benefits:[["Roasted to order","Small-batch flavor delivered fresh."],["Refill, repeat","Returnable packaging makes the next cup simpler."],["Find your ritual","Choose the roast and rhythm that suit your desk."]],steps:[["Choose your roast","Tell us how you brew and what you enjoy."],["Make your first cup","Fresh beans arrive on your schedule."],["Return and refill","Send your empty container back for another round."]],problem:"A daily coffee habit should not leave a daily pile of packaging.",
  logo:{shapes:[{kind:"path",d:"M50 84 C12 70 14 22 48 16 C76 18 91 59 50 84 Z",fill:"primary"},{kind:"path",d:"M46 72 C35 52 68 42 53 28 L58 27 C76 44 44 56 52 72 Z",fill:"surface"},{kind:"circle",cx:78,cy:23,r:9,fill:"accent"}]}
 },
 {
  idea:"An AI-powered booking assistant for independent salons",name:"LumaDesk",tagline:"Your front desk, beautifully handled.",industry:"Salon software",audience:"Independent salon owners and stylists",archetype:"tech",font:"technical",voice:"Clear, calm, capable",colors:["#0F1024","#242241","#F6F2FF","#9387F9","#EEA6D3"],
  finance:finance("subscription",89,110,12,2,14,6200,18000,"Illustrative salon subscriptions. Variable costs cover messages and model usage; acquisition spend and support must be researched."),
  benefits:[["Always on","Help clients request appointments after hours."],["Gentle reminders","Give your clients a timely nudge."],["Your voice","Thoughtful replies that sound like your salon."]],steps:[["Connect your calendar","Start with the services and times you offer."],["Set the tone","Teach your assistant your salon's voice."],["Stay in control","Review requests and keep doing your best work."]],problem:"Every interrupted appointment is time a stylist cannot give a client.",
  logo:{shapes:[{kind:"rect",x:18,y:15,width:20,height:69,rx:10,fill:"primary"},{kind:"rect",x:18,y:64,width:65,height:20,rx:10,fill:"primary"},{kind:"circle",cx:68,cy:32,r:16,fill:"accent"}]}
 },
 {
  idea:"A traveling pop-up science museum for kids",name:"WonderCart",tagline:"Big discoveries. Tiny scientists.",industry:"Education",audience:"Primary schools and curious families",archetype:"playful",font:"playful",voice:"Bright, curious, encouraging",colors:["#FFF8E8","#FDECC5","#142F4C","#EB5E40","#3D9DB1"],
  finance:finance("capacity",350,35,7,1,25,6500,21000,"Illustrative paid group visits per month. Growth assumes additional educators and kits; transport, setup time and seasonal demand need testing."),
  benefits:[["Hands-on wonder","Experiments that make ideas click."],["We bring everything","A whole discovery lab in one visit."],["Made for young minds","Age-appropriate activities with room to explore."]],steps:[["Pick an adventure","Choose a science theme for your group."],["Clear a little space","We arrive with experiments and an educator."],["Follow the questions","Make, test and discover together."]],problem:"A great science experience should not require a school bus and a long journey.",
  logo:{shapes:[{kind:"rect",x:17,y:27,width:66,height:44,rx:10,fill:"primary"},{kind:"circle",cx:30,cy:79,r:8,fill:"ink"},{kind:"circle",cx:70,cy:79,r:8,fill:"ink"},{kind:"path",d:"M50 31 L55 43 L68 45 L58 54 L60 67 L50 60 L39 67 L42 54 L32 45 L45 43 Z",fill:"surface"}]}
 },
 {
  idea:"A member-supported local newsletter for overlooked neighborhood stories",name:"Fieldnote",tagline:"The stories around the corner.",industry:"Local journalism",audience:"Residents curious about their neighborhood",archetype:"editorial",font:"editorial",voice:"Observant, independent, neighborly",colors:["#F5F1E7","#E6DED0","#25271F","#414B37","#BD573D"],
  finance:finance("subscription",12,480,5,3,8,5200,6000,"Illustrative reader memberships, not an audience forecast. Fixed costs assume part-time reporting; sponsorship revenue is excluded."),
  benefits:[["Close to home","People and places worth paying attention to."],["Reader supported","A concept built around paying members."],["One thoughtful edition","A weekly read that respects your time."]],steps:[["Find your neighborhood","Choose the edition closest to home."],["Read the weekly note","Meet the people shaping your streets."],["Join the conversation","Suggest the story we should explore next."]],problem:"Neighborhood life rarely fits into the headlines of a city-wide news feed.",
  logo:{shapes:[{kind:"rect",x:21,y:14,width:58,height:73,rx:3,fill:"primary"},{kind:"rect",x:31,y:27,width:36,height:7,rx:1,fill:"surface"},{kind:"rect",x:31,y:43,width:27,height:5,rx:1,fill:"surface"},{kind:"rect",x:31,y:56,width:32,height:5,rx:1,fill:"surface"},{kind:"circle",cx:69,cy:74,r:13,fill:"accent"}]}
 },
 {
  idea:"A design-led shop restoring secondhand furniture for compact city homes",name:"Second Loop",tagline:"Good design deserves another life.",industry:"Circular furniture",audience:"City dwellers furnishing compact homes",archetype:"luxury",font:"classic",voice:"Considered, tactile, quietly confident",colors:["#242925","#39423B","#F4EFE3","#CAB595","#CB7654"],
  finance:finance("transactional",480,24,4,0,48,4200,18000,"Illustrative furniture purchases each month; average selling price includes restoration. Inventory availability and workshop capacity constrain growth."),
  benefits:[["Found with care","Vintage forms chosen for smaller spaces."],["Restored to belong","Repair that preserves each piece's character."],["A clearer history","Condition and restoration notes on every piece."]],steps:[["Browse the collection","Find a piece with the right proportions."],["See its story","Explore dimensions, repairs and materials."],["Make it yours","Arrange a delivery and give it a new chapter."]],problem:"Small homes deserve lasting furniture with more character than a flat-pack default.",
  logo:{shapes:[{kind:"path",d:"M28 27 C6 49 22 82 47 78 L47 64 C31 66 24 45 37 36 Z",fill:"primary"},{kind:"path",d:"M72 73 C94 51 78 18 53 22 L53 36 C69 34 76 55 63 64 Z",fill:"accent"}]}
 },
 {
  idea:"A seasonal balcony garden subscription for first-time urban growers",name:"Sunroom",tagline:"A little space. A greener day.",industry:"Urban gardening",audience:"Apartment residents learning to grow",archetype:"organic",font:"warm",voice:"Patient, optimistic, down to earth",colors:["#F4F0DA","#E2E5CA","#2C3826","#577448","#D69547"],
  finance:finance("subscription",49,85,8,2,40,2700,9000,"Illustrative monthly garden memberships with seasonal kit costs averaged across the year. Plant loss, shipping and retention need research."),
  benefits:[["Matched to your light","Start with plants suited to your balcony."],["Small steps, real roots","Simple guidance for a first growing season."],["Season by season","A growing rhythm that follows the weather."]],steps:[["Map your sunlight","Tell us about the space you have."],["Open your growing kit","Set up the season's plants and supplies."],["Watch it take root","Follow weekly care notes and share questions."]],problem:"A city balcony can grow more than a collection of empty pots.",
  logo:{shapes:[{kind:"circle",cx:67,cy:28,r:15,fill:"accent"},{kind:"path",d:"M49 78 L49 47 C20 47 18 26 21 20 C45 19 56 33 49 47 C48 38 65 40 79 37 C80 56 65 62 52 60 L52 78 Z",fill:"primary"},{kind:"rect",x:29,y:76,width:45,height:9,rx:4,fill:"primary"}]}
 },
 {
  idea:"An after-hours mobile bicycle repair service for city commuters",name:"Night Shift",tagline:"Back on the road by morning.",industry:"Bicycle repair",audience:"Commuters who cannot visit a daytime workshop",archetype:"bold",font:"modern",voice:"Direct, energetic, dependable",colors:["#151A1B","#293235","#F4F6EC","#D7F564","#70BED1"],
  finance:finance("capacity",65,140,6,1,35,3800,16000,"Illustrative repair bookings per month, excluding parts sold separately. Technician hours and service radius must limit actual capacity."),
  benefits:[["After your workday","Evening appointments that fit the commute."],["We come to the bike","A mobile workshop at your building."],["Know the job","Approve the repair scope before work starts."]],steps:[["Describe the problem","Tell us what is slowing you down."],["Choose an evening","Book a stop in your neighborhood."],["Roll out ready","Get a repair summary and care pointers."]],problem:"A broken bike should not cost a commuter a day away from work.",
  logo:{shapes:[{kind:"circle",cx:27,cy:65,r:17,fill:"primary"},{kind:"circle",cx:73,cy:65,r:17,fill:"primary"},{kind:"circle",cx:27,cy:65,r:10,fill:"surface"},{kind:"path",d:"M57 12 L36 46 L51 46 L42 72 L70 34 L53 34 Z",fill:"accent"}]}
 },
 {
  idea:"A quiet neighborhood coworking room with bookable focus desks",name:"Quiet Current",tagline:"Make room for your best work.",industry:"Coworking",audience:"Remote workers seeking a quiet desk nearby",archetype:"luxury",font:"editorial",voice:"Spacious, calm, intentional",colors:["#EAF0F0","#D9E4E4","#273C44","#406674","#B37C5F"],
  finance:finance("capacity",24,280,4,2,12,4800,38000,"Illustrative desk-days per month. Growth assumes sufficient desks and opening days; lease, utilization and staffing require local research."),
  benefits:[["A quieter default","Focus rooms with clear shared expectations."],["Near where you live","A shorter journey to a productive day."],["A day at a time","Book the desk you need without a long contract."]],steps:[["Choose your day","Find a desk when you need some space."],["Settle into quiet","Check in and make the desk your own."],["Leave work there","Close your laptop and take the evening home."]],problem:"Working from home should not mean working through every household distraction.",
  logo:{shapes:[{kind:"path",d:"M15 36 C35 14 65 58 85 36 L85 47 C65 69 35 25 15 47 Z",fill:"primary"},{kind:"path",d:"M15 57 C35 35 65 79 85 57 L85 68 C65 90 35 46 15 68 Z",fill:"accent"}]}
 },
 {
  idea:"A neighborhood marketplace matching online returns with local collection shops",name:"Parcel Pact",tagline:"Returns, around the corner.",industry:"Returns logistics",audience:"Online shoppers and independent neighborhood shops",archetype:"tech",font:"technical",voice:"Useful, precise, approachable",colors:["#11232B","#203D47","#ECF8F5","#6AD8BA","#F6BA70"],
  finance:finance("marketplace",4,2200,8,2,30,8500,25000,"Illustrative net platform fee per completed return, not parcel value or gross merchandise volume. Merchant payouts and demand need validation."),
  benefits:[["A local drop-off","Find a participating shop near your routine."],["One clear handover","Follow the return from scan to collection."],["More neighborhood visits","Give local shops another reason to be discovered."]],steps:[["Find a collection point","Choose a participating shop on your route."],["Bring your return","Hand over an eligible, labeled parcel."],["Follow the next step","Track the collection through your account."]],problem:"Sending a parcel back should fit into a walk around the block.",
  logo:{shapes:[{kind:"path",d:"M50 14 L83 32 L83 68 L50 87 L17 68 L17 32 Z",fill:"primary"},{kind:"path",d:"M20 32 L50 49 L80 32 L80 40 L54 55 L54 81 L46 81 L46 55 L20 40 Z",fill:"ink"},{kind:"path",d:"M37 23 L69 41 L69 53 L60 58 L60 46 L28 28 Z",fill:"accent"}]}
 },
 {
  idea:"A monthly illustrated postcard adventure that introduces children to world geography",name:"Little Atlas",tagline:"Big world. Small envelope.",industry:"Children's publishing",audience:"Families exploring geography together",archetype:"playful",font:"playful",voice:"Adventurous, imaginative, welcoming",colors:["#FFF0E3","#F5D9BD","#3C354A","#AF5D78","#4C9EAA"],
  finance:finance("subscription",18,260,7,4,42,2200,7000,"Illustrative monthly family subscriptions. Printing, illustration, postage and cancellation rates need validation before launch."),
  benefits:[["An adventure in the post","A new illustrated place to explore each month."],["Make the map yours","Collect postcards and connect the journey."],["Explore together","Questions and activities for curious families."]],steps:[["Begin the journey","Choose an age range for your explorer."],["Open the envelope","Meet a new place through art and stories."],["Follow your curiosity","Find it on the map and try an activity."]],problem:"Learning about the world can begin somewhere more inviting than another screen.",
  logo:{shapes:[{kind:"circle",cx:50,cy:50,r:35,fill:"accent"},{kind:"path",d:"M49 18 L64 37 L83 43 L64 55 L57 82 L43 61 L18 54 L36 42 Z",fill:"surface"},{kind:"circle",cx:50,cy:50,r:10,fill:"primary"}]}
 },
 {
  idea:"A neighborhood clothing alteration studio with transparent online booking",name:"Good Measure",tagline:"Keep the clothes. Find the fit.",industry:"Clothing alterations",audience:"People making their existing wardrobe work better",archetype:"editorial",font:"classic",voice:"Skilled, straightforward, personal",colors:["#F3EDE4","#E4D8C8","#343135","#765363","#BC8B56"],
  finance:finance("capacity",42,180,5,1,18,4800,14000,"Illustrative alteration bookings at an average job price. Tailor hours, garment complexity and repeat visits determine real capacity."),
  benefits:[["See the possibilities","A fitting conversation before the first stitch."],["Clear job estimates","Know the work and timing before you commit."],["Wear it again","Keep familiar favorites in your everyday wardrobe."]],steps:[["Book a fitting","Tell us about the piece you want to adjust."],["Agree the details","Review the fit, work and estimated price."],["Try it on again","Collect your piece and check the finish."]],problem:"A piece that almost fits often spends its best years at the back of a wardrobe.",
  logo:{shapes:[{kind:"path",d:"M19 76 L19 24 L34 24 L50 48 L66 24 L81 24 L81 76 L66 76 L66 48 L50 69 L34 48 L34 76 Z",fill:"primary"},{kind:"line",x1:19,y1:85,x2:81,y2:85,width:4,fill:"accent"}]}
 }
];

function buildSeed(seed:Seed,i:number):{record:BuildRecord;events:BuildEvent[]} {
 const id=`demo-${i+1}`; let t=0; const events:BuildEvent[]=[];
 const emit=(agent:BuildEvent["agent"],type:BuildEvent["type"],payload:Record<string,unknown>,advance=700)=>{
  t+=advance;events.push({build_id:id,seq:events.length+1,t_ms:t,agent,type,payload});
 };
 const patch=(agent:BuildEvent["agent"],artifact:string,path:string,value:unknown,op="set")=>emit(agent,"artifact.patch",{artifact,path,value,op},850);
 const palette={bg:seed.colors[0],surface:seed.colors[1],ink:seed.colors[2],primary:seed.colors[3],accent:seed.colors[4]};
 const core:Core={name:seed.name,tagline:seed.tagline,description:seed.idea,industry:seed.industry,voice:seed.voice,font:seed.font,palette};
 const assumptions:Finance={...seed.finance,currency:"USD"};
 const brief:Brief={idea:seed.idea,audience:seed.audience,offering:seed.industry,category:seed.industry,positioning:seed.tagline,archetype:seed.archetype,allowed:true,reason:"Hand-authored fictional demonstration"};
 const setup:WebsiteSetup={archetype:seed.archetype,domainSuggestion:seed.name.toLowerCase().replace(/[^a-z]/g,"")+".example",navigation:["Why us","How it works","Pricing"],radius:seed.archetype==="playful"?"round":seed.archetype==="editorial"?"sharp":"medium",density:"airy"};
 const sections:Section[]=[
  {type:"hero",variant:seed.archetype==="editorial"?"editorial":"split",kicker:seed.industry,headline:seed.tagline,body:seed.idea+". A fictional concept for "+seed.audience.toLowerCase()+".",items:[],cta:"Explore "+seed.name},
  {type:"benefits",variant:"cards",kicker:"WHY "+seed.name.toUpperCase(),headline:seed.benefits[0][0]+". And more.",body:"Considered details for "+seed.audience.toLowerCase()+".",items:seed.benefits.map(([title,body])=>({title,body})),cta:"Explore the details"},
  {type:"steps",variant:"editorial",kicker:"THE EXPERIENCE",headline:"Here's how it could work.",body:"A simple path from curiosity to a first experience.",items:seed.steps.map(([title,body])=>({title,body})),cta:"Get started"},
  {type:"pricing",variant:"minimal",kicker:"ILLUSTRATIVE PRICING",headline:"A starting point for the model.",body:seed.finance.archetype==="marketplace"?"The modeled price is our platform fee per transaction, not the value of the parcel.":"An assumed price for this fictional concept. Change the financial model to explore another scenario.",items:[],cta:"Try the concept"},
  {type:"faq",variant:"cards",kicker:"THE DETAILS",headline:"Before you explore.",body:"A few details about this concept.",items:[{title:"Is this a real business?",body:"No. This is a fictional, hand-authored demonstration of the Company / 60 studio."},{title:"Can I place an order?",body:"There are no real orders, bookings or subscriptions here. The form demonstrates an interaction only."}],cta:"Explore the concept"},
  {type:"cta",variant:"bold",kicker:"IMAGINE THE NEXT STEP",headline:seed.tagline,body:"Explore the idea behind "+seed.name+" with the demonstration below.",items:[],cta:"Try the demo"}
 ];
 const slides:Slide[]=[
  {layout:"statement",eyebrow:"FICTIONAL CONCEPT",title:seed.name,body:seed.tagline,bullets:[],metricKeys:[]},
  {layout:"problem",eyebrow:"THE HYPOTHESIS",title:seed.problem,body:"A problem to investigate with "+seed.audience.toLowerCase()+". No market validation has been performed.",bullets:[],metricKeys:[]},
  {layout:"solution",eyebrow:"THE PROPOSED EXPERIENCE",title:seed.tagline,body:seed.idea,bullets:seed.benefits.map(a=>a[0]),metricKeys:[]},
  {layout:"metrics",eyebrow:"ASSUMPTION-BASED",title:"A model to challenge",body:"Illustrative scenario, not verified performance. Change assumptions in the Finance tab to update these values.",bullets:[],metricKeys:["monthlyPrice","year1Revenue","year3Revenue"]},
  {layout:"roadmap",eyebrow:"VALIDATION BEFORE SCALE",title:"Start small. Learn something.",body:"A proposed roadmap, not a record of progress.",bullets:["Interview prospective customers","Test the first experience: "+seed.steps[0][0].toLowerCase(),"Measure delivery costs and repeat demand","Revise assumptions before scaling"],metricKeys:[]},
  {layout:"closing",eyebrow:"AN IDEA WORTH EXPLORING",title:seed.name,body:seed.tagline,bullets:["Fictional company · illustrative financials","Hand-authored demo event stream"],metricKeys:[]}
 ];
 // Author the expected end-state independently of the event reducer. Tests verify the timeline reproduces it.
 const artifacts:Artifacts={brief,brand:{core,logo:seed.logo},finance:assumptions,website:{setup,sections},pitch:{slides}};
 emit("System","build.started",{prompt:seed.idea,source:"fixture",message:"Hand-authored demonstration event stream"},0);
 emit("Brief","agent.started",{});patch("Brief","brief","data",brief);emit("Brief","agent.completed",{});
 emit("Brand","agent.started",{});emit("Finance","agent.started",{});
 patch("Brand","brand","core",core);
 emit("System","handoff",{from:"Brand",to:["Website","Pitch"],message:"Brand direction unlocked; waiting for finance"});
 patch("Finance","finance","assumptions",assumptions);emit("Finance","agent.completed",{});
 emit("System","handoff",{from:"Finance",to:["Website","Pitch"],message:"Brand direction and financial assumptions ready"});
 emit("Website","agent.started",{});emit("Pitch","agent.started",{});patch("Website","website","setup",setup);
 patch("Brand","brand","logo",seed.logo);emit("Brand","agent.completed",{});
 for(let j=0;j<Math.max(sections.length,slides.length);j++){
  if(sections[j])patch("Website","website","sections",sections[j],"append");
  if(slides[j])patch("Pitch","pitch","slides",slides[j],"append");
 }
 emit("Website","agent.completed",{});emit("Pitch","agent.completed",{});
 emit("System","build.completed",{duration_ms:t+500,status:"completed"},500);
 const record:BuildRecord={id,slug:seed.name.toLowerCase().replace(/[^a-z0-9]+/g,"-"),prompt:seed.idea,status:"completed",started_at:"2026-11-04T18:00:00.000Z",duration_ms:t,artifacts:structuredClone(artifacts),featured:true,schema_version:1};
 return {record,events};
}
export const examples=seeds.map(buildSeed);
export const exampleById=(id:string)=>examples.find(x=>x.record.id===id||x.record.slug===id);
