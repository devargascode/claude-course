import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../app.js'
import { dbConfig } from '@config/database.js'

const SECRET = process.env.JWT_SECRET || 'super-secret-resttek-key'
const tokenFor = (role: string) => `Bearer ${jwt.sign({ id: `u-${role}`, role }, SECRET)}`

const BASE = '/api/v1/restaurants/r1/tables'

describe('table routes', () => {
    beforeAll(async () => {
        await dbConfig.initialize()
        await dbConfig.run(
            'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            ['r1', 'Rest', 'Street 1', 'a@b.com', '600000000', 'Own', 'Er', 'now', 'now']
        )
    })

    afterAll(async () => {
        await dbConfig.close()
    })

    const createTable = async (body: object) =>
        request(app).post(BASE).set('Authorization', tokenFor('admin')).send(body)

    describe('authentication and authorization', () => {
        it('should return 401 without token', async () => {
            expect((await request(app).get(BASE)).status).toBe(401)
            expect((await request(app).post(`${BASE}/x/occupy`)).status).toBe(401)
        })

        it('should return 403 when a non-admin creates, updates or deletes', async () => {
            for (const role of ['manager', 'camarero', 'cocinero', 'cliente']) {
                const auth = tokenFor(role)
                expect((await request(app).post(BASE).set('Authorization', auth).send({ number: 1, capacity: 2 })).status).toBe(403)
                expect((await request(app).put(`${BASE}/x`).set('Authorization', auth).send({})).status).toBe(403)
                expect((await request(app).delete(`${BASE}/x`).set('Authorization', auth)).status).toBe(403)
            }
        })

        it('should return 403 when a cliente lists, reads or changes the status', async () => {
            const auth = tokenFor('cliente')
            expect((await request(app).get(BASE).set('Authorization', auth)).status).toBe(403)
            expect((await request(app).get(`${BASE}/x`).set('Authorization', auth)).status).toBe(403)
            expect((await request(app).patch(`${BASE}/x/status`).set('Authorization', auth).send({ status: 'libre' })).status).toBe(403)
        })
    })

    describe('CRUD', () => {
        it('should create a table (201) with the documented response shape', async () => {
            const res = await createTable({ number: 1, description: 'Window', capacity: 4 })

            expect(res.status).toBe(201)
            expect(res.body).toEqual({
                id: expect.any(String),
                number: 1,
                description: 'Window',
                capacity: 4,
                status: 'libre',
                restaurantId: 'r1',
                createdAt: expect.any(String),
                updatedAt: expect.any(String)
            })
        })

        it('should return 400 DuplicatedTableNumberError for a repeated number', async () => {
            const res = await createTable({ number: 1, capacity: 2 })
            expect(res.status).toBe(400)
            expect(res.body.error).toBe('DuplicatedTableNumberError')
        })

        it('should return 400 for invalid capacity and number', async () => {
            expect((await createTable({ number: 2, capacity: 0 })).body.error).toBe('InvalidTableCapacityError')
            expect((await createTable({ number: 0, capacity: 2 })).body.error).toBe('InvalidTableNumberError')
        })

        it('should list tables for every employee role', async () => {
            for (const role of ['admin', 'manager', 'camarero', 'cocinero']) {
                const res = await request(app).get(BASE).set('Authorization', tokenFor(role))
                expect(res.status).toBe(200)
                expect(res.body).toHaveLength(1)
            }
        })

        it('should get, update and delete a table', async () => {
            const created = (await createTable({ number: 10, capacity: 2 })).body
            const url = `${BASE}/${created.id}`

            const got = await request(app).get(url).set('Authorization', tokenFor('camarero'))
            expect(got.status).toBe(200)
            expect(got.body.id).toBe(created.id)

            const updated = await request(app).put(url).set('Authorization', tokenFor('admin')).send({ number: 11, description: 'Bar', capacity: 3 })
            expect(updated.status).toBe(200)
            expect(updated.body).toMatchObject({ number: 11, description: 'Bar', capacity: 3, status: 'libre' })

            const deleted = await request(app).delete(url).set('Authorization', tokenFor('admin'))
            expect(deleted.status).toBe(204)

            const missing = await request(app).get(url).set('Authorization', tokenFor('admin'))
            expect(missing.status).toBe(404)
            expect(missing.body.error).toBe('TableNotFoundError')
        })

        it('should return 404 when updating or deleting a missing table', async () => {
            const put = await request(app).put(`${BASE}/missing`).set('Authorization', tokenFor('admin')).send({ number: 1, capacity: 2 })
            expect(put.status).toBe(404)
            expect((await request(app).delete(`${BASE}/missing`).set('Authorization', tokenFor('admin'))).status).toBe(404)
        })
    })

    describe('status and occupy', () => {
        it('should let any employee role change the status', async () => {
            const created = (await createTable({ number: 20, capacity: 2 })).body

            for (const [role, status] of [['manager', 'reservada'], ['camarero', 'libre'], ['cocinero', 'ocupada'], ['admin', 'libre']]) {
                const res = await request(app).patch(`${BASE}/${created.id}/status`).set('Authorization', tokenFor(role!)).send({ status })
                expect(res.status).toBe(200)
                expect(res.body.status).toBe(status)
            }
        })

        it('should return 400 for an invalid status and 404 for a missing table', async () => {
            const created = (await createTable({ number: 21, capacity: 2 })).body
            const invalid = await request(app).patch(`${BASE}/${created.id}/status`).set('Authorization', tokenFor('admin')).send({ status: 'roto' })
            expect(invalid.status).toBe(400)
            expect(invalid.body.error).toBe('InvalidTableStatusError')

            const missing = await request(app).patch(`${BASE}/missing/status`).set('Authorization', tokenFor('admin')).send({ status: 'libre' })
            expect(missing.status).toBe(404)
        })

        it('should return 400 TableOccupiedError when deleting an occupied table', async () => {
            const created = (await createTable({ number: 22, capacity: 2, status: 'ocupada' })).body
            const res = await request(app).delete(`${BASE}/${created.id}`).set('Authorization', tokenFor('admin'))
            expect(res.status).toBe(400)
            expect(res.body.error).toBe('TableOccupiedError')
        })

        it('should let a cliente occupy a free table once and return 409 the second time', async () => {
            const created = (await createTable({ number: 30, capacity: 2 })).body
            const url = `${BASE}/${created.id}/occupy`

            const first = await request(app).post(url).set('Authorization', tokenFor('cliente'))
            expect(first.status).toBe(200)
            expect(first.body).toMatchObject({ id: created.id, status: 'ocupada' })

            const second = await request(app).post(url).set('Authorization', tokenFor('cliente'))
            expect(second.status).toBe(409)
            expect(second.body.error).toBe('TableNotAvailableError')
        })

        it('should return 404 when occupying a missing table', async () => {
            const res = await request(app).post(`${BASE}/missing/occupy`).set('Authorization', tokenFor('cliente'))
            expect(res.status).toBe(404)
        })

        it('should let only one of two concurrent occupy requests win', async () => {
            const created = (await createTable({ number: 31, capacity: 2 })).body
            const url = `${BASE}/${created.id}/occupy`

            const responses = await Promise.all([
                request(app).post(url).set('Authorization', tokenFor('cliente')),
                request(app).post(url).set('Authorization', tokenFor('cliente'))
            ])

            expect(responses.map(r => r.status).sort()).toEqual([200, 409])
        })
    })
})
