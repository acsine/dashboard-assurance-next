'use client'

import { useEffect } from 'react'

export function SetHtmlLocale({ locale }: { locale: string }) {
  useEffect(() => {
    const isRTL = locale === 'ar'
    document.documentElement.lang = locale
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr'
    document.documentElement.setAttribute('data-cultural-theme', locale)
    document.body.classList.remove('rtl', 'ltr')
    document.body.classList.add(isRTL ? 'rtl' : 'ltr')
  }, [locale])

  return null
}
