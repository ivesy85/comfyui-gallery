import { connectionPool } from '@/db';

export async function saveNodesIfNotExisting(nodes: string[]) {
    const ids: Record<string, number> = {}; // Object to store ids with names as keys

    // Step 1: Query to find existing nodes by name
    const result = await connectionPool.query(
        'SELECT id, name FROM nodes WHERE name = ANY($1::text[])',
        [nodes]
    );

    const existingNodes = result.rows;

    // Store the existing IDs in the ids object using the name as the key
    existingNodes.forEach((row) => {
        ids[row.name] = row.id;
    });

    // Step 2: Find objects where the 'name' is not in the database
    const missingNodes = nodes.filter((node) => !ids[node]);

    // Step 3: Insert missing nodes
    if (missingNodes.length > 0) {
        const insertQuery = `
            INSERT INTO nodes (name)
            VALUES ${missingNodes.map((_, i) => `($${i + 1})`).join(', ')}
            RETURNING id, name
        `;

        const insertParams = missingNodes.flatMap((node) => [node]);

        const insertResult = await connectionPool.query(insertQuery, insertParams);

        // Store the new IDs in the ids object using the name as the key
        insertResult.rows.forEach((row) => {
            ids[row.name] = row.id;
        });
    }

    return ids;
}
