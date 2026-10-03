'use strict'

const cache = require('./')
const memory = require('memory-cache')

const request = (url = '/', headers = {}) => ({
  url,
  header: name => headers[name]
})

const dispatch = (middleware, req = request()) => {
  const res = { send: jest.fn() }
  const next = jest.fn()
  middleware(req, res, next)
  return { res, next }
}

const originalNow = Date.now
const originalSetTimeout = global.setTimeout
const originalClearTimeout = global.clearTimeout
let now
let timers
let timerId

const advance = milliseconds => {
  now += milliseconds
  Object.keys(timers).forEach(id => {
    const timer = timers[id]
    if (timer && timer.at <= now) {
      delete timers[id]
      timer.callback()
    }
  })
}

beforeEach(() => {
  memory.clear()
  now = 1000
  timers = {}
  timerId = 0
  Date.now = () => now
  global.setTimeout = jest.fn((callback, delay) => {
    const id = ++timerId
    timers[id] = { callback, at: now + delay }
    return id
  })
  global.clearTimeout = jest.fn(id => {
    delete timers[id]
  })
})

afterEach(() => {
  memory.clear()
  Date.now = originalNow
  global.setTimeout = originalSetTimeout
  global.clearTimeout = originalClearTimeout
})

test('exports a middleware factory', () => {
  expect(typeof cache).toBe('function')
})

test('returns middleware', () => {
  expect(typeof cache()).toBe('function')
})

test('a miss calls next once without sending or caching', () => {
  const { res, next } = dispatch(cache())
  expect(next).toHaveBeenCalledTimes(1)
  expect(res.send).not.toHaveBeenCalled()
  expect(typeof res.sendCached).toBe('function')
  expect(res.sendCached).not.toBe(res.send)
  expect(memory.size()).toBe(0)
})

test('sendCached stores and sends the same body once', () => {
  const { res } = dispatch(cache())
  const body = { cached: true }
  res.sendCached(body)
  expect(res.send).toHaveBeenCalledTimes(1)
  expect(res.send).toHaveBeenCalledWith(body)
  expect(memory.get('/.undefined.undefined')).toBe(body)
})

test('a hit sends through the current response and skips next', () => {
  const middleware = cache()
  const first = dispatch(middleware)
  first.res.sendCached('cached')
  const second = dispatch(middleware)
  expect(first.res.send).toHaveBeenCalledTimes(1)
  expect(second.res.send).toHaveBeenCalledTimes(1)
  expect(second.res.send).toHaveBeenCalledWith('cached')
  expect(second.next).not.toHaveBeenCalled()
  expect(second.res.sendCached).toBe(second.res.send)
})

test('ordinary send does not populate the cache', () => {
  const middleware = cache()
  const first = dispatch(middleware)
  first.res.send('uncached')
  expect(memory.size()).toBe(0)
  expect(dispatch(middleware).next).toHaveBeenCalledTimes(1)
})

test('sendCached preserves the response receiver', () => {
  const res = {
    send: jest.fn(function () {
      return this
    })
  }
  cache()(request(), res, jest.fn())
  res.sendCached('cached')
  expect(res.send.mock.instances[0]).toBe(res)
})

test('URL paths partition the cache', () => {
  const middleware = cache()
  dispatch(middleware, request('/one')).res.sendCached('one')
  expect(dispatch(middleware, request('/two')).next).toHaveBeenCalledTimes(1)
  expect(dispatch(middleware, request('/one')).res.send).toHaveBeenCalledWith(
    'one'
  )
})

test('query strings partition the cache', () => {
  const middleware = cache()
  dispatch(middleware, request('/?q=one')).res.sendCached('one')
  expect(dispatch(middleware, request('/?q=two')).next).toHaveBeenCalledTimes(1)
})

test('url takes precedence over originalUrl', () => {
  const middleware = cache()
  const req = request('/local')
  req.originalUrl = '/mounted/local'
  dispatch(middleware, req).res.sendCached('local')
  expect(dispatch(middleware, request('/local')).res.send).toHaveBeenCalledWith(
    'local'
  )
  expect(
    dispatch(middleware, request('/mounted/local')).next
  ).toHaveBeenCalledTimes(1)
})
;[undefined, ''].forEach(url => {
  test('falls back to originalUrl when url is ' + String(url), () => {
    const middleware = cache()
    const req = request()
    req.url = url
    req.originalUrl = '/original'
    dispatch(middleware, req).res.sendCached('original')
    expect(
      dispatch(middleware, request('/original')).res.send
    ).toHaveBeenCalledWith('original')
  })
})

test('the existing accepts header partitions the cache', () => {
  const middleware = cache()
  dispatch(
    middleware,
    request('/', { accepts: 'application/json' })
  ).res.sendCached('json')
  expect(
    dispatch(middleware, request('/', { accepts: 'text/plain' })).next
  ).toHaveBeenCalledTimes(1)
  expect(
    dispatch(middleware, request('/', { accepts: 'application/json' })).res.send
  ).toHaveBeenCalledWith('json')
})

test('accept-encoding partitions the cache', () => {
  const middleware = cache()
  dispatch(
    middleware,
    request('/', { 'accept-encoding': 'gzip' })
  ).res.sendCached('gzip')
  expect(
    dispatch(middleware, request('/', { 'accept-encoding': 'identity' })).next
  ).toHaveBeenCalledTimes(1)
  expect(
    dispatch(middleware, request('/', { 'accept-encoding': 'gzip' })).res.send
  ).toHaveBeenCalledWith('gzip')
})

test('absent headers have a different key from present headers', () => {
  const middleware = cache()
  dispatch(middleware).res.sendCached('no headers')
  expect(
    dispatch(middleware, request('/', { accepts: 'text/plain' })).next
  ).toHaveBeenCalledTimes(1)
})

test('middleware instances share the real memory-cache singleton', () => {
  dispatch(cache()).res.sendCached('shared')
  const second = dispatch(cache())
  expect(second.res.send).toHaveBeenCalledWith('shared')
  expect(second.next).not.toHaveBeenCalled()
})

test('the default duration expires after 30 seconds', () => {
  const middleware = cache()
  dispatch(middleware).res.sendCached('default')
  expect(setTimeout.mock.calls[0][1]).toBe(30000)
  advance(29999)
  expect(dispatch(middleware).res.send).toHaveBeenCalledWith('default')
  advance(1)
  expect(dispatch(middleware).next).toHaveBeenCalledTimes(1)
  expect(memory.size()).toBe(0)
})

test('a fractional duration is converted from seconds to milliseconds', () => {
  const middleware = cache(0.25)
  dispatch(middleware).res.sendCached('short')
  expect(setTimeout.mock.calls[0][1]).toBe(250)
  advance(249)
  expect(dispatch(middleware).res.send).toHaveBeenCalledWith('short')
  advance(1)
  expect(dispatch(middleware).next).toHaveBeenCalledTimes(1)
})

test('an expired record misses even if its timeout has not run', () => {
  const middleware = cache(1)
  dispatch(middleware).res.sendCached('expired')
  now += 1001
  expect(dispatch(middleware).next).toHaveBeenCalledTimes(1)
  expect(memory.memsize()).toBe(0)
})

test('hits do not extend the expiry', () => {
  const middleware = cache(1)
  dispatch(middleware).res.sendCached('fixed TTL')
  advance(900)
  expect(dispatch(middleware).res.send).toHaveBeenCalledWith('fixed TTL')
  expect(setTimeout).toHaveBeenCalledTimes(1)
  advance(100)
  expect(dispatch(middleware).next).toHaveBeenCalledTimes(1)
})

test('repeated sendCached replaces the body and renews its timeout', () => {
  const middleware = cache(1)
  const first = dispatch(middleware)
  first.res.sendCached('first')
  advance(500)
  first.res.sendCached('second')
  expect(clearTimeout).toHaveBeenCalledWith(1)
  advance(500)
  expect(dispatch(middleware).res.send).toHaveBeenCalledWith('second')
  advance(500)
  expect(dispatch(middleware).next).toHaveBeenCalledTimes(1)
})
;[false, 0, '', null, undefined, NaN].forEach(body => {
  test(
    'preserves the existing miss behavior for cached ' + String(body),
    () => {
      const middleware = cache()
      const first = dispatch(middleware)
      first.res.sendCached(body)
      expect(first.res.send).toHaveBeenCalledWith(body)
      expect(memory.memsize()).toBe(1)
      const second = dispatch(middleware)
      expect(second.next).toHaveBeenCalledTimes(1)
      expect(second.res.send).not.toHaveBeenCalled()
    }
  )
})
;[0, -1, NaN, 'invalid', null].forEach(duration => {
  test(
    'invalid duration ' + String(duration) + ' throws before sending',
    () => {
      const { res } = dispatch(cache(duration))
      expect(() => res.sendCached('body')).toThrow(
        'Cache timeout must be a positive number'
      )
      expect(res.send).not.toHaveBeenCalled()
      expect(memory.size()).toBe(0)
    }
  )
})

test('a next error propagates without sending', () => {
  const error = new Error('next failed')
  const res = { send: jest.fn() }
  expect(() =>
    cache()(request(), res, () => {
      throw error
    })
  ).toThrow(error)
  expect(res.send).not.toHaveBeenCalled()
  expect(memory.size()).toBe(0)
})

test('a send error propagates after the body is cached', () => {
  const error = new Error('send failed')
  const res = {
    send: () => {
      throw error
    }
  }
  const middleware = cache()
  middleware(request(), res, jest.fn())
  expect(() => res.sendCached('body')).toThrow(error)
  expect(dispatch(middleware).res.send).toHaveBeenCalledWith('body')
})

test('a cached-hit send error propagates without calling next', () => {
  const middleware = cache()
  dispatch(middleware).res.sendCached('body')
  const error = new Error('hit send failed')
  const next = jest.fn()
  expect(() =>
    middleware(
      request(),
      {
        send: () => {
          throw error
        }
      },
      next
    )
  ).toThrow(error)
  expect(next).not.toHaveBeenCalled()
})
