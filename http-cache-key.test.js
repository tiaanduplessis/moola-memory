'use strict'

const http = require('http')
const cache = require('./')
const memory = require('memory-cache')
let server
let routeCalls

const sendRepresentation = (req, res) => {
  routeCalls++
  const body =
    req.header('accept') === 'text/html'
      ? '<p>representation ' + routeCalls + '</p>'
      : JSON.stringify({ url: req.url, call: routeCalls })
  res.sendCached(body)
}

beforeEach(done => {
  routeCalls = 0
  memory.clear()
  const middleware = cache()
  server = http.createServer((req, res) => {
    req.header = name => req.headers[name.toLowerCase()]
    res.send = body => res.end(body)
    middleware(req, res, () => sendRepresentation(req, res))
  })
  server.listen(0, '127.0.0.1', done)
})

afterEach(done => {
  memory.clear()
  server.close(done)
})

const get = (path, headers) =>
  new Promise((resolve, reject) => {
    const req = http.get(
      {
        host: '127.0.0.1',
        port: server.address().port,
        path,
        headers,
        agent: false
      },
      res => {
        let body = ''
        res.setEncoding('utf8')
        res.on('data', chunk => {
          body += chunk
        })
        res.on('error', reject)
        res.on('end', () => resolve({ status: res.statusCode, body }))
      }
    )
    req.setTimeout(2000, () =>
      req.destroy(new Error('Loopback request timed out'))
    )
    req.on('error', reject)
  })

const groups = [
  [
    'period-delimited collision',
    ['/a.b', { accepts: 'c', 'accept-encoding': 'd' }],
    ['/a', { accepts: 'b.c', 'accept-encoding': 'd' }],
    ['/a', { accepts: 'b', 'accept-encoding': 'c.d' }]
  ],
  [
    'standard Accept representations with legacy accepts unchanged',
    ['/representation', { accept: 'application/json', accepts: 'same' }],
    ['/representation', { accept: 'text/html', accepts: 'same' }]
  ],
  [
    'standard Accept without legacy accepts',
    ['/representation', { accept: 'application/json' }],
    ['/representation', { accept: 'text/html' }]
  ],
  [
    'Accept-Encoding and legacy accepts',
    [
      '/headers',
      { accept: 'application/json', accepts: 'a', 'accept-encoding': 'gzip' }
    ],
    [
      '/headers',
      {
        accept: 'application/json',
        accepts: 'a',
        'accept-encoding': 'identity'
      }
    ],
    [
      '/headers',
      {
        accept: 'application/json',
        accepts: 'b',
        'accept-encoding': 'identity'
      }
    ]
  ],
  [
    'query URL preservation',
    ['/items?q=a.b', {}],
    ['/items?q=a%2Eb', {}],
    ['/items?q=b.a', {}]
  ],
  [
    'JSON punctuation and escapes',
    ['/tuple', { accept: 'a","b', accepts: 'c' }],
    ['/tuple', { accept: 'a', accepts: 'b","c' }],
    ['/tuple', { accept: 'a\\', accepts: 'b' }],
    ['/tuple', { accept: 'a', accepts: '\\b' }]
  ]
]
;['accept', 'accepts', 'accept-encoding'].forEach(name => {
  groups.push([
    'absent, empty and literal header values for ' + name,
    ['/headers', {}],
    ['/headers', { [name]: '' }],
    ['/headers', { [name]: 'undefined' }],
    ['/headers', { [name]: 'null' }]
  ])
})

groups.forEach(group => {
  test('real HTTP isolates ' + group[0] + ' and reuses only exact hits', () => {
    const variants = group.slice(1)
    const bodies = []
    return variants
      .reduce(
        (chain, variant, index) =>
          chain.then(() => get(variant[0], variant[1])).then(result => {
            expect(result.status).toBe(200)
            expect(routeCalls).toBe(index + 1)
            expect(bodies.indexOf(result.body)).toBe(-1)
            if (variant[1].accept === 'text/html') {
              expect(result.body).toBe(
                '<p>representation ' + (index + 1) + '</p>'
              )
            } else {
              expect(JSON.parse(result.body)).toEqual({
                url: variant[0],
                call: index + 1
              })
            }
            bodies.push(result.body)
          }),
        Promise.resolve()
      )
      .then(() =>
        variants.reduce(
          (chain, variant, index) =>
            chain.then(() => get(variant[0], variant[1])).then(result => {
              expect(result.status).toBe(200)
              expect(result.body).toBe(bodies[index])
            }),
          Promise.resolve()
        )
      )
      .then(() => expect(routeCalls).toBe(variants.length))
  })
})
