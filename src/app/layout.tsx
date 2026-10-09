import type { Metadata } from "next";
import "./globals.css";
import { businessName } from "@/lib/db";

export const metadata: Metadata = {
  title: "ChangeSlip",
  description: "Mid-job change orders with Accept",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const name = businessName();
  const marketingUrl = process.env.MARKETING_URL || "";

  return (
    <html lang="en">
      <body>
        <header className="top">
          <a className="brand" href="/">
            {name}
          </a>
          <p className="tagline">Mid-job change orders with Accept</p>
          <nav className="top-nav">
            <a href="/">Slips</a>
            <a href="/new">New</a>
          </nav>
        </header>
        <main>{children}</main>
        {marketingUrl && (
          <footer className="site-footer">
            <a href={marketingUrl}>Powered by ChangeSlip</a>
          </footer>
        )}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              function copyText(text, btn) {
                navigator.clipboard.writeText(text).then(function () {
                  var old = btn.textContent;
                  btn.textContent = "Copied";
                  setTimeout(function () { btn.textContent = old; }, 1500);
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
