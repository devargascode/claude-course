import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Database } from '@config/database.js'
import { seedTables } from '@scripts/seed-tables.js'

describe('seedTables', () => {
    let db: Database

    const count = async (restaurantId: string) =>
        (await db.get<{ total: number }>('SELECT COUNT(*) as total FROM tables WHERE restaurant_id = ?', [restaurantId]))?.total

    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        db = new Database()
        await db.initialize()
        for (const id of ['rest-1', 'rest-2']) {
            await db.run(
                'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [id, 'Rest', 'Street 1', 'a@b.com', '600000000', 'Own', 'Er', 'now', 'now']
            )
        }
    })

    afterAll(async () => {
        await db.close()
    })

    it('should insert sample tables for both restaurants with the three statuses', async () => {
        await seedTables(db)

        expect(await count('rest-1')).toBeGreaterThan(0)
        expect(await count('rest-2')).toBeGreaterThan(0)
        const statuses = await db.all<{ status: string }>('SELECT DISTINCT status FROM tables ORDER BY status')
        expect(statuses.map(s => s.status)).toEqual(['libre', 'ocupada', 'reservada'])
    })

    it('should not duplicate tables when run twice', async () => {
        const before = [await count('rest-1'), await count('rest-2')]

        await seedTables(db)

        expect([await count('rest-1'), await count('rest-2')]).toEqual(before)
    })
})
