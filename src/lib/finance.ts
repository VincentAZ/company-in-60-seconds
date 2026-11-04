import {financeSchema} from "./schema";
import type {Finance} from "./schema";
export interface Month {month:number;customers:number;revenue:number;costs:number;profit:number;cumulativeCash:number;}
export interface Metrics {monthlyPrice:number;year1Revenue:number;year3Revenue:number;year1Profit:number;breakEvenMonth:number|null;}
const cents=(value:number)=>Math.round((value+Number.EPSILON)*100)/100;
/**
 * A deterministic illustrative volume model. `customers` means active subscribers,
 * monthly purchases, bookings, or marketplace transactions according to archetype.
 * Marketplace price is net platform revenue per transaction, never gross merchandise value.
 * Growth is applied before churn from month two. Capacity is assumed expandable;
 * this model does not claim to enforce physical inventory, desk or staff limits.
 * Operating profit excludes startup cost; cumulative cash and break-even include it.
 */
export function calculateFinance(input:Finance):{months:Month[];metrics:Metrics}{
 const f=financeSchema.parse(input);
 const months:Month[]=[];let volume=f.initialCustomers;let cumulative=-cents(f.startupCost);let breakEvenMonth:number|null=null;
 for(let i=1;i<=36;i++){
   if(i>1)volume=Math.max(0,volume*(1+f.monthlyGrowthPct/100)*(1-f.churnPct/100));
   const revenue=cents(volume*f.monthlyPrice);
   const costs=cents(revenue*f.variableCostPct/100+f.monthlyFixedCosts);
   const profit=cents(revenue-costs);cumulative=cents(cumulative+profit);
   if(breakEvenMonth===null&&cumulative>=0)breakEvenMonth=i;
   months.push({month:i,customers:cents(volume),revenue,costs,profit,cumulativeCash:cumulative});
 }
 return {months,metrics:{
   monthlyPrice:f.monthlyPrice,
   year1Revenue:cents(months.slice(0,12).reduce((n,m)=>n+m.revenue,0)),
   year3Revenue:cents(months.slice(24,36).reduce((n,m)=>n+m.revenue,0)),
   year1Profit:cents(months.slice(0,12).reduce((n,m)=>n+m.profit,0)),
   breakEvenMonth
 }};
}
export function money(v:number){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(v);}
