import { ClerkProvider, UserButton } from "@clerk/nextjs";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Serverless LLM Playground",
  description: "Playground for Serverless LLM with Modal",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <header className="bg-white">
            <nav
              className="mx-auto flex items-center justify-between py-6 px-4"
              aria-label="Global"
            >
              <span className="sr-only">Serverless LLM Playground</span>
              <Link href="/" className="flex items-center">
                <label className="font-semibold font-mono">
                  Opensource Serverless LLM Playground
                </label>
                <p className="text-xs ml-2">(More models to come!)</p>
              </Link>

              <div className="lg:flex lg:gap-x-12">
                <UserButton afterSignOutUrl="/" />
              </div>
            </nav>
          </header>
          <main>{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
