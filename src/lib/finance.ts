import type {Finance} from "./schema";
export interface Month {month:number;customers:number;revenue:number;costs:number;profit:number;}
export interface Metrics {monthlyPrice:number;year1Revenue:number;year3Revenue:number;year1Profit:number;breakEvenMonth:number|null;}
export function calculateFinance(f:Finance):{months:Month[];metrics:Metrics}{
 const months:Month[]=[];let customers=f.initialCustomers;let cumulative=-f.startupCost;let breakEvenMonth:number|null=null;
 for(let i=1;i<=36;i++){
   if(i>1)customers=Math.max(0,customers*(1+f.monthlyGrowthPct/100)*(1-f.churnPct/100));
   const revenue=customers*f.monthlyPrice;
   const costs=revenue*f.variableCostPct/100+f.monthlyFixedCosts;
   const profit=revenue-costs; cumulative+=profit;
   if(breakEvenMonth===null&&cumulative>=0)breakEvenMonth=i;
   months.push({month:i,customers:Math.round(customers),revenue:Math.round(revenue),costs:Math.round(costs),profit:Math.round(profit)});
 }
 return {months,metrics:{
   monthlyPrice:f.monthlyPrice,
   year1Revenue:months.slice(0,12).reduce((n,m)=>n+m.revenue,0),
   year3Revenue:months.slice(24).reduce((n,m)=>n+m.revenue,0),
   year1Profit:months.slice(0,12).reduce((n,m)=>n+m.profit,0),
   breakEvenMonth
 }};
}
export function money(v:number){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(v);}
