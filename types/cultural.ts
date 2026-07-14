export interface CulturalColors {
  error: string;
  warning: string;
  success: string;
  info: string;
  primary: string;
  secondary: string;
}

export interface CulturalFormatting {
  dateFormat: string;
  numberThousandsSeparator: string;
  numberDecimalSeparator: string;
  currencyPosition: "before" | "after";
  timeFormat: "12h" | "24h";
}

export interface CulturalPreferences {
  colors: CulturalColors;
  formatting: CulturalFormatting;
  // Cultural-specific UI preferences
  errorIconStyle: "western" | "eastern";
  layoutDirection: "ltr" | "rtl";
  // Reading patterns affect layout
  readingPattern: "z-pattern" | "f-pattern" | "vertical";
  // Spacing preferences
  contentDensity: "comfortable" | "compact" | "spacious";
}

export interface CulturalTheme {
  locale: string;
  culturalRegion: string;
  preferences: CulturalPreferences;
}

export interface CulturalContextType {
  currentTheme: CulturalTheme;
  formatNumber: (num: number) => string;
  formatDate: (date: string | Date) => string;
  formatCurrency: (amount: number, currency: string) => string;
  getColorClass: (type: keyof CulturalColors) => string;
  getTextColorClass: (type: keyof CulturalColors) => string;
  getBgColorClass: (type: keyof CulturalColors) => string;
  getBorderColorClass: (type: keyof CulturalColors) => string;
}
