import { describe, expect, test } from 'bun:test'
import { parseMasterlistCsv } from '../src/helpers/csv.helpers'
import {
  buildPaginationMeta,
  parsePagination,
} from '../src/helpers/pagination.helpers'

describe('parseMasterlistCsv', () => {
  test('parses a standard Name, Reg No file', () => {
    const result = parseMasterlistCsv('Name,Reg No\nAda Lovelace,REG001\nAlan Turing,REG002\n')

    expect(result.errors).toEqual([])
    expect(result.students).toEqual([
      { name: 'Ada Lovelace', regNo: 'REG001' },
      { name: 'Alan Turing', regNo: 'REG002' },
    ])
  })

  test('ignores extra columns and accepts synonyms', () => {
    const result = parseMasterlistCsv(
      'S/N,Full Name,Registration Number,Department\n1,"Doe, Jane",2022/1,CS\n'
    )

    expect(result.errors).toEqual([])
    expect(result.students).toEqual([
      { name: 'Doe, Jane', regNo: '2022/1' },
    ])
  })

  test('supports tab-separated files', () => {
    const result = parseMasterlistCsv('Name\tReg No\nAda Lovelace\tREG001\n')

    expect(result.students).toEqual([{ name: 'Ada Lovelace', regNo: 'REG001' }])
  })

  test('reports duplicates within the upload', () => {
    const result = parseMasterlistCsv(
      'Name,Reg No\nAda Lovelace,REG001\nAda Again,reg001\n'
    )

    expect(result.students).toHaveLength(1)
    expect(result.errors[0]?.line).toBe(3)
    expect(result.errors[0]?.message).toContain('Duplicate registration number')
  })

  test('rejects a file without a header row', () => {
    const result = parseMasterlistCsv('Ada Lovelace,REG001\n')

    expect(result.students).toEqual([])
    expect(result.errors[0]?.message).toContain('Missing header row')
  })

  test('reports rows missing a registration number', () => {
    const result = parseMasterlistCsv('Name,Reg No\nAda Lovelace,\n')

    expect(result.students).toEqual([])
    expect(result.errors[0]?.message).toContain('Missing registration number')
  })
})

describe('pagination helpers', () => {
  test('uses defaults for invalid input', () => {
    expect(parsePagination({})).toEqual({ page: 1, limit: 20, offset: 0 })
    expect(parsePagination({ page: '-2', limit: 'abc' })).toEqual({
      page: 1,
      limit: 20,
      offset: 0,
    })
  })

  test('clamps the page size', () => {
    expect(parsePagination({ page: '3', limit: '9999' })).toEqual({
      page: 3,
      limit: 100,
      offset: 200,
    })
  })

  test('builds metadata with an empty result', () => {
    expect(buildPaginationMeta(0, 1, 20)).toEqual({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    })
  })

  test('builds metadata for the last page', () => {
    expect(buildPaginationMeta(458, 23, 20)).toEqual({
      page: 23,
      limit: 20,
      total: 458,
      totalPages: 23,
      hasNextPage: false,
      hasPreviousPage: true,
    })
  })
})
