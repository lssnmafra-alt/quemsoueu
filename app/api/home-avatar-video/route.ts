export const dynamic = 'force-dynamic';

function getSourceUrl() {
  return process.env.NEXT_PUBLIC_HOME_AVATAR_VIDEO_URL || process.env.HOME_AVATAR_VIDEO_URL || '';
}

export async function GET(request: Request) {
  const sourceUrl = getSourceUrl();

  if (!sourceUrl) {
    return Response.json({ error: 'HOME_AVATAR_VIDEO_URL not configured.' }, { status: 404 });
  }

  const upstreamHeaders = new Headers();
  const range = request.headers.get('range');
  if (range) upstreamHeaders.set('range', range);

  const upstream = await fetch(sourceUrl, {
    headers: upstreamHeaders,
    cache: 'no-store',
  });

  if (!upstream.ok && upstream.status !== 206) {
    return Response.json({ error: 'Could not load home avatar video.' }, { status: upstream.status || 502 });
  }

  const responseHeaders = new Headers();
  responseHeaders.set('Content-Type', upstream.headers.get('content-type') || 'video/mp4');
  responseHeaders.set('Cache-Control', 'public, max-age=300');
  responseHeaders.set('Access-Control-Allow-Origin', '*');
  responseHeaders.set('Accept-Ranges', upstream.headers.get('accept-ranges') || 'bytes');

  const contentLength = upstream.headers.get('content-length');
  const contentRange = upstream.headers.get('content-range');
  if (contentLength) responseHeaders.set('Content-Length', contentLength);
  if (contentRange) responseHeaders.set('Content-Range', contentRange);

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}
