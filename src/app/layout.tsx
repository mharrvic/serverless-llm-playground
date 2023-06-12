import { ClerkProvider, UserButton } from "@clerk/nextjs";
import { Inter } from "next/font/google";
import Image from "next/image";
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
              className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8"
              aria-label="Global"
            >
              <span className="sr-only">Serverless LLM Playground</span>
              <Link href="/" className="flex items-center">
                <Image
                  src="/browny-blackie.jpg"
                  alt="Brownie and Blackie"
                  className="dark:invert rounded-full"
                  width={35}
                  height={35}
                  priority
                />
                <label className="font-semibold font-mono ml-2">
                  Serverless LLM Playground
                </label>
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
