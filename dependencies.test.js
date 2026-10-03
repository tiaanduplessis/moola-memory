'use strict'

const lodash = require('lodash')
const template = require('lodash/template')
const fromPairs = require('lodash/fromPairs')

// These dependency probes do not imply that middleware input reaches lodash.
// Private constructors keep built-in prototypes untouched.
test('the development lock resolves the patched CommonJS lodash build', () => {
  expect(lodash.VERSION).toBe('4.18.1')
  expect(lodash.get({ nested: { value: 'ok' } }, 'nested.value')).toBe('ok')
})

test('modular template supports ordinary interpolation and imports', () => {
  const render = template('<%= label(data.name) %>', {
    variable: 'data',
    imports: { label: name => 'Hello ' + name }
  })
  expect(render({ name: 'fixture' })).toBe('Hello fixture')
})

test('modular fromPairs builds an ordinary object', () => {
  expect(fromPairs([['name', 'fixture'], ['count', 2]])).toEqual({
    name: 'fixture',
    count: 2
  })
})
;['unset', 'omit'].forEach(method => {
  ;[
    ['ordinary', 'constructor.prototype.sentinel'],
    ['array-wrapped', [['constructor'], ['prototype'], 'sentinel']]
  ].forEach(fixture => {
    test(
      method + ' preserves a private prototype for ' + fixture[0] + ' paths',
      () => {
        function Fixture () {}
        Fixture.prototype.sentinel = 'preserved'
        const object = { constructor: Fixture }
        lodash[method](object, method === 'omit' ? [fixture[1]] : fixture[1])
        expect(Fixture.prototype.sentinel).toBe('preserved')
      }
    )
  })
})

test('template rejects an invalid imports key with a harmless expression', () => {
  expect(() => template('fixture', { imports: { 'entry = 1': 1 } })).toThrow()
})

test('template rejects an invalid variable with a harmless expression', () => {
  expect(() => template('fixture', { variable: 'data = 1' })).toThrow()
})
