import { connectionPool } from '@/db';
import { Generation } from './definitions';
import path from 'path';
import fs from 'fs';
import {
    getExifDataFromImage,
    extractCkptNamesFromExifData,
    extractLoraNamesFromExifData,
    extractPromptsFromExifData,
    extractKsamplersFromExifData,
    extractNodeNamesFromExifData,
} from './utils';
import { getOrCreateFileType } from '@/app/lib/file-types/data';
import { saveNodesIfNotExisting } from '@/app/lib/nodes/data';
import { 
    getOrCreateComfyCheckpoints,
    getOrCreateAuto1111Checkpoints,
    linkCheckpointsToGeneration,
 } from '@/app/lib/checkpoints/data';
import { 
    getOrCreateLoras,
    linkLorasToGeneration,
 } from '@/app/lib/loras/data';
 import {
    getOrCreateComfyPrompts,
    getOrCreateAuto1111Prompts,
 } from '@/app/lib/prompts/data'
 import {
     createAuto1111KSamplers,
    createComfyKSamplers,
    linkKSamplersToGeneration,
 } from '@/app/lib/ksamplers/data'



const ITEMS_PER_PAGE = 32;
function constructGenerationsQuery(
    count: boolean,
    exif: string,
    checkpoints: string,
    loras: string,
    currentPage?: number
) {
    let query = '';

    if (count) {
        query += 'SELECT COUNT(*) FROM generations';
    } else {
        query += `
            SELECT
                generations.id,
                generations.file_type_id,
                generations.source,
                generations.name,
                generations.file_location,
                generations.width,
                generations.height,
                generations.framerate,
                generations.rating,
                generations.date_created,
                generations.size,
                generations.raw_json
            FROM generations
        `;
    }

    let joins: string = '';
    const conditions: string[] = [];
    const params: (string | number[] | number)[] = [];

    if (exif) {
        conditions.push(`generations.raw_json::text ILIKE $${params.length + 1}`);
        params.push(`%${exif}%`);
    }

    if (checkpoints) {
        const checkpointIds = decodeURIComponent(checkpoints)
            .split(',')
            .map(id => Number(id))
            .filter(id => !isNaN(id));
        joins += `
            JOIN (
                SELECT generation_id
                FROM generation_checkpoints
                WHERE checkpoint_id = ANY($${params.length + 1}::int[])
                GROUP BY generation_id
                HAVING COUNT(DISTINCT checkpoint_id) = ${checkpointIds.length}
            ) checkpoint_filter
            ON generations.id = checkpoint_filter.generation_id
        `;
        params.push(checkpointIds);
    }

    if (loras) {
        const loraIds = decodeURIComponent(loras)
            .split(',')
            .map(id => Number(id))
            .filter(id => !isNaN(id));
        joins += `
            JOIN (
                SELECT generation_id
                FROM generation_loras
                WHERE lora_id = ANY($${params.length + 1}::int[])
                GROUP BY generation_id
                HAVING COUNT(DISTINCT lora_id) = ${loraIds.length}
            ) lora_filter
            ON generations.id = lora_filter.generation_id
        `;
        params.push(loraIds);
    }

    if (joins) {
        query += joins;
    }

    if (conditions.length > 0) {
        query += ` WHERE ` + conditions.join(' AND ');
    }

    if (currentPage) {
        const offset = (currentPage - 1) * ITEMS_PER_PAGE;

        query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(ITEMS_PER_PAGE, offset);
    }

    return { query, params };
}

export async function fetchFilteredGenerations(
    exif: string,
    checkpoints: string,
    loras: string,
    currentPage: number
) {
    const { query, params } = constructGenerationsQuery(false, exif, checkpoints, loras, currentPage);

    try {
        const result = await connectionPool.query<Generation>(query, params);

        return result.rows;
    } catch (error) {
        console.error('Database Error:', error);
        throw new Error('Failed to fetch generations.');
    }
}

export async function fetchGenerationData(generationId: string) {
    try {
        const result = await connectionPool.query<Generation>(
            `
                SELECT
                    generations.id,
                    generations.file_type_id,
                    generations.source,
                    generations.name,
                    generations.file_location,
                    generations.width,
                    generations.height,
                    generations.framerate,
                    generations.rating,
                    generations.date_created,
                    generations.size,
                    generations.raw_json
                FROM generations
                WHERE id = $1
            `, 
            [generationId]
        );

        return result.rows[0] || null; 
    } catch (error) {
        console.error('Database Error:', error);
        throw new Error('Failed to fetch generation.');
    }
}

export async function fetchGenerationsPages(
    exif: string,
    checkpoints: string,
    loras: string
) {
    const { query, params } = constructGenerationsQuery(true, exif, checkpoints, loras);

    try {
        const count = await connectionPool.query(query, params);
    
        const totalPages = Math.ceil(Number(count.rows[0].count) / ITEMS_PER_PAGE);
        return totalPages;
    } catch (error) {
        console.error('Database Error:', error);
        throw new Error('Failed to fetch total number of generations.');
    }
  }

  export async function saveGenerationEntry(
    imagePath: string,
    update: boolean = false
) {
    let generationId: number | null = null;

    const resolvedImagePath = path.resolve(process.cwd(), imagePath);

    // Check if the file type already exists
    const result = await connectionPool.query<{ id: number }>('SELECT id FROM generations WHERE file_location = $1', [resolvedImagePath]);

    if (result.rows.length > 0) {
        // Already exists in db
        generationId = result.rows[0].id;
        if (update) {
            // Delete prior entry
            await connectionPool.query(
                `
                    DELETE FROM generation_checkpoints WHERE generation_id = $1;
                    DELETE FROM generation_loras WHERE generation_id = $1;
                    DELETE FROM generations WHERE id = $1;
                `,
                [generationId]
            );
        } else {
            return { success: true, generationId };
        }
    }

    try {
        const file_type = path.extname(imagePath).substring(1).toLowerCase(); // Get the file extension without the dot
        const file_type_id = await getOrCreateFileType(file_type); // Get or create the file type

        // Get EXIF data from the image
        const exifResult = await getExifDataFromImage(imagePath);

        if (!exifResult.success || exifResult.metadata === undefined) {
            throw new Error(exifResult.error);
        }

        const metadata = exifResult.metadata;

        // Extract and save CoomfyUI Nodes used
        const nodes = extractNodeNamesFromExifData(exifResult.metadata);
        await saveNodesIfNotExisting(nodes);

        // Save or get Checkpoints
        const ckpts = extractCkptNamesFromExifData(exifResult.metadata);
        const comfyCkptsWithIds = ckpts.comfyUI.length > 0 ? await getOrCreateComfyCheckpoints(ckpts.comfyUI) : [];
        const auto1111CkptsWithIds = ckpts.auto1111.length > 0 ? await getOrCreateAuto1111Checkpoints(ckpts.auto1111) : [];

        const source = typeof exifResult.metadata.prompt === 'object' ? 'ComfyUI' : 'Automatic1111';

        // Save or get Loras
        const loras = extractLoraNamesFromExifData(exifResult.metadata);
        const comfyLorasWithIds = loras.comfyUI.length > 0 ? await getOrCreateLoras(loras.comfyUI) : [];
        const auto1111LorasWithIds = loras.auto1111.length > 0 ? await getOrCreateLoras(loras.auto1111) : [];

        // Save or get Prompts
        const prompts = extractPromptsFromExifData(exifResult.metadata);
        const comfyPromptsWithIds = prompts.comfyUI.length > 0 ? await getOrCreateComfyPrompts(prompts.comfyUI) : [];
        const auto1111PromptsWithIds = prompts.auto1111.length > 0 ? await getOrCreateAuto1111Prompts(prompts.auto1111) : [];

        // Save KSamplers
        const kSamplers = extractKsamplersFromExifData(exifResult.metadata);
        const comfyKSamplersWithIds = kSamplers.length > 0 ? await createComfyKSamplers(kSamplers, comfyCkptsWithIds, comfyPromptsWithIds, exifResult.metadata) : [];
        const auto1111KSamplersWithIds = auto1111CkptsWithIds.length > 0 ? await createAuto1111KSamplers(auto1111CkptsWithIds, auto1111PromptsWithIds, exifResult.metadata) : [];

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
        const result = await connectionPool.query<{ id: number }>(
            `INSERT INTO generations (
                file_type_id,
                source,
                name,
                file_location,
                width,
                height,
                date_created,
                size,
                raw_json
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
            [file_type_id, source, name, fileLocation, width, height, imageCreationDate, size, rawJson]
        );
        generationId = result.rows[0].id;

        // Link Checkpoints and Loras
        if (comfyCkptsWithIds.length > 0) {
            await linkCheckpointsToGeneration(comfyCkptsWithIds, generationId);
        }
        if (auto1111CkptsWithIds.length > 0) {
            await linkCheckpointsToGeneration(auto1111CkptsWithIds, generationId);
        }
        if (comfyLorasWithIds.length > 0) {
            await linkLorasToGeneration(comfyLorasWithIds, generationId);
        }
        if (auto1111LorasWithIds.length > 0) {
            await linkLorasToGeneration(auto1111LorasWithIds, generationId);
        }
        if (comfyKSamplersWithIds.length > 0) {
            await linkKSamplersToGeneration(comfyKSamplersWithIds, generationId);
        }
        if (auto1111KSamplersWithIds.length > 0) {
            await linkKSamplersToGeneration(auto1111KSamplersWithIds, generationId);
        }

        return { success: true, generationId };
    } catch (error) {
        console.error('Failed to save generation entry:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

export async function getGenerationLocations(): Promise<string[]> {
    try {
        const result = await connectionPool.query(`
            SELECT location
            FROM generation_locations;
        `);

        // Return an array of location strings
        return result.rows.map(row => row.location);
    } catch (error) {
        console.error('Error fetching generation locations:', error);
        throw new Error('Failed to fetch generation locations');
    }
}

export async function processAllGenerationLocations() {
    try {
        // Step 1: Retrieve all directory locations
        const locations = await getGenerationLocations();

        // Step 2: Loop through each location and call findAndProcessPngFiles
        for (const location of locations) {
            console.log(`Processing PNG files in directory: ${location}`);
            await findAndProcessPngFiles(location); // Assuming this is the previously defined function
        }
    } catch (error) {
        console.error('Error processing generation locations:', error);
        throw new Error('Failed to process generation locations');
    }
}

export async function findAndProcessPngFiles(dirPath: string) {
    // Read all files and directories in the given path
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
        const filePath = path.join(dirPath, file);

        // Get stats to determine if it's a file or directory
        const fileStats = fs.statSync(filePath);

        if (fileStats.isDirectory()) {
            // If it's a directory, recursively call findAndProcessPngFiles
            await findAndProcessPngFiles(filePath);
        } else if (fileStats.isFile() && path.extname(file).toLowerCase() === '.png') {
            // If it's a PNG file, call the processing function
            await saveGenerationEntry(filePath);
        }
    }
}
