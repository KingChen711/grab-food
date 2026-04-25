import { csvRowsToObjects, parseCsv } from './csv-parser.util'

describe('parseCsv', () => {
  it('parses a simple CSV', () => {
    const result = parseCsv('a,b,c\n1,2,3\n4,5,6')
    expect(result).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
      ['4', '5', '6'],
    ])
  })

  it('handles quoted fields with commas', () => {
    const result = parseCsv('name,description\nPhở,"Beef, noodle, soup"')
    expect(result).toEqual([
      ['name', 'description'],
      ['Phở', 'Beef, noodle, soup'],
    ])
  })

  it('handles escaped quotes ("" inside a quoted field)', () => {
    const result = parseCsv('a,b\n"He said ""hi""",world')
    expect(result).toEqual([
      ['a', 'b'],
      ['He said "hi"', 'world'],
    ])
  })

  it('handles CRLF line endings', () => {
    const result = parseCsv('a,b\r\n1,2\r\n3,4')
    expect(result).toEqual([
      ['a', 'b'],
      ['1', '2'],
      ['3', '4'],
    ])
  })

  it('skips empty trailing rows', () => {
    const result = parseCsv('a,b\n1,2\n\n')
    expect(result).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })
})

describe('csvRowsToObjects', () => {
  it('zips rows with header', () => {
    const result = csvRowsToObjects([
      ['name', 'price'],
      ['Phở', '75000'],
      ['Bún', '60000'],
    ])
    expect(result).toEqual([
      { name: 'Phở', price: '75000' },
      { name: 'Bún', price: '60000' },
    ])
  })

  it('fills missing trailing cells with empty string', () => {
    const result = csvRowsToObjects([
      ['name', 'description', 'price'],
      ['Phở', '', '75000'],
      ['Bún'], // only one cell
    ])
    expect(result).toEqual([
      { name: 'Phở', description: '', price: '75000' },
      { name: 'Bún', description: '', price: '' },
    ])
  })

  it('throws on empty CSV', () => {
    expect(() => csvRowsToObjects([])).toThrow('CSV is empty')
  })
})
