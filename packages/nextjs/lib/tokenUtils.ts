'use client';

export function getTokenLogo(symbol: string): string {
  // Default fallback image
  const defaultLogo = '/default-token-icon.png';
  
  // Only run this check in the browser
  if (typeof window !== 'undefined') {
    const extensions = ['png', 'jpg', 'jpeg', 'svg', 'webp'];
    
    for (const ext of extensions) {
      try {
        const response = new XMLHttpRequest();
        response.open('HEAD', `/token-icons/${symbol.toLowerCase()}.${ext}`, false);
        response.send();
        
        if (response.status === 200) {
          return `/token-icons/${symbol.toLowerCase()}.${ext}`;
        }
      } catch (error) {
        console.error(`Error checking for ${symbol}.${ext}:`, error);
      }
    }
  }
  
  // Return default if no matching icon found or if running on server
  return defaultLogo;
}