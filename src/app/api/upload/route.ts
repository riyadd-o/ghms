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
        { 
          width: 400,        // Reduce width to 400px (enough for menu cards)
          height: 300,       // Reduce height to 300px
          crop: 'fill',      // Crop to fill the dimensions
          gravity: 'auto',   // Smart crop focusing on the main subject
          quality: 'auto:low', // Auto compress to lowest acceptable quality
          fetch_format: 'auto', // Auto convert to WebP for browsers that support it
          dpr: 'auto'        // Auto handle device pixel ratio
        }
      ],
      eager: [
        // Also generate a tiny thumbnail for Today's Special banner
        { width: 60, height: 60, crop: 'fill', quality: 'auto:low', fetch_format: 'auto' }
      ],
      eager_async: true
    });

    return NextResponse.json({ 
      url: result.secure_url,
      public_id: result.public_id 
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
