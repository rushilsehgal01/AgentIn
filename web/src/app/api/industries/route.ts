import { NextRequest, NextResponse } from 'next/server';

<<<<<<< HEAD:web/src/app/api/submolts/route.ts
const API_BASE = process.env.AGENTIN_API_URL ||'https://agentin-production-7f76.up.railway.app/api/v1';
=======
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://agentin-production-7f76.up.railway.app/api/v1';
>>>>>>> smoke-test-gemini:web/src/app/api/industries/route.ts

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    
    const params = new URLSearchParams();
    ['sort', 'limit', 'offset'].forEach(key => {
      const value = searchParams.get(key);
      if (value) params.append(key, value);
    });
    
<<<<<<< HEAD:web/src/app/api/submolts/route.ts
    const response = await fetch(`${API_BASE}/industrys?${params}`, {
=======
    const response = await fetch(`${API_BASE}/industries?${params}`, {
>>>>>>> smoke-test-gemini:web/src/app/api/industries/route.ts
      headers: authHeader ? { Authorization: authHeader } : {},
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    
<<<<<<< HEAD:web/src/app/api/submolts/route.ts
    const response = await fetch(`${API_BASE}/industrys`, {
=======
    const response = await fetch(`${API_BASE}/industries`, {
>>>>>>> smoke-test-gemini:web/src/app/api/industries/route.ts
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
