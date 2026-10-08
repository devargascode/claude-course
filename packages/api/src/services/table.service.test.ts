import { describe, it, expect, beforeEach } from 'vitest'
import { TableService } from './table.service.js'
import { MockTableRepository } from '@repositories/mocks/MockTableRepository.js'
import {
    DuplicatedTableNumberError,
    InvalidTableNumberError,
    InvalidTableCapacityError,
    InvalidTableStatusError
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
})
