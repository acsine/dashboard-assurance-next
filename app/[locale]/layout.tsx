import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { CulturalProvider } from "@/contexts/CulturalContext";
import { culturalThemes, defaultCulturalTheme } from "@/i18n/cultural-themes";
import "../globals.css";
import { Providers } from "@/lib/providers";

export const metadata: Metadata = {
  title: "Sygalin",
  description: "Application d'entreprise moderne avec Next.js",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // Await the params before using them
  const { locale } = await params;

  // Validate that the incoming `locale` parameter is valid
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Providing all messages to the client side
  const messages = await getMessages();
  const isRTL = locale === "ar";
  const culturalTheme = culturalThemes[locale] || defaultCulturalTheme;

  return (
    <html
      lang={locale}
      dir={isRTL ? "rtl" : "ltr"}
      data-cultural-theme={locale}
    >
      <head>
        <title content={metadata.title?.toString() || "App Title"}></title>
        <meta name="description" content={metadata.description?.toString() || "App Description"} />
      </head>
      <body className={(isRTL ? "rtl" : "ltr") + " antialiased"}>
        <NextIntlClientProvider messages={messages}>
          <CulturalProvider>
            <Providers>
              {children}
            </Providers>
          </CulturalProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

