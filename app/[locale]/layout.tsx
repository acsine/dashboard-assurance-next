import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { CulturalProvider } from "@/contexts/CulturalContext";
import { SetHtmlLocale } from "@/components/SetHtmlLocale";
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

  return (
    <NextIntlClientProvider messages={messages}>
      <SetHtmlLocale locale={locale} />
      <CulturalProvider>
        <Providers>{children}</Providers>
      </CulturalProvider>
    </NextIntlClientProvider>
  );
}

