import { randomUUID } from 'crypto'
import type { Table } from '@models/table.model.js'
import { normalizeTableStatus } from '@models/table.model.js'
import type { TableRepository } from '@repositories/table.repository.js'
import {
    DuplicatedTableNumberError,
    InvalidTableNumberError,
    InvalidTableCapacityError,
    RestaurantIdRequiredError,
    TableNotFoundError,
    TableOccupiedError
} from '@errors/DomainErrors.js'

export interface CreateTableDTO {
    number: number
    description?: string | null
    capacity: number
    status?: string
    restaurantId: string
}

export interface UpdateTableDTO {
    number: number
    description?: string | null
    capacity: number
}

export class TableService {
    constructor(private readonly tableRepository: TableRepository) {}

    async create(dto: CreateTableDTO): Promise<Table> {
        if (!dto.restaurantId || dto.restaurantId.trim() === '') {
            throw new RestaurantIdRequiredError()
        }
        this.validateNumber(dto.number)
        this.validateCapacity(dto.capacity)
        const status = dto.status === undefined ? 'libre' : normalizeTableStatus(dto.status)
        await this.ensureNumberIsFree(dto.restaurantId, dto.number)

        const now = new Date().toISOString()
        const table: Table = {
            id: randomUUID(),
            number: dto.number,
            description: dto.description ?? null,
            capacity: dto.capacity,
            status,
            restaurantId: dto.restaurantId,
            createdAt: now,
            updatedAt: now
        }

        await this.tableRepository.save(table)
        return table
    }

    async update(id: string, dto: UpdateTableDTO): Promise<Table> {
        const existing = await this.tableRepository.findById(id)
        if (!existing) {
            throw new TableNotFoundError()
        }
        this.validateNumber(dto.number)
        this.validateCapacity(dto.capacity)
        await this.ensureNumberIsFree(existing.restaurantId, dto.number, existing.id)

        const updated: Table = {
            ...existing,
            number: dto.number,
            description: dto.description ?? null,
            capacity: dto.capacity,
            updatedAt: new Date().toISOString()
        }

        await this.tableRepository.save(updated)
        return updated
    }

    async updateStatus(id: string, status: string): Promise<Table> {
        const normalizedStatus = normalizeTableStatus(status)
        const existing = await this.tableRepository.findById(id)
        if (!existing) {
            throw new TableNotFoundError()
        }

        const updated: Table = { ...existing, status: normalizedStatus, updatedAt: new Date().toISOString() }
        await this.tableRepository.save(updated)
        return updated
    }

    async delete(id: string): Promise<void> {
        const existing = await this.tableRepository.findById(id)
        if (!existing) {
            throw new TableNotFoundError()
        }
        if (existing.status === 'ocupada') {
            throw new TableOccupiedError()
        }
        await this.tableRepository.delete(id)
    }

    async findById(id: string): Promise<Table | null> {
        return this.tableRepository.findById(id)
    }

    async findByRestaurantId(restaurantId: string): Promise<Table[]> {
        return this.tableRepository.findByRestaurantId(restaurantId)
    }

    private validateNumber(value: unknown): void {
        if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
            throw new InvalidTableNumberError()
        }
    }

    private validateCapacity(value: unknown): void {
        if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
            throw new InvalidTableCapacityError()
        }
    }

    private async ensureNumberIsFree(restaurantId: string, number: number, excludeId?: string): Promise<void> {
        const tables = await this.tableRepository.findByRestaurantId(restaurantId)
        if (tables.some(t => t.number === number && t.id !== excludeId)) {
            throw new DuplicatedTableNumberError()
        }
    }
}
