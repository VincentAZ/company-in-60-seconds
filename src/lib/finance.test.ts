import assert from "node:assert/strict";
import test from "node:test";
import {calculateFinance} from "./finance";
import type {Finance} from "./schema";
const base:Finance={archetype:"subscription",monthlyPrice:10,initialCustomers:100,monthlyGrowthPct:0,churnPct:0,variableCostPct:20,monthlyFixedCosts:300,startupCost:1200,currency:"USD",rationale:"A controlled scenario for independent arithmetic checks."};

test("36-month model reconciles revenue, costs, profit and cash with startup recovery",()=>{
 const result=calculateFinance(base);
 assert.equal(result.months.length,36);
 assert.deepEqual(result.months[0],{month:1,customers:100,revenue:1000,costs:500,profit:500,cumulativeCash:-700});
 assert.deepEqual(result.months[35],{month:36,customers:100,revenue:1000,costs:500,profit:500,cumulativeCash:16800});
 assert.deepEqual(result.metrics,{monthlyPrice:10,year1Revenue:12000,year3Revenue:12000,year1Profit:6000,breakEvenMonth:3});
 assert.equal(base.initialCustomers,100);
});

test("growth is gross before churn and year three is months 25–36",()=>{
 const {months,metrics}=calculateFinance({...base,monthlyGrowthPct:10,churnPct:5});
 assert.equal(months[1].customers,104.5);
 assert.equal(months[1].revenue,1045);
 assert.equal(months[2].revenue,1092.03);
 const expected=Array.from({length:12},(_,i)=>Math.round(1000*1.045**(i+24)*100)/100).reduce((a,b)=>a+b,0);
 assert.equal(metrics.year3Revenue,Math.round(expected*100)/100);
});

test("costs and profits retain cents instead of rounding every month to whole dollars",()=>{
 const {months,metrics}=calculateFinance({...base,monthlyPrice:10.05,initialCustomers:3,variableCostPct:33,monthlyFixedCosts:0,startupCost:0});
 assert.deepEqual(months[0],{month:1,customers:3,revenue:30.15,costs:9.95,profit:20.2,cumulativeCash:20.2});
 assert.equal(metrics.year1Revenue,361.8);
 assert.equal(metrics.year1Profit,242.4);
 assert.equal(metrics.breakEvenMonth,1);
});

test("loss-making and declining scenarios never invent a break-even point",()=>{
 const {months,metrics}=calculateFinance({...base,monthlyGrowthPct:-10,churnPct:20,monthlyFixedCosts:2000});
 assert.equal(months[1].customers,72);
 assert.equal(metrics.breakEvenMonth,null);
 assert.ok(months.every(m=>m.profit<0&&m.revenue>=0));
});

test("archetypes price a unit of monthly activity and marketplace revenue is net fee",()=>{
 for(const archetype of ["subscription","transactional","capacity","marketplace"] as const){
  assert.equal(calculateFinance({...base,archetype,monthlyPrice:4,initialCustomers:2200}).months[0].revenue,8800);
 }
});

test("reject nonfinite and out-of-range assumptions before producing charts",()=>{
 for(const overrides of [{monthlyPrice:NaN},{monthlyPrice:Infinity},{initialCustomers:1.5},{churnPct:101},{monthlyGrowthPct:-100},{startupCost:-1}]){
  assert.throws(()=>calculateFinance({...base,...overrides}));
 }
});
