import { useEffect } from "react";
import { useCompanyData } from "./useCompanyData";

function hexToHSL(hex: string): string {
  // Remove # if present
  hex = hex.replace(/^#/, '');
  
  // Convert hex to RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);

  return `${h} ${s}% ${l}%`;
}

export function useThemeColor() {
  const { companyData } = useCompanyData();

  useEffect(() => {
    if (companyData?.primary_color) {
      try {
        const hslValue = hexToHSL(companyData.primary_color);
        document.documentElement.style.setProperty('--primary', hslValue);
        document.documentElement.style.setProperty('--ring', hslValue);
        document.documentElement.style.setProperty('--sidebar-primary', hslValue);
      } catch (error) {
        console.error('Error converting color:', error);
      }
    }
  }, [companyData?.primary_color]);
}
