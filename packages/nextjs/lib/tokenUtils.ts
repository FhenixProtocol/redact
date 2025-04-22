"use client";

export function getTokenLogo(symbol: string): string {
  // Default fallback image
  const defaultLogo = "/token-icons/default-token.webp";
  return defaultLogo;

  // Only run this check in the browser
  if (typeof window !== "undefined") {
    const extensions = ["png", "jpg", "jpeg", "svg", "webp"];
    let extensionMatched = false;

    for (const ext of extensions) {
      try {
        const response = new XMLHttpRequest();
        response.open("HEAD", `/token-icons/${symbol.toLowerCase()}.${ext}`, false);
        response.send();

        if (response.status === 200) {
          return `/token-icons/${symbol.toLowerCase()}.${ext}`;
        }

        extensionMatched = true;
      } catch {
        console.error(`Error checking for ${symbol}.${ext}`);
        // Empty catch block
      }
    }

    if (!extensionMatched) {
      console.error(`No matching token icon found for ${symbol}`);
      return defaultLogo;
    }
  }

  // Return default if no matching icon found or if running on server
  return defaultLogo;

  // // Only run this check in the browser
  // if (typeof window !== "undefined") {
  //   const extensions = ["webp"];
  //   let extensionMatched = false;

  //   for (const ext of extensions) {
  //     try {
  //       const response = new XMLHttpRequest();
  //       response.open("HEAD", `/token-icons/${symbol.toLowerCase()}.${ext}`, false);
  //       response.send();

  //       if (response.status === 200) {
  //         return `/token-icons/${symbol.toLowerCase()}.${ext}`;
  //       }

  //       extensionMatched = true;
  //     } catch {
  //       console.error(`Error checking for ${symbol}.${ext}`);
  //       // Empty catch block
  //     }
  //   }

  //   if (!extensionMatched) {
  //     console.error(`No matching token icon found for ${symbol}`);
  //     return defaultLogo;
  //   }
  // }

  // // Return default if no matching icon found or if running on server
  // return defaultLogo;
}
