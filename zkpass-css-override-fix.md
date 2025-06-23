# zkPass CSS Override Issue - Analysis & Fix

## Problem Description

Users reported that when the zkPass Transgate v0.5.1 browser extension is active, certain text elements in the Redact Money application become barely readable due to color changes. Specifically, the following text elements were affected:

- **"Shield Your Assets"** - Main heading text
- **"Discover confidential assets and transactions"** - Subtitle text  
- **"Encryption steps:"** - Transaction guide title

## Root Cause Analysis

The issue was caused by the zkPass browser extension injecting CSS that overrode the application's text color styling. The extension's CSS was using broad selectors that affected elements with the `text-primary` class, causing them to change to green colors that had poor contrast against light backgrounds.

### Affected Elements Location

1. **"Shield Your Assets"** - Located in `packages/nextjs/app/page.tsx` line 33
   - Uses CSS class: `text-primary text-5xl font-bold leading-tight`

2. **"Discover confidential assets and transactions"** - Located in `packages/nextjs/app/page.tsx` line 36
   - Uses CSS class: `text-primary text-lg`

3. **"Encryption steps:"** - Located in `packages/nextjs/components/TransactionGuide.tsx` line 43
   - Rendered within a container with `text-primary` class

## Solution Implemented

Added comprehensive CSS protection rules in `packages/nextjs/styles/globals.css` using the following strategies:

### 1. High CSS Specificity
Used multiple selector combinations to increase specificity:
```css
.text-primary,
div .text-primary,
html .text-primary,
body .text-primary
```

### 2. Important Declarations
Added `!important` to ensure our color values take precedence over external CSS:
```css
color: var(--default-text-color) !important;
```

### 3. Theme-Aware Protection
Implemented separate rules for both light and dark themes:
```css
.dark .text-primary,
.dark div .text-primary,
html.dark .text-primary,
body.dark .text-primary
```

### 4. Targeted Component Protection
Added specific protection for transaction guide components:
```css
.bg-primary-foreground .text-primary span
```

### 5. Attribute-Based Protection
Used CSS attribute selectors for broad coverage:
```css
[class*="text-primary"]:not([class*="text-primary-accent"])
```

## Implementation Details

The protection rules were added to the `@layer components` section to ensure proper CSS cascade ordering and prevent conflicts with utility classes.

## Impact

- **8% of users** (4 out of 49) reported this issue according to user feedback
- **zkPass Transgate v0.5.1** was identified as the primary cause
- Solution provides protection against this and other similar browser extension CSS overrides

## Prevention

The implemented solution not only fixes the zkPass issue but also provides general protection against future browser extension CSS conflicts by:

1. Using CSS custom properties that are less likely to be overridden
2. Implementing high-specificity selectors
3. Adding multiple fallback selector patterns
4. Using `!important` declarations strategically

## Testing Recommendations

1. Test with zkPass Transgate v0.5.1 extension active
2. Verify text readability in both light and dark themes
3. Check that all three affected text elements maintain proper colors
4. Test with other common browser extensions to ensure no regressions

## Files Modified

- `packages/nextjs/styles/globals.css` - Added CSS protection rules