import { describe, it, expect, vi } from 'vitest'
import type { Request, Response } from 'express'
import { errorHandler } from './errorHandler.js'
import {
    TableNotFoundError,
    TableNotAvailableError,
    TableOccupiedError,
    InvalidTableStatusError,
    DishNotFoundError
} from '@errors/DomainErrors.js'

function invoke(err: unknown) {
    const json = vi.fn()
    const status = vi.fn().mockReturnValue({ json })
    errorHandler(err, {} as Request, { status } as unknown as Response, vi.fn())
    return { status, json }
}

describe('errorHandler', () => {
    it('should map TableNotFoundError to 404', () => {
        const { status, json } = invoke(new TableNotFoundError())
        expect(status).toHaveBeenCalledWith(404)
        expect(json).toHaveBeenCalledWith({ error: 'TableNotFoundError', message: 'Table not found' })
    })

    it('should map TableNotAvailableError to 409', () => {
        const { status, json } = invoke(new TableNotAvailableError())
        expect(status).toHaveBeenCalledWith(409)
        expect(json).toHaveBeenCalledWith({ error: 'TableNotAvailableError', message: 'Table is not available' })
    })

    it.each([new TableOccupiedError(), new InvalidTableStatusError()])('should keep 400 for %s', (err) => {
        expect(invoke(err).status).toHaveBeenCalledWith(400)
    })

    it('should keep existing mappings', () => {
        expect(invoke(new DishNotFoundError()).status).toHaveBeenCalledWith(404)
    })

    it('should map unknown errors to 500', () => {
        expect(invoke(new Error('boom')).status).toHaveBeenCalledWith(500)
    })
})
