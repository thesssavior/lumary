import { NextResponse } from 'next/server';
import { HttpsProxyAgent } from 'https-proxy-agent';

export async function GET() {
  const proxyUrl = 'http://toehivex:esiwn5hn17xs@p.webshare.io:80/';
  const agent = new HttpsProxyAgent(proxyUrl);

  try {
    const res = await fetch('https://ipv4.webshare.io/', { agent } as any);
    const text = await res.text();
    return NextResponse.json({ success: true, data: text });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
} 