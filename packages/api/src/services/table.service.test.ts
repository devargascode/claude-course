import { describe, it, expect, beforeEach } from 'vitest'
import { TableService } from './table.service.js'
import { MockTableRepository } from '@repositories/mocks/MockTableRepository.js'
import {
    DuplicatedTableNumberError,
    InvalidTableNumberError,
    InvalidTableCapacityError,
    InvalidTableStatusError,
    TableNotFoundError,
    TableOccupiedError
} from '@errors/DomainErrors.js'

describe('TableService', () => {
    let repo: MockTableRepository
    let service: TableService

    const validInput = {
        number: 1,
        description: 'Window table',
        capacity: 4,
        restaurantId: 'r1'
    }

    beforeEach(() => {
        repo = new MockTableRepository()
        service = new TableService(repo)
    })

    describe('create', () => {
        it('should create a table with status libre by default', async () => {
            const table = await service.create(validInput)

            expect(table.id).toBeTruthy()
            expect(table.number).toBe(1)
            expect(table.description).toBe('Window table')
            expect(table.capacity).toBe(4)
            expect(table.status).toBe('libre')
            expect(table.restaurantId).toBe('r1')
            expect(table.createdAt).toBe(table.updatedAt)
            expect(await repo.findById(table.id)).toEqual(table)
        })

        it('should accept an explicit status and normalize it', async () => {
            const table = await service.create({ ...validInput, status: 'RESERVADA' })
            expect(table.status).toBe('reservada')
        })

        it('should store a null description when it is omitted', async () => {
            const { description: _description, ...rest } = validInput
            const table = await service.create(rest)
            expect(table.description).toBeNull()
        })

        it('should reject an invalid status', async () => {
            await expect(service.create({ ...validInput, status: 'roto' })).rejects.toThrow(InvalidTableStatusError)
        })

        it.each([0, -1, 1.5, NaN, undefined, '3'])('should reject number %s', async (number) => {
            await expect(service.create({ ...validInput, number: number as number })).rejects.toThrow(InvalidTableNumberError)
        })

        it.each([0, -2, 2.5, NaN, undefined, '4'])('should reject capacity %s', async (capacity) => {
            await expect(service.create({ ...validInput, capacity: capacity as number })).rejects.toThrow(InvalidTableCapacityError)
        })

        it('should reject a duplicated number in the same restaurant', async () => {
            await service.create(validInput)
            await expect(service.create(validInput)).rejects.toThrow(DuplicatedTableNumberError)
        })

        it('should allow the same number in a different restaurant', async () => {
            await service.create(validInput)
            await expect(service.create({ ...validInput, restaurantId: 'r2' })).resolves.toBeDefined()
        })
    })

    describe('update', () => {
        it('should update number, description and capacity but keep status and restaurant', async () => {
            const created = await service.create({ ...validInput, status: 'reservada' })

            const updated = await service.update(created.id, { number: 5, description: 'Terrace', capacity: 6 })

            expect(updated).toMatchObject({
                id: created.id,
                number: 5,
                description: 'Terrace',
                capacity: 6,
                status: 'reservada',
                restaurantId: 'r1',
                createdAt: created.createdAt
            })
            expect(await repo.findById(created.id)).toEqual(updated)
        })

        it('should allow keeping the same number', async () => {
            const created = await service.create(validInput)
            await expect(service.update(created.id, { number: 1, description: null, capacity: 2 })).resolves.toMatchObject({ number: 1, description: null })
        })

        it('should throw TableNotFoundError when the table does not exist', async () => {
            await expect(service.update('missing', { number: 1, capacity: 2 })).rejects.toThrow(TableNotFoundError)
        })

        it('should reject an invalid number or capacity', async () => {
            const created = await service.create(validInput)
            await expect(service.update(created.id, { number: 0, capacity: 2 })).rejects.toThrow(InvalidTableNumberError)
            await expect(service.update(created.id, { number: 1, capacity: 0 })).rejects.toThrow(InvalidTableCapacityError)
        })

        it('should reject a number used by another table of the same restaurant', async () => {
            await service.create(validInput)
            const second = await service.create({ ...validInput, number: 2 })
            await expect(service.update(second.id, { number: 1, capacity: 4 })).rejects.toThrow(DuplicatedTableNumberError)
        })
    })

    describe('findById and findByRestaurantId', () => {
        it('should return the table or null', async () => {
            const created = await service.create(validInput)
            expect(await service.findById(created.id)).toEqual(created)
            expect(await service.findById('missing')).toBeNull()
        })

        it('should list only the tables of the restaurant', async () => {
            const a = await service.create(validInput)
            await service.create({ ...validInput, restaurantId: 'r2' })
            expect(await service.findByRestaurantId('r1')).toEqual([a])
        })
    })

    describe('delete', () => {
        it('should delete a free table', async () => {
            const created = await service.create(validInput)
            await service.delete(created.id)
            expect(await repo.findById(created.id)).toBeNull()
        })

        it('should delete a reserved table', async () => {
            const created = await service.create({ ...validInput, status: 'reservada' })
            await service.delete(created.id)
            expect(await repo.findById(created.id)).toBeNull()
        })

        it('should reject deleting an occupied table', async () => {
            const created = await service.create({ ...validInput, status: 'ocupada' })
            await expect(service.delete(created.id)).rejects.toThrow(TableOccupiedError)
            expect(await repo.findById(created.id)).not.toBeNull()
        })

        it('should throw TableNotFoundError when the table does not exist', async () => {
            await expect(service.delete('missing')).rejects.toThrow(TableNotFoundError)
        })
    })
})
