import { NextResponse } from 'next/server'
import { creditPackages } from '@/lib/stripe/packages'

export async function GET() {
  return NextResponse.json({ packages: creditPackages })
}
