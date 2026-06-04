import { NextRequest, NextResponse } from 'next/server'
import { readLocalFile } from '@/lib/drive'

export const runtime = 'nodejs'

// GET /api/files/<path>
//
// Serves a file from the local fallback uploads directory. Drive-stored
// files use their Drive webViewLink directly and bypass this route.
//
// The path is the relative key stored in documents.file_id when
// documents.storage_driver = 'local'. lib/drive.ts already refuses to
// resolve any path that escapes the uploads root.
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await context.params
    const relative = path.map(decodeURIComponent).join('/')
    const { stream, size, mimeType } = await readLocalFile(relative)

    // Convert the Node stream into the Web ReadableStream that Next.js
    // expects on the Response body.
    const webStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk) => controller.enqueue(new Uint8Array(chunk as Buffer)))
        stream.on('end', () => controller.close())
        stream.on('error', (err) => controller.error(err))
      },
      cancel() {
        stream.destroy()
      },
    })

    return new Response(webStream, {
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(size),
        'Cache-Control': 'private, max-age=0, no-store',
      },
    })
  } catch (error) {
    console.error('File serve error:', error)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
