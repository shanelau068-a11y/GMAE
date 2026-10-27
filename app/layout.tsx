import type { Metadata } from "next";

import "./globals.css";


export const metadata: Metadata = {
  title: "星际雷电 V3 八关强化版｜羊腿哪里跑专用",
  description: "羊腿哪里跑小队专属的炫酷手机雷电游戏，拖动战机，击穿星际敌军！",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body >{children}</body></html>;
}
