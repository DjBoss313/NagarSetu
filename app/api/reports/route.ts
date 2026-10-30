import { processComplaintSubmission } from '@/lib/ai/pipeline';
import { getDb } from '@/lib/db';
import fs from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let description = '';
    let category: string | null = null;
    let lat = 12.9716;
    let lng = 77.5946;
    let address = '';
    let imagePath: string | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      description = (formData.get('description') as string) || '';
      category = (formData.get('category') as string) || null;
      if (category === 'auto') category = null;

      const latVal = formData.get('lat');
      const lngVal = formData.get('lng');
      if (latVal) lat = parseFloat(latVal as string);
      if (lngVal) lng = parseFloat(lngVal as string);

      address = (formData.get('address') as string) || '';

      const photo = formData.get('photo') as File | null;
      if (photo && photo.size > 0 && photo.name) {
        const ext = path.extname(photo.name) || '.jpg';
        const safeName = `upload_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
        const uploadsDir = path.join(process.cwd(), 'data', 'uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const filePath = path.join(uploadsDir, safeName);
        const arrayBuffer = await photo.arrayBuffer();
        fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
        imagePath = `/api/uploads/${safeName}`;
      }
    } else {
      const json = await request.json();
      description = json.description || '';
      category = json.category === 'auto' ? null : json.category;
      if (json.lat) lat = parseFloat(json.lat);
      if (json.lng) lng = parseFloat(json.lng);
      address = json.address || '';
      imagePath = json.image_path || null;
    }

    if (!description || description.trim().length < 5) {
      return NextResponse.json(
        { error: 'Description must be at least 5 characters long.' },
        { status: 400 }
      );
    }

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: 'Valid numeric coordinates (latitude and longitude) are required.' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Execute the complete synchronous AI Pipeline:
    // categorize -> summarize -> duplicates -> priority -> persist -> re-cluster
    const result = await processComplaintSubmission(db, {
      description,
      category,
      lat,
      lng,
      address,
      imagePath,
    });

    return NextResponse.json(
      {
        success: true,
        tracking_code: result.report.tracking_code,
        report: result.report,
        duplicate_alert: result.duplicateAlert,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in synchronous complaint pipeline:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while processing the complaint.' },
      { status: 500 }
    );
  }
}
