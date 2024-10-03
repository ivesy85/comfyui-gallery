import { connectionPool } from '../../db';
import { Generation } from './generations/definitions';



const ITEMS_PER_PAGE = 30;
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
        //joins += ` JOIN generation_checkpoints ON generations.id = generation_checkpoints.generation_id AND generation_checkpoints.checkpoint_id = ANY($${params.length + 1}::int[])`;
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
        //joins += ` JOIN generation_loras ON generations.id = generation_loras.generation_id AND generation_loras.lora_id = ANY($${params.length + 1}::int[])`;
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
