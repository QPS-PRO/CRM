import { createContext, useContext, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

const LanguageContext = createContext(null)

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

export const LanguageProvider = ({ children }) => {
  const { i18n } = useTranslation()
  const [language, setLanguage] = useState(i18n.language || 'en')

  useEffect(() => {
    // Set initial language from localStorage or default to 'en'
    const savedLanguage = localStorage.getItem('i18nextLng') || 'en'
    setLanguage(savedLanguage)
    i18n.changeLanguage(savedLanguage)
    // Update document direction
    document.documentElement.dir = savedLanguage === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = savedLanguage
  }, [i18n])

  const changeLanguage = (lang) => {
    setLanguage(lang)
    i18n.changeLanguage(lang)
    localStorage.setItem('i18nextLng', lang)
    // Update document direction
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
  }

  const isRTL = language === 'ar'

  const value = {
    language,
    changeLanguage,
    isRTL,
  }

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

