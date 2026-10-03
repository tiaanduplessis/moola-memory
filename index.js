'use strict'

const mcache = require('memory-cache')

const moolaMemory = (duration = 30) => {
  const handle = (req, res, next) => {
    const key = JSON.stringify([
      req.url || req.originalUrl,
      req.header('accept'),
      req.header('accepts'),
      req.header('accept-encoding')
    ])

    const value = mcache.get(key)

    res.sendCached = res.send

    if (value) {
      res.send(value)
      return
    }

    res.sendCached = body => {
      mcache.put(key, body, duration * 1000)
      res.send(body)
    }

    next()
  }

  return handle
}

module.exports = moolaMemory
