/**
 * /api/ocr/ingest
 *
 * Proxies an image from the chat UI through the full OCR pipeline:
 *   image (base64) → OCR service → .txt → Google Drive → RAG ingest
 *
 * POST body (JSON):
 *   {
 *     imageData : string   // base64 data-URL or raw base64
 *     mimeType  : string   // e.g. "image/png"
 *     filename  : string   // e.g. "invoice.png"
 *   }
 *
 * Success response:
 *   {
 *     success       : true
 *     txtFilename   : "invoice_ocr_1718200000.txt"
 *     driveFileId   : "1BxiM..."
 *     driveUrl      : "https://drive.google.com/..."
 *     chunksStored  : 4
 *     textPreview   : "Invoice #1234  Date: ..."   // first 300 chars
 *   }
 *
 * Error response:
 *   { success: false, error: "...", details?: "..." }
 */

import { NextRequest, NextResponse } from 'next/server'

const OCR_SERVICE_URL = process.env.OCR_SERVICE_URL ?? 'http://127.0.0.1:8002'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { imageData, mimeType, filename, role } = body as {
      imageData?: string
      mimeType?: string
      filename?: string
      role?: string
    }

    if (!imageData) {
      return NextResponse.json(
        { success: false, error: 'imageData is required' },
        { status: 400 },
      )
    }

    // Forward to OCR service full-pipeline endpoint
    const ocrRes = await fetch(`${OCR_SERVICE_URL}/ocr/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Give it up to 3 min — PaddleOCR + Drive upload can be slow on first run
      signal: AbortSignal.timeout(180_000),
      body: JSON.stringify({
        image_data: imageData,
        mime_type: mimeType ?? 'image/jpeg',
        filename: filename ?? 'upload.jpg',
        role: role ?? 'employee',
      }),
    })

    const data = await ocrRes.json().catch(() => null)

    if (!ocrRes.ok) {
      const detail = data?.detail ?? data?.error ?? ocrRes.statusText
      console.error('[/api/ocr/ingest] OCR service error:', ocrRes.status, detail)
      return NextResponse.json(
        { success: false, error: 'OCR ingest pipeline failed', details: detail },
        { status: ocrRes.status === 422 ? 422 : 502 },
      )
    }

    return NextResponse.json({
      success: true,
      txtFilename: data?.txt_filename ?? '',
      driveFileId: data?.drive_file_id ?? '',
      driveUrl: data?.drive_url ?? '',
      chunksStored: data?.chunks_stored ?? 0,
      textPreview: data?.text_preview ?? '',
    })
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'TimeoutError'
    console.error('[/api/ocr/ingest] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: isTimeout
          ? 'OCR processing timed out. Try a smaller image.'
          : 'Internal server error',
      },
      { status: 500 },
    )
  }
}
