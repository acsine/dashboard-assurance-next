import { defineRouting } from "next-intl/routing";
import locales from "../i18n";

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: locales.map((locale: any) => locale.code),

  // Used when no locale matches
  defaultLocale: "fr",
});
