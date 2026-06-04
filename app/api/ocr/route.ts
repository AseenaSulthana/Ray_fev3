/**
 * /api/ocr
 *
 * Proxy between the frontend chat UI and the Python OCR microservice.
 *
 * POST body (JSON):
 *   {
 *     imageData : string  // base64 data-URL or raw base64
 *     mimeType  : string  // e.g. "image/png"
 *     filename  : string  // e.g. "photo.png"
 *   }
 *
 * Response (JSON):
 *   { success: true,  text: "..." }
 *   { success: false, error: "..." }
 */

import { NextRequest, NextResponse } from 'next/server'

// URL of the running Python OCR service.
// Override via OCR_SERVICE_URL env var in production.
const OCR_SERVICE_URL = process.env.OCR_SERVICE_URL ?? 'http://127.0.0.1:8002'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { imageData, mimeType, filename } = body as {
      imageData?: string
      mimeType?: string
      filename?: string
    }

    if (!imageData) {
      return NextResponse.json(
        { success: false, error: 'imageData is required' },
        { status: 400 },
      )
    }

    // Forward to the OCR microservice /ocr/base64 endpoint
    const ocrRes = await fetch(`${OCR_SERVICE_URL}/ocr/base64`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_data: imageData,
        mime_type: mimeType ?? 'image/jpeg',
        filename: filename ?? 'upload.jpg',
      }),
    })

    if (!ocrRes.ok) {
      const errText = await ocrRes.text().catch(() => '')
      console.error('[/api/ocr] OCR service error:', ocrRes.status, errText)
      return NextResponse.json(
        { success: false, error: 'OCR service failed', details: errText },
        { status: 502 },
      )
    }

    const data = await ocrRes.json()
    return NextResponse.json({
      success: true,
      text: data.text ?? '',
      filename: data.filename ?? filename,
    })
  } catch (error) {
    console.error('[/api/ocr] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    )
  }
}
