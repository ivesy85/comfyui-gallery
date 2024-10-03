import { connectionPool } from '../../db';
import path from 'path';
import fs from 'fs';
import {
    getExifDataFromImage,
    extractCkptNamesFromExifData,
    extractLoraNamesFromExifData,
} from './generations/utils';
import { getOrCreateFileType } from '@/app/lib/file-types/data';
import { 
    getOrCreateCheckpoints,
    linkCheckpointsToGeneration,
 } from '@/app/lib/checkpoints/data';
import { 
    getOrCreateLoras,
    linkLorasToGeneration,
 } from '@/app/lib/loras/data';

export async function saveGenerationEntry(
    imagePath: string,
) {
    const resolvedImagePath = path.resolve(process.cwd(), imagePath);

    try {
        const file_type = path.extname(imagePath).substring(1).toLowerCase(); // Get the file extension without the dot
        const file_type_id = await getOrCreateFileType(file_type); // Get or create the file type

        // Get EXIF data from the image
        const exifResult = await getExifDataFromImage(imagePath);

        if (!exifResult.success || exifResult.metadata === undefined) {
            throw new Error(exifResult.error);
        }

        const metadata = exifResult.metadata;

        // Check for Checkpoints
        const ckpts = extractCkptNamesFromExifData(exifResult.metadata);
        const ckptIds = await getOrCreateCheckpoints(ckpts);

        // Check for Loras
        const loras = extractLoraNamesFromExifData(exifResult.metadata);
        const loraIds = await getOrCreateLoras(loras);

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
        const generationId = result.rows[0].id;

        // Link Checkpoints and Loras
        await linkCheckpointsToGeneration(ckptIds, generationId);
        await linkLorasToGeneration(loraIds, generationId);

        return { success: true, generationId };
    } catch (error) {
        console.error('Failed to save generation entry:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}
