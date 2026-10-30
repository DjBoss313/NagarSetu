import { getDb } from '@/lib/db';
import { generateTrackingCode } from '@/lib/tracking';
import fs from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let description = '';
    let category = 'Other';
    let lat = 12.9716;
    let lng = 77.5946;
    let address = '';
    let imagePath: string | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      description = (formData.get('description') as string) || '';
      category = (formData.get('category') as string) || 'Other';
      if (category === 'auto') category = 'Other';

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
      category = json.category === 'auto' ? 'Other' : json.category || 'Other';
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
    const trackingCode = generateTrackingCode(db);

    const insertReportStmt = db.prepare(`
      INSERT INTO reports (
        tracking_code,
        description,
        image_path,
        category,
        user_category,
        lat,
        lng,
        address,
        status,
        summary_source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertHistoryStmt = db.prepare(`
      INSERT INTO status_history (
        report_id,
        from_status,
        to_status,
        note,
        actor
      ) VALUES (?, ?, ?, ?, ?)
    `);

    let newReportId = 0;

    const tx = db.transaction(() => {
      const res = insertReportStmt.run(
        trackingCode,
        description.trim(),
        imagePath,
        category,
        category,
        lat,
        lng,
        address.trim() || null,
        'Submitted',
        'fallback'
      );

      newReportId = Number(res.lastInsertRowid);

      insertHistoryStmt.run(
        newReportId,
        'Submitted',
        'Submitted',
        'Complaint registered via Citizen Portal',
        'Citizen'
      );
    });

    tx();

    return NextResponse.json(
      {
        success: true,
        tracking_code: trackingCode,
        report_id: newReportId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error submitting report:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while saving the report.' },
      { status: 500 }
    );
  }
}
