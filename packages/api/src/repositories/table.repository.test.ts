import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Database } from '@config/database.js'

describe('tables migration', () => {
    let db: Database

    const insertTable = (id: string, number: number, restaurantId: string) =>
        db.run(
            'INSERT INTO tables (id, number, description, capacity, status, restaurant_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, number, null, 4, 'libre', restaurantId, 'now', 'now']
        )

    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        db = new Database()
        await db.initialize()
        for (const id of ['r1', 'r2']) {
            await db.run(
                'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [id, 'Rest', 'Street 1', 'a@b.com', '600000000', 'Own', 'Er', 'now', 'now']
            )
        }
    })

    afterAll(async () => {
        await db.close()
    })

    it('should create the tables table', async () => {
        const row = await db.get<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'tables'")
        expect(row?.name).toBe('tables')
    })

    it('should default status to libre', async () => {
        await db.run(
            'INSERT INTO tables (id, number, capacity, restaurant_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
            ['t0', 99, 2, 'r1', 'now', 'now']
        )
        const row = await db.get<{ status: string }>('SELECT status FROM tables WHERE id = ?', ['t0'])
        expect(row?.status).toBe('libre')
    })

    it('should reject a duplicated number in the same restaurant', async () => {
        await insertTable('t1', 1, 'r1')
        await expect(insertTable('t2', 1, 'r1')).rejects.toThrow(/UNIQUE/)
    })

    it('should allow the same number in different restaurants', async () => {
        await expect(insertTable('t3', 1, 'r2')).resolves.toBeDefined()
    })
})
