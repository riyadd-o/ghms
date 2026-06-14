import { NextRequest, NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();
    
    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const result = await cloudinary.uploader.upload(image, {
      folder: 'golden-hotel/menu-items',
      transformation: [
        { width: 800, height: 600, crop: 'fill', quality: 'auto', fetch_format: 'auto' }
      ]
    });

    return NextResponse.json({ 
      url: result.secure_url,
      public_id: result.public_id 
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
