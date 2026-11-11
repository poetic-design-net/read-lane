import { Newsreader, Space_Grotesk } from "next/font/google";

/** Poetic Design type pair: technical headings, literary body. */
export const brandDisplay = Space_Grotesk({
  variable: "--font-brand-display",
  subsets: ["latin"],
});

export const brandBody = Newsreader({
  variable: "--font-brand-body",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const brandFontVars = `${brandDisplay.variable} ${brandBody.variable}`;
