import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import mimeTypes from 'mime-types';

export async function GET(req: NextRequest, { params }: { params: { imagePath: string } }) {
    const { imagePath } = await params;

    const decodedImagePath = decodeURIComponent(imagePath);

    // Resolve the image path based on the stored file_location
    const resolvedImagePath = path.resolve(process.cwd(), decodedImagePath);

    try {
        if (fs.existsSync(resolvedImagePath)) {
            // Extract the file extension
            const fileExtension = path.extname(resolvedImagePath).toLowerCase();

            // Set the Content-Type header dynamically based on the file extension
            const contentType = mimeTypes.lookup(fileExtension) || 'application/octet-stream'; // Default to binary if unknown

            // Read the image file as a buffer
            const imageBuffer = fs.readFileSync(resolvedImagePath);

            // Set appropriate headers for the image
            return new NextResponse(imageBuffer, {
                headers: {
                'Content-Type': contentType,
                },
            });
        } else {
            return NextResponse.json({ message: 'Image not found' }, { status: 404 });
        }
    } catch (error) {
            console.warn(error);
            return NextResponse.json({ message: 'Error loading image' }, { status: 500 });
    }
}