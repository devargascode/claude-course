import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import app from '../app.js'
import { dbConfig } from '@config/database.js'

const url = (restaurantId: string, query = '') => `/api/v1/public/restaurants/${restaurantId}/tables/available${query}`

describe('public table routes', () => {
    beforeAll(async () => {
        await dbConfig.initialize()
        for (const id of ['r1', 'r2']) {
            await dbConfig.run(
                'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [id, 'Rest', 'Street 1', 'a@b.com', '600000000', 'Own', 'Er', 'now', 'now']
            )
        }
        const tables: Array<[string, number, number, string, string]> = [
            ['t1', 1, 6, 'libre', 'r1'],
            ['t2', 2, 4, 'libre', 'r1'],
            ['t3', 3, 4, 'libre', 'r1'],
            ['t4', 4, 2, 'libre', 'r1'],
            ['t5', 5, 8, 'ocupada', 'r1'],
            ['t6', 6, 8, 'reservada', 'r1'],
            ['t7', 1, 8, 'libre', 'r2']
        ]
        for (const [id, number, capacity, status, restaurantId] of tables) {
            await dbConfig.run(
                'INSERT INTO tables (id, number, description, capacity, status, restaurant_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [id, number, null, capacity, status, restaurantId, 'now', 'now']
            )
        }
    })

    afterAll(async () => {
        await dbConfig.close()
    })

    it('should return free tables with enough capacity, ordered, without authentication', async () => {
        const res = await request(app).get(url('r1', '?partySize=3'))

        expect(res.status).toBe(200)
        expect(res.body.map((t: { id: string }) => t.id)).toEqual(['t2', 't3', 't1'])
        expect(res.body[0]).toEqual({
            id: 't2',
            number: 2,
            description: null,
            capacity: 4,
            status: 'libre',
            restaurantId: 'r1',
            createdAt: 'now',
            updatedAt: 'now'
        })
    })

    it('should not return tables of other restaurants', async () => {
        const res = await request(app).get(url('r2', '?partySize=1'))
        expect(res.body.map((t: { id: string }) => t.id)).toEqual(['t7'])
    })

    it('should return an empty array when no table fits', async () => {
        const res = await request(app).get(url('r1', '?partySize=20'))
        expect(res.status).toBe(200)
        expect(res.body).toEqual([])
    })

    it.each(['', '?partySize=', '?partySize=0', '?partySize=-2', '?partySize=2.5', '?partySize=abc'])(
        'should return 400 InvalidPartySizeError for %j',
        async (query) => {
            const res = await request(app).get(url('r1', query))
            expect(res.status).toBe(400)
            expect(res.body.error).toBe('InvalidPartySizeError')
        }
    )
})
