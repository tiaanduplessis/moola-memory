
<h1 align="center">💰 moola-memory</h1>
<div align="center">
  <strong>Express-style in-memory cache middleware</strong>
</div>
<br>
<div align="center">
  <a href="https://npmjs.org/package/moola-memory">
    <img src="https://img.shields.io/npm/v/moola-memory.svg?style=flat-square" alt="npm package version" />
  </a>
  <a href="https://npmjs.org/package/moola-memory">
  <img src="https://img.shields.io/npm/dm/moola-memory.svg?style=flat-square" alt="npm downloads" />
  </a>
  <a href="https://github.com/feross/standard">
    <img src="https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square" alt="standard JS linter" />
  </a>
  <a href="https://github.com/prettier/prettier">
    <img src="https://img.shields.io/badge/styled_with-prettier-ff69b4.svg?style=flat-square" alt="prettier code formatting" />
  </a>
  <a href="https://travis-ci.org/tiaanduplessis/moola-memory">
    <img src="https://img.shields.io/travis/tiaanduplessis/moola-memory.svg?style=flat-square" alt="travis ci build status" />
  </a>
  <a href="https://github.com/tiaanduplessis/moola-memory/blob/master/LICENSE">
    <img src="https://img.shields.io/npm/l/moola-memory.svg?style=flat-square" alt="project license" />
  </a>
  <a href="http://makeapullrequest.com">
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square" alt="make a pull request" />
  </a>
</div>
<br>
<div align="center">
  <a href="https://github.com/tiaanduplessis/moola-memory/watchers">
    <img src="https://img.shields.io/github/watchers/tiaanduplessis/moola-memory.svg?style=social" alt="Github Watch Badge" />
  </a>
  <a href="https://github.com/tiaanduplessis/moola-memory/stargazers">
    <img src="https://img.shields.io/github/stars/tiaanduplessis/moola-memory.svg?style=social" alt="Github Star Badge" />
  </a>
  <a href="https://twitter.com/intent/tweet?text=Check%20out%20moola-memory!%20https://github.com/tiaanduplessis/moola-memory%20%F0%9F%91%8D">
    <img src="https://img.shields.io/twitter/url/https/github.com/tiaanduplessis/moola-memory.svg?style=social" alt="Tweet" />
  </a>
</div>
<br>
<div align="center">
  Built with ❤︎ by <a href="https://github.com/tiaanduplessis">tiaanduplessis</a> and <a href="https://github.com/tiaanduplessis/moola-memory/contributors">contributors</a>
</div>

<h2>Table of Contents</h2>
<details>
  <summary>Table of Contents</summary>
  <li><a href="#install">Install</a></li>
  <li><a href="#usage">Usage</a></li>
  <li><a href="#contribute">Contribute</a></li>
  <li><a href="#license">License</a></li>
</details>

## Install

[![Greenkeeper badge](https://badges.greenkeeper.io/tiaanduplessis/moola-memory.svg)](https://greenkeeper.io/)

```sh
$ npm install moola-memory
# OR
$ yarn add moola-memory
```

## Usage

```js
const express = require('express')
const app = express()
const cache = require('moola-memory')

app.use(cache(duration: 5 // Duration to cache. Defaults to 30s))

app.get('/', (req, res) => {
  res.sendCached({test: true}) // The body will now be cached for 5 seconds
})

app.listen(8989)

```

## Contributing

Contributions are welcome!

1. Fork it.
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D

Or open up [a issue](https://github.com/tiaanduplessis/moola-memory/issues).

## License

Licensed under the MIT License.
