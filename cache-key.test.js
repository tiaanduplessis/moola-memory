'use strict'

const cache = require('./')
const memory = require('memory-cache')

const request = (url, headers = {}) => ({
  url,
  header: name => headers[name]
})

const dispatch = (middleware, req) => {
  const res = { send: jest.fn(), statusCode: 202 }
  const next = jest.fn()
  middleware(req, res, next)
  return { res, next }
}

beforeEach(() => memory.clear())
afterEach(() => memory.clear())

const cases = [
  [
    'periods in URL and legacy accepts',
    ['/a.b', { accepts: 'c', 'accept-encoding': 'd' }],
    ['/a', { accepts: 'b.c', 'accept-encoding': 'd' }]
  ],
  [
    'periods in legacy accepts and encoding',
    ['/a', { accepts: 'b.c', 'accept-encoding': 'd' }],
    ['/a', { accepts: 'b', 'accept-encoding': 'c.d' }]
  ],
  [
    'standard Accept representations',
    ['/representation', { accept: 'application/json' }],
    ['/representation', { accept: 'text/html' }]
  ],
  [
    'Accept remains independent of legacy accepts',
    ['/representation', { accept: 'application/json', accepts: 'same' }],
    ['/representation', { accept: 'text/html', accepts: 'same' }]
  ],
  [
    'legacy accepts remains independent of Accept',
    ['/representation', { accept: 'application/json', accepts: 'first' }],
    ['/representation', { accept: 'application/json', accepts: 'second' }]
  ],
  [
    'standard Accept and encoding tuple boundaries',
    ['/tuple', { accept: 'a.b', 'accept-encoding': 'c' }],
    ['/tuple', { accept: 'a', 'accept-encoding': 'b.c' }]
  ],
  [
    'JSON punctuation in header values',
    ['/tuple', { accept: 'a","b', accepts: 'c' }],
    ['/tuple', { accept: 'a', accepts: 'b","c' }]
  ],
  [
    'backslashes in header values',
    ['/tuple', { accept: 'a\\', accepts: 'b' }],
    ['/tuple', { accept: 'a', accepts: '\\b' }]
  ],
  [
    'Accept-Encoding',
    ['/encoding', { 'accept-encoding': 'gzip' }],
    ['/encoding', { 'accept-encoding': 'identity' }]
  ],
  ['query strings', ['/items?a=1&b=2', {}], ['/items?a=1&b=3', {}]],
  ['query order', ['/items?a=1&b=2', {}], ['/items?b=2&a=1', {}]],
  ['encoded URLs', ['/a%2Eb', {}], ['/a.b', {}]]
]
;['accept', 'accepts', 'accept-encoding'].forEach(name => {
  cases.push([
    name + ': absent versus empty',
    ['/headers', {}],
    ['/headers', { [name]: '' }]
  ])
  cases.push([
    name + ': absent versus literal undefined',
    ['/headers', {}],
    ['/headers', { [name]: 'undefined' }]
  ])
  cases.push([
    name + ': absent versus literal null',
    ['/headers', {}],
    ['/headers', { [name]: 'null' }]
  ])
  cases.push([
    name + ': empty versus literal null',
    ['/headers', { [name]: '' }],
    ['/headers', { [name]: 'null' }]
  ])
})

cases.forEach(entry => {
  test('separate keys for ' + entry[0], () => {
    const middleware = cache()
    const firstRequest = request(entry[1][0], entry[1][1])
    const secondRequest = request(entry[2][0], entry[2][1])
    const first = dispatch(middleware, firstRequest)
    expect(first.next).toHaveBeenCalledTimes(1)
    first.res.sendCached('first response')
    const second = dispatch(middleware, secondRequest)
    expect(second.next).toHaveBeenCalledTimes(1)
    expect(second.res.send).not.toHaveBeenCalled()
    second.res.sendCached('second response')
    expect(dispatch(middleware, firstRequest).res.send).toHaveBeenCalledWith(
      'first response'
    )
    expect(dispatch(middleware, secondRequest).res.send).toHaveBeenCalledWith(
      'second response'
    )
  })
})

test('key construction leaves the request and response status unchanged', () => {
  const headers = Object.freeze({
    accept: 'application/json',
    accepts: 'legacy',
    'accept-encoding': 'identity'
  })
  const header = name => headers[name]
  const req = Object.freeze({
    url: '/items?q=one.two',
    originalUrl: '/mounted/items?q=one.two',
    headers,
    header
  })
  const middleware = cache()
  const first = dispatch(middleware, req)
  first.res.sendCached('body')
  const second = dispatch(middleware, req)
  expect(first.res.statusCode).toBe(202)
  expect(second.res.statusCode).toBe(202)
  expect(second.next).not.toHaveBeenCalled()
  expect(second.res.send).toHaveBeenCalledWith('body')
  expect(req.url).toBe('/items?q=one.two')
  expect(req.originalUrl).toBe('/mounted/items?q=one.two')
  expect(req.headers).toBe(headers)
  expect(req.header).toBe(header)
})
;[false, 0, '', null, undefined, NaN].forEach(body => {
  test('key changes retain falsy miss semantics for ' + String(body), () => {
    const middleware = cache()
    const req = request('/falsy', { accept: 'application/json' })
    const first = dispatch(middleware, req)
    first.res.sendCached(body)
    expect(first.res.send).toHaveBeenCalledWith(body)
    const second = dispatch(middleware, req)
    expect(second.next).toHaveBeenCalledTimes(1)
    expect(second.res.send).not.toHaveBeenCalled()
  })
})
