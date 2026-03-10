import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency }).format(amount)
}

export function trackingUrl(carrier: string, trackingNumber: string): string {
  const carriers: Record<string, string> = {
    ctt: `https://www.ctt.pt/feapl_2/app/open/objectSearch/objectSearch.jspx?objects=${trackingNumber}`,
    dhl: `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`,
    ups: `https://www.ups.com/track?tracknum=${trackingNumber}`,
    fedex: `https://www.fedex.com/fedextrack/?tracknumbers=${trackingNumber}`,
  }
  return carriers[carrier.toLowerCase()] ?? `https://www.google.com/search?q=${carrier}+tracking+${trackingNumber}`
}

export function ratingAverage(quality: number, delivery: number): number {
  return Math.round(((quality + delivery) / 2) * 10) / 10
}
