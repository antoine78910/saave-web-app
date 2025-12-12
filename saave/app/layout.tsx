import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import Script from "next/script";

const roboto = Roboto({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto',
});

export const metadata: Metadata = {
  title: "Saave - Organize nothing. Find everything.",
  description: "Saave - find it in seconds, whether it's an article, video, post, or tool.",
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true} data-lt-installed="true">
      <body
        className={`${roboto.variable} antialiased`}
      >
        <Script id="crisp-chat" strategy="afterInteractive">
          {`
            window.$crisp=[];
            window.CRISP_WEBSITE_ID="11df902e-0556-40ef-9294-c477021efaa7";
            (function(){
              var d=document;
              var s=d.createElement("script");
              s.src="https://client.crisp.chat/l.js";
              s.async=1;
              d.getElementsByTagName("head")[0].appendChild(s);
            })();
          `}
        </Script>
        {children}
      </body>
    </html>
  );
}
