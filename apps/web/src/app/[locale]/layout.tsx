import {
  Geist,
  Geist_Mono,
} from "next/font/google"
import { notFound } from 'next/navigation';
import {
  hasLocale,
  NextIntlClientProvider,
} from 'next-intl';

import { NextThemesProvider } from "@/components"
import { routing } from '@/i18n/routing';

import "@locano/ui/globals.css"

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{locale: string}>;
}>) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return (
    <html
      lang={locale}
      suppressHydrationWarning
    >
      <body className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased `}>
        <NextThemesProvider>
          <NextIntlClientProvider locale={locale}>
            {children}
          </NextIntlClientProvider>
        </NextThemesProvider>
      </body>
    </html>
  )
}
