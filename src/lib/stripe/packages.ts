export interface CreditPackage {
  id: string
  name: string
  credits: number
  bonusCredits: number
  price: number // cents
  priceDisplay: string
  popular: boolean
  description: string
}

export const creditPackages: CreditPackage[] = [
  {
    id: 'starter',
    name: 'Starter Pack',
    credits: 10000,
    bonusCredits: 0,
    price: 99,
    priceDisplay: '$0.99',
    popular: false,
    description: 'Perfect for trying out the casino',
  },
  {
    id: 'popular',
    name: 'Popular Pack',
    credits: 50000,
    bonusCredits: 5000,
    price: 499,
    priceDisplay: '$4.99',
    popular: true,
    description: '10% bonus credits included',
  },
  {
    id: 'premium',
    name: 'Premium Pack',
    credits: 100000,
    bonusCredits: 20000,
    price: 999,
    priceDisplay: '$9.99',
    popular: false,
    description: '20% bonus credits included',
  },
  {
    id: 'whale',
    name: 'Whale Pack',
    credits: 500000,
    bonusCredits: 150000,
    price: 4999,
    priceDisplay: '$49.99',
    popular: false,
    description: '30% bonus credits included',
  },
  {
    id: 'vip',
    name: 'VIP Bundle',
    credits: 1000000,
    bonusCredits: 500000,
    price: 9999,
    priceDisplay: '$99.99',
    popular: false,
    description: '50% bonus credits included',
  },
]

export function getPackageById(id: string): CreditPackage | undefined {
  return creditPackages.find((p) => p.id === id)
}
