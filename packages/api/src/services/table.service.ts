import { randomUUID } from 'crypto'
import type { Table } from '@models/table.model.js'
import { normalizeTableStatus } from '@models/table.model.js'
import type { TableRepository } from '@repositories/table.repository.js'
import {
    DuplicatedTableNumberError,
    InvalidTableNumberError,
    InvalidTableCapacityError,
    RestaurantIdRequiredError
} from '@errors/DomainErrors.js'

export interface CreateTableDTO {
    number: number
    description?: string | null
    capacity: number
    status?: string
    restaurantId: string
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
