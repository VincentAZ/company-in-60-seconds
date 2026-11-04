import type {Metadata} from "next";
import "./globals.css";
export const metadata:Metadata={
 title:"Company in 60 Seconds | Watch a business come to life",
 description:"One business idea. Four AI builders. A brand, website, financial model and pitch deck born before your eyes.",
 openGraph:{title:"Company in 60 Seconds",description:"Watch a business idea transform into a company, live."}
};
export default function RootLayout({children}:{children:React.ReactNode}){
 return <html lang="en"><body>{children}</body></html>;
}
