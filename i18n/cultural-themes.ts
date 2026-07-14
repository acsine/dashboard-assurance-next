import { CulturalTheme } from "@/types/cultural";

export const culturalThemes: Record<string, CulturalTheme> = {
  // Western cultures - errors in red
  en: {
    locale: "en",
    culturalRegion: "western",
    preferences: {
      colors: {
        error: "rgb(239, 68, 68)", // red-500
        warning: "rgb(245, 158, 11)", // amber-500
        success: "rgb(34, 197, 94)", // green-500
        info: "rgb(59, 130, 246)", // blue-500
        primary: "rgb(59, 130, 246)", // blue-600
        secondary: "rgb(107, 114, 128)", // gray-500
      },
      formatting: {
        dateFormat: "MM/DD/YYYY",
        numberThousandsSeparator: ",",
        numberDecimalSeparator: ".",
        currencyPosition: "before",
        timeFormat: "12h",
      },
      errorIconStyle: "western",
      layoutDirection: "ltr",
      readingPattern: "z-pattern",
      contentDensity: "comfortable",
    },
  },

  fr: {
    locale: "fr",
    culturalRegion: "western-europe",
    preferences: {
      colors: {
        error: "rgb(239, 68, 68)", // red-500
        warning: "rgb(245, 158, 11)", // amber-500
        success: "rgb(34, 197, 94)", // green-500
        info: "rgb(59, 130, 246)", // blue-500
        primary: "rgb(59, 130, 246)",
        secondary: "rgb(107, 114, 128)",
      },
      formatting: {
        dateFormat: "DD/MM/YYYY",
        numberThousandsSeparator: " ",
        numberDecimalSeparator: ",",
        currencyPosition: "after",
        timeFormat: "24h",
      },
      errorIconStyle: "western",
      layoutDirection: "ltr",
      readingPattern: "z-pattern",
      contentDensity: "comfortable",
    },
  },

  de: {
    locale: "de",
    culturalRegion: "western-europe",
    preferences: {
      colors: {
        error: "rgb(239, 68, 68)", // red-500
        warning: "rgb(245, 158, 11)", // amber-500
        success: "rgb(34, 197, 94)", // green-500
        info: "rgb(59, 130, 246)", // blue-500
        primary: "rgb(59, 130, 246)",
        secondary: "rgb(107, 114, 128)",
      },
      formatting: {
        dateFormat: "DD.MM.YYYY",
        numberThousandsSeparator: ".",
        numberDecimalSeparator: ",",
        currencyPosition: "after",
        timeFormat: "24h",
      },
      errorIconStyle: "western",
      layoutDirection: "ltr",
      readingPattern: "z-pattern",
      contentDensity: "comfortable",
    },
  },

  // Chinese culture - red is lucky, use orange/yellow for errors
  zh: {
    locale: "zh",
    culturalRegion: "east-asia",
    preferences: {
      colors: {
        error: "rgb(249, 115, 22)", // orange-500 - avoiding red for errors
        warning: "rgb(245, 158, 11)", // amber-500
        success: "rgb(239, 68, 68)", // red-500 - red for success/luck!
        info: "rgb(59, 130, 246)", // blue-500
        primary: "rgb(239, 68, 68)", // red primary for luck
        secondary: "rgb(107, 114, 128)",
      },
      formatting: {
        dateFormat: "YYYY年MM月DD日",
        numberThousandsSeparator: ",",
        numberDecimalSeparator: ".",
        currencyPosition: "before",
        timeFormat: "24h",
      },
      errorIconStyle: "eastern",
      layoutDirection: "ltr",
      readingPattern: "vertical",
      contentDensity: "compact",
    },
  },

  // Japanese culture - similar to Chinese but with some differences
  ja: {
    locale: "ja",
    culturalRegion: "east-asia",
    preferences: {
      colors: {
        error: "rgb(249, 115, 22)", // orange-500
        warning: "rgb(245, 158, 11)", // amber-500
        success: "rgb(34, 197, 94)", // green-500 - more traditional green for success
        info: "rgb(59, 130, 246)", // blue-500
        primary: "rgb(99, 102, 241)", // indigo-500 - indigo is valued in Japanese culture
        secondary: "rgb(107, 114, 128)",
      },
      formatting: {
        dateFormat: "YYYY年MM月DD日",
        numberThousandsSeparator: ",",
        numberDecimalSeparator: ".",
        currencyPosition: "before",
        timeFormat: "24h",
      },
      errorIconStyle: "eastern",
      layoutDirection: "ltr",
      readingPattern: "vertical",
      contentDensity: "compact",
    },
  },

  // Arabic culture - right-to-left, different color associations
  ar: {
    locale: "ar",
    culturalRegion: "middle-east",
    preferences: {
      colors: {
        error: "rgb(239, 68, 68)", // red-500
        warning: "rgb(245, 158, 11)", // amber-500
        success: "rgb(34, 197, 94)", // green-500 - green is very positive in Islamic culture
        info: "rgb(59, 130, 246)", // blue-500
        primary: "rgb(34, 197, 94)", // green primary
        secondary: "rgb(107, 114, 128)",
      },
      formatting: {
        dateFormat: "DD/MM/YYYY",
        numberThousandsSeparator: ",",
        numberDecimalSeparator: ".",
        currencyPosition: "after",
        timeFormat: "12h",
      },
      errorIconStyle: "western",
      layoutDirection: "rtl",
      readingPattern: "f-pattern",
      contentDensity: "spacious",
    },
  },

  // Spanish culture
  es: {
    locale: "es",
    culturalRegion: "latin",
    preferences: {
      colors: {
        error: "rgb(239, 68, 68)", // red-500
        warning: "rgb(245, 158, 11)", // amber-500
        success: "rgb(34, 197, 94)", // green-500
        info: "rgb(59, 130, 246)", // blue-500
        primary: "rgb(239, 68, 68)", // red primary - cultural affinity for red
        secondary: "rgb(107, 114, 128)",
      },
      formatting: {
        dateFormat: "DD/MM/YYYY",
        numberThousandsSeparator: ".",
        numberDecimalSeparator: ",",
        currencyPosition: "after",
        timeFormat: "24h",
      },
      errorIconStyle: "western",
      layoutDirection: "ltr",
      readingPattern: "z-pattern",
      contentDensity: "comfortable",
    },
  },

  // Italian culture
  it: {
    locale: "it",
    culturalRegion: "southern-europe",
    preferences: {
      colors: {
        error: "rgb(239, 68, 68)", // red-500
        warning: "rgb(245, 158, 11)", // amber-500
        success: "rgb(34, 197, 94)", // green-500
        info: "rgb(59, 130, 246)", // blue-500
        primary: "rgb(34, 197, 94)", // green primary - Italian flag influence
        secondary: "rgb(107, 114, 128)",
      },
      formatting: {
        dateFormat: "DD/MM/YYYY",
        numberThousandsSeparator: ".",
        numberDecimalSeparator: ",",
        currencyPosition: "after",
        timeFormat: "24h",
      },
      errorIconStyle: "western",
      layoutDirection: "ltr",
      readingPattern: "z-pattern",
      contentDensity: "comfortable",
    },
  },

  // Portuguese culture
  pt: {
    locale: "pt",
    culturalRegion: "latin",
    preferences: {
      colors: {
        error: "rgb(239, 68, 68)", // red-500
        warning: "rgb(245, 158, 11)", // amber-500
        success: "rgb(34, 197, 94)", // green-500
        info: "rgb(59, 130, 246)", // blue-500
        primary: "rgb(34, 197, 94)", // green primary - Portuguese flag influence
        secondary: "rgb(107, 114, 128)",
      },
      formatting: {
        dateFormat: "DD/MM/YYYY",
        numberThousandsSeparator: ".",
        numberDecimalSeparator: ",",
        currencyPosition: "after",
        timeFormat: "24h",
      },
      errorIconStyle: "western",
      layoutDirection: "ltr",
      readingPattern: "z-pattern",
      contentDensity: "comfortable",
    },
  },

  // Swahili (East African culture)
  sw: {
    locale: "sw",
    culturalRegion: "east-africa",
    preferences: {
      colors: {
        error: "rgb(239, 68, 68)", // red-500
        warning: "rgb(245, 158, 11)", // amber-500
        success: "rgb(34, 197, 94)", // green-500
        info: "rgb(59, 130, 246)", // blue-500
        primary: "rgb(34, 197, 94)", // green primary
        secondary: "rgb(107, 114, 128)",
      },
      formatting: {
        dateFormat: "DD/MM/YYYY",
        numberThousandsSeparator: ",",
        numberDecimalSeparator: ".",
        currencyPosition: "before",
        timeFormat: "24h",
      },
      errorIconStyle: "western",
      layoutDirection: "ltr",
      readingPattern: "z-pattern",
      contentDensity: "spacious",
    },
  },
};

// Fallback theme for unsupported locales
export const defaultCulturalTheme: CulturalTheme = culturalThemes.en;
