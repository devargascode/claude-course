import type { Database } from '@config/database.js'

const SAMPLE_TABLES = [
    { id: 'table-rest-1-1', number: 1, description: 'Ventana', capacity: 2, status: 'libre', restaurantId: 'rest-1' },
    { id: 'table-rest-1-2', number: 2, description: 'Terraza', capacity: 4, status: 'libre', restaurantId: 'rest-1' },
    { id: 'table-rest-1-3', number: 3, description: 'Salón principal', capacity: 4, status: 'ocupada', restaurantId: 'rest-1' },
    { id: 'table-rest-1-4', number: 4, description: 'Salón principal', capacity: 6, status: 'libre', restaurantId: 'rest-1' },
    { id: 'table-rest-1-5', number: 5, description: 'Barra', capacity: 8, status: 'reservada', restaurantId: 'rest-1' },
    { id: 'table-rest-2-1', number: 1, description: 'Junto al horno', capacity: 2, status: 'libre', restaurantId: 'rest-2' },
    { id: 'table-rest-2-2', number: 2, description: 'Terraza', capacity: 4, status: 'libre', restaurantId: 'rest-2' },
    { id: 'table-rest-2-3', number: 3, description: 'Salón', capacity: 6, status: 'libre', restaurantId: 'rest-2' },
]

export async function seedTables(db: Database): Promise<void> {
    const now = new Date().toISOString()
    for (const table of SAMPLE_TABLES) {
        await db.run(
            `INSERT OR IGNORE INTO tables (id, number, description, capacity, status, restaurant_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [table.id, table.number, table.description, table.capacity, table.status, table.restaurantId, now, now]
        )
    }
}
