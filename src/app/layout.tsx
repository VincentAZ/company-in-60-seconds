import type {Metadata} from "next";
import "./globals.css";
const origin=process.env.SITE_URL||(process.env.VERCEL_PROJECT_PRODUCTION_URL?`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`:"http://localhost:3000");
export const metadata:Metadata={
 metadataBase:new URL(origin),
 icons:{icon:"/icon.svg"},
 title:"Company in 60 Seconds | Watch a business come to life",
 description:"Explore twelve fictional companies through their brands, websites, editable financial models and replayable pitch decks.",
 openGraph:{type:"website",title:"Company in 60 Seconds",description:"One idea. Four artifacts. Watch a concept take shape.",images:[{url:"/opengraph-image",width:1200,height:630,alt:"Company / 60 — one idea, four artifacts"}]},
 twitter:{card:"summary_large_image",title:"Company in 60 Seconds",description:"One idea. Four artifacts. Watch a concept take shape.",images:["/opengraph-image"]}
};
export default function RootLayout({children}:{children:React.ReactNode}){
 return <html lang="en"><body>{children}</body></html>;
}
