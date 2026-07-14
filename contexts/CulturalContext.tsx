"use client";

import React, { createContext, useContext, useMemo, useEffect } from "react";
import { useLocale } from "next-intl";
import {
  CulturalTheme,
  CulturalContextType,
  CulturalColors,
} from "../types/cultural";
import { culturalThemes, defaultCulturalTheme } from "@/i18n/cultural-themes";

const CulturalContext = createContext<CulturalContextType | undefined>(
  undefined,
);

export function CulturalProvider({ children }: { children: React.ReactNode }) {
  const locale = useLocale();

  // Apply cultural theme to document body
  useEffect(() => {
    const currentTheme = culturalThemes[locale] || defaultCulturalTheme;
    document.body.setAttribute("data-cultural-theme", currentTheme.locale);

    // Apply CSS custom properties for more dynamic theming
    const root = document.documentElement;
    const { colors } = currentTheme.preferences;

    root.style.setProperty(
      "--cultural-error",
      `${colors.error.match(/\d+/g)?.join(" ")}`,
    );
    root.style.setProperty(
      "--cultural-warning",
      `${colors.warning.match(/\d+/g)?.join(" ")}`,
    );
    root.style.setProperty(
      "--cultural-success",
      `${colors.success.match(/\d+/g)?.join(" ")}`,
    );
    root.style.setProperty(
      "--cultural-info",
      `${colors.info.match(/\d+/g)?.join(" ")}`,
    );
    root.style.setProperty(
      "--cultural-primary",
      `${colors.primary.match(/\d+/g)?.join(" ")}`,
    );
    root.style.setProperty(
      "--cultural-secondary",
      `${colors.secondary.match(/\d+/g)?.join(" ")}`,
    );
  }, [locale]);

  const contextValue = useMemo<CulturalContextType>(() => {
    const currentTheme = culturalThemes[locale] || defaultCulturalTheme;

    const formatNumber = (num: number): string => {
      const { numberThousandsSeparator, numberDecimalSeparator } =
        currentTheme.preferences.formatting;

      // Convert number to string and handle thousands separator
      const parts = num.toString().split(".");
      parts[0] = parts[0].replace(
        /\B(?=(\d{3})+(?!\d))/g,
        numberThousandsSeparator,
      );

      if (parts[1]) {
        return parts.join(numberDecimalSeparator);
      }
      return parts[0];
    };

    const formatDate = (date: string | Date): string => {
      const dateObj = typeof date === "string" ? new Date(date) : date;
      const { dateFormat } = currentTheme.preferences.formatting;

      const day = dateObj.getDate().toString().padStart(2, "0");
      const month = (dateObj.getMonth() + 1).toString().padStart(2, "0");
      const year = dateObj.getFullYear();

      switch (dateFormat) {
        case "MM/DD/YYYY":
          return `${month}/${day}/${year}`;
        case "DD/MM/YYYY":
          return `${day}/${month}/${year}`;
        case "DD.MM.YYYY":
          return `${day}.${month}.${year}`;
        case "YYYY年MM月DD日":
          return `${year}年${month}月${day}日`;
        default:
          return `${day}/${month}/${year}`;
      }
    };

    const formatCurrency = (amount: number, currency: string): string => {
      const formattedAmount = formatNumber(amount);
      const { currencyPosition } = currentTheme.preferences.formatting;

      if (currencyPosition === "before") {
        return `${currency}${formattedAmount}`;
      }
      return `${formattedAmount} ${currency}`;
    };

    // Updated helper functions to return cultural CSS classes
    const getColorClass = (type: keyof CulturalColors): string => {
      return `cultural-${type}`;
    };

    const getTextColorClass = (type: keyof CulturalColors): string => {
      return `text-cultural-${type}`;
    };

    const getBgColorClass = (type: keyof CulturalColors): string => {
      return `bg-cultural-${type}`;
    };

    const getBorderColorClass = (type: keyof CulturalColors): string => {
      return `border-cultural-${type}`;
    };

    return {
      currentTheme,
      formatNumber,
      formatDate,
      formatCurrency,
      getColorClass,
      getTextColorClass,
      getBgColorClass,
      getBorderColorClass,
    };
  }, [locale]);

  return (
    <CulturalContext.Provider value={contextValue}>
      {children}
    </CulturalContext.Provider>
  );
}

export function useCultural(): CulturalContextType {
  const context = useContext(CulturalContext);
  if (context === undefined) {
    throw new Error("useCultural must be used within a CulturalProvider");
  }
  return context;
}

// Utility hook for getting cultural CSS properties
export function useCulturalStyles() {
  const { currentTheme } = useCultural();

  return useMemo(() => {
    const { colors } = currentTheme.preferences;

    return {
      "--cultural-error": colors.error,
      "--cultural-warning": colors.warning,
      "--cultural-success": colors.success,
      "--cultural-info": colors.info,
      "--cultural-primary": colors.primary,
      "--cultural-secondary": colors.secondary,
    } as React.CSSProperties;
  }, [currentTheme]);
}
