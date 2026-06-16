import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import cloudinary from '@/lib/cloudinary';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await sql`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT ''`;

    const items = await sql`SELECT id, image_base64 FROM menu_items WHERE image_base64 != '' AND (image_url IS NULL OR image_url = '')`;
    
    const results = [];
    for (const item of items) {
      if (item.image_base64) {
        const result = await cloudinary.uploader.upload(item.image_base64, {
          folder: 'golden-hotel/menu-items',
          transformation: [
            {
              width: 400,
              height: 300,
              crop: 'fill',
              gravity: 'auto',
              quality: 'auto:low',
              fetch_format: 'auto'
            }
          ]
        });
        await sql`UPDATE menu_items SET image_url = ${result.secure_url} WHERE id = ${item.id}`;
        results.push({ id: item.id, url: result.secure_url });
      }
    }
    
    return NextResponse.json({ success: true, migrated: results.length, items: results });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
