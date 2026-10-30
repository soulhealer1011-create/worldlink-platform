import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "WORLDLINK | Rescue food. Support communities.",
  description: "Connect surplus food with communities that need it."
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
