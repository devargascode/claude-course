import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Database } from '@config/database.js'
import { SqliteTableRepository } from '@repositories/table.repository.js'
import type { Table } from '@models/table.model.js'

describe('SqliteTableRepository', () => {
    let db: Database
    let repo: SqliteTableRepository

    const buildTable = (overrides: Partial<Table> = {}): Table => ({
        id: 't1',
        number: 1,
        description: 'Window',
        capacity: 4,
        status: 'libre',
        restaurantId: 'r1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        ...overrides
    })

    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        db = new Database()
        await db.initialize()
        repo = new SqliteTableRepository(db)
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

    it('should save and find a table by id', async () => {
        await repo.save(buildTable())
        expect(await repo.findById('t1')).toEqual(buildTable())
    })

    it('should return null when the table does not exist', async () => {
        expect(await repo.findById('missing')).toBeNull()
    })

    it('should update an existing table', async () => {
        await repo.save(buildTable({ number: 7, description: null, capacity: 6, status: 'reservada', updatedAt: '2026-02-01T00:00:00.000Z' }))
        const found = await repo.findById('t1')
        expect(found).toMatchObject({ number: 7, description: null, capacity: 6, status: 'reservada', updatedAt: '2026-02-01T00:00:00.000Z' })
    })

    it('should find tables by restaurant', async () => {
        await repo.save(buildTable({ id: 't2', number: 2, restaurantId: 'r2' }))
        const tables = await repo.findByRestaurantId('r2')
        expect(tables.map(t => t.id)).toEqual(['t2'])
    })

    it('should delete a table', async () => {
        await repo.delete('t2')
        expect(await repo.findById('t2')).toBeNull()
    })
})

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
