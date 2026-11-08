import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NETLAB — معمل محاكاة الشبكات",
  description:
    "معمل شبكات تفاعلي في المتصفح: ابنِ الطوبولوجيا، اضبط العناوين، اختبر ping وDHCP وDNS وVLAN وNAT وجدار الحماية، وتعلّم طبقات الشبكة خطوة بخطوة.",
  applicationName: "NETLAB",
  keywords: ["شبكات", "محاكي", "Cisco", "DHCP", "DNS", "VLAN", "NAT", "Network Lab"],
};

export const viewport: Viewport = {
  themeColor: "#05070b",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
