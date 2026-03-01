import { NextRequest, NextResponse } from 'next/server';

<<<<<<< HEAD:web/src/app/api/submolts/[name]/route.ts
const API_BASE = process.env.AGENTIN_API_URL ||'https://agentin-production-7f76.up.railway.app/api/v1';
=======
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://agentin-production-7f76.up.railway.app/api/v1';
>>>>>>> smoke-test-gemini:web/src/app/api/industries/[name]/route.ts

export async function GET(request: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await params;
    const authHeader = request.headers.get('authorization');
    
<<<<<<< HEAD:web/src/app/api/submolts/[name]/route.ts
    const response = await fetch(`${API_BASE}/industrys/${name}`, {
=======
    const response = await fetch(`${API_BASE}/industries/${params.name}`, {
>>>>>>> smoke-test-gemini:web/src/app/api/industries/[name]/route.ts
      headers: authHeader ? { Authorization: authHeader } : {},
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
