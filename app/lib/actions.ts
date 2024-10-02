import { connectionPool } from '../../db';
import path from 'path';
import fs from 'fs';
import { getExifDataFromImage } from './generations/utils';

// Helper function to insert a new file type if it doesn't exist
async function getOrCreateFileType(fileType: string): Promise<number> {
    // Check if the file type already exists
    const result = await connectionPool.query('SELECT id FROM file_types WHERE name = $1', [fileType]);

    if (result.rows.length > 0) {
        // Return the existing file type's ID
        return result.rows[0].id;
    } else {
        // Insert the new file type and return its ID
        const insertResult = await connectionPool.query(
            'INSERT INTO file_types (name) VALUES ($1) RETURNING id',
            [fileType]
        );
        return insertResult.rows[0].id;
    }
}

export async function saveGenerationEntry(
    imagePath: string,
) {
    const resolvedImagePath = path.resolve(process.cwd(), imagePath);

    try {
        const file_type = path.extname(imagePath).substring(1).toLowerCase(); // Get the file extension without the dot
        const file_type_id = await getOrCreateFileType(file_type); // Get or create the file type

        // Get EXIF data from the image
        const exifResult = await getExifDataFromImage(imagePath);

        if (!exifResult.success) {
            throw new Error(exifResult.error);
        }

        const metadata = exifResult.metadata;

        // Extract the date created from EXIF data or fall back to the file's stats
        const stats = fs.statSync(resolvedImagePath);
        const imageCreationDate = metadata.DateTimeOriginal || stats.birthtime;

        // Extract data for generations table
        const name = path.basename(imagePath);
        const fileLocation = path.resolve(imagePath);
        const width = metadata.ImageWidth || null;
        const height = metadata.ImageHeight || null;
        const rawJson = metadata; // Saving all EXIF metadata as raw_json
        const size = fs.statSync(imagePath).size; // Get file size in bytes

        // Insert the new generation into the database
        const result = await connectionPool.query(
            `INSERT INTO generations (
                file_type_id,
                name,
                file_location,
                width,
                height,
                date_created,
                size,
                raw_json
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
            [file_type_id, name, fileLocation, width, height, imageCreationDate, size, rawJson]
        );

        return { success: true, generationId: result.rows[0].id };
    } catch (error) {
        console.error('Failed to save generation entry:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}
