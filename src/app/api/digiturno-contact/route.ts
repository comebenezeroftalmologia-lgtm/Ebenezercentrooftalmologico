import { NextResponse } from 'next/server';
import data from '@/lib/digiturno-contact-data.json';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(data);
}
