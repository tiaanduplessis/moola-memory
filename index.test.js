'use strict'

const cache = require('./')

test('should be defined', () => {
  expect(cache).toBeDefined()
})

test('should return a function', () => {
  expect(typeof cache()).toBe('function')
})
