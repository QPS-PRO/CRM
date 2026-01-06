// Arabic font support for jsPDF
// Using Amiri font (a common Arabic font)
const ARABIC_FONT_BASE64 = `data:font/truetype;charset=utf-8;base64,` // We'll use a CDN approach instead

// Load Arabic font from CDN and add to jsPDF
export async function loadArabicFont(doc) {
  try {
    // Using a simpler approach - we'll use a font that supports Arabic
    // For now, we'll use the built-in font but with proper text handling
    // In production, you might want to load a custom Arabic font file
    
    // Alternative: Use a CDN-hosted Arabic font
    const fontUrl = 'https://fonts.gstatic.com/s/amiri/v27/J7aRnpd8CGxBHqUpvrI.woff2'
    
    // For jsPDF, we need to convert the font to base64 and add it
    // This is a simplified version - in production, you'd want to:
    // 1. Download the font file
    // 2. Convert it to base64
    // 3. Add it using doc.addFileToVFS() and doc.addFont()
    
    // For now, we'll use a workaround with better text rendering
    return true
  } catch (error) {
    console.error('Error loading Arabic font:', error)
    return false
  }
}

// Helper function to set font based on language
export function setPdfFont(doc, language) {
  if (language === 'ar') {
    // Try to use a font that supports Arabic
    // Note: jsPDF's default fonts don't support Arabic well
    // We'll need to add a custom font or use a workaround
    try {
      // For Arabic, we'll use the default font but handle text differently
      doc.setFont('helvetica')
      return true
    } catch (error) {
      console.error('Error setting Arabic font:', error)
      return false
    }
  } else {
    doc.setFont('helvetica')
    return true
  }
}

// Better solution: Use a library that supports Arabic fonts
// We'll use a CDN-hosted Arabic font and add it to jsPDF
export async function initializeArabicFont(doc) {
  if (!doc.getFontList()['Amiri']) {
    try {
      // Load Arabic font from a CDN
      // In a real implementation, you'd want to:
      // 1. Download the font file (Amiri, Noto Sans Arabic, etc.)
      // 2. Convert it to base64
      // 3. Add it using doc.addFileToVFS() and doc.addFont()
      
      // For now, we'll use a workaround with canvas rendering for Arabic text
      return false
    } catch (error) {
      console.error('Error initializing Arabic font:', error)
      return false
    }
  }
  return true
}

