import { connectionPool } from '@/db';

// Helper function to insert a new file type if it doesn't exist
export async function getOrCreateFileType(fileType: string | undefined): Promise<number> {
    if (!fileType) throw new Error('File extension is missing');

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