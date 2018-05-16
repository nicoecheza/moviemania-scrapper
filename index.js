const request = require('request-promise')
const fs = require('fs')
const { promisify } = require('util');

const writeFile = promisify(fs.writeFile)

const FONDITOS_PATH = './fonditos'
const MAGIC_URLS = {
  LIST: 'https://www.moviemania.io/desktop/wallpapers/popular',
  DOWNLOAD: 'https://www.moviemania.io/download',
}
const MAGIC_NUMBER = 30
const MAGIC_FONDITOS_SIZES = {
  VERY_BIG: '2880x1800',
  BIG: '2560x1440',
  HD: '1920x1080',
}
const AVOID_THE_FUCKING_RATE_LIMITER_DELAY = 3000

const necroMagic = async (
  amountOfFonditos = 100,
  sizeOfFonditos = MAGIC_FONDITOS_SIZES.BIG,
  startFrom = 8,
) => {
  const pages = Math.ceil(amountOfFonditos / MAGIC_NUMBER)

  const pagesUrls = [...Array(pages).keys()].map(n => {
    const offset = (MAGIC_NUMBER * startFrom) + (MAGIC_NUMBER * n)
    return request(`${MAGIC_URLS.LIST}?offset=${offset}`)
  })

  let error
  let links
  let wallpapers

  try {
    links = await Promise.all(pagesUrls)
  } catch (e) {
    error = e
  }

  if (error) return console.log(`Error getting pages URL's: ${error}`)

  const ids = getIDs(links, amountOfFonditos)

  const promises = ids.map((id, i) => new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        const url = `${MAGIC_URLS.DOWNLOAD}/${id}/${sizeOfFonditos}`
        console.log(`Getting fondito #${i+1}...`)
        const wallpaper = await request(url, { encoding: null })
        resolve(wallpaper)
      } catch (e) {
        reject(e)
      }
    }, i * AVOID_THE_FUCKING_RATE_LIMITER_DELAY)
  }))

  try {
    wallpapers = await Promise.all(promises)
  } catch (e) {
    error = e
  }

  if (error) return console.log(`Error downloading some fondito: ${error}`)

  wallpapers.forEach(async (val, i) => {
    try {
      const name = `${ids[i]}.jpg`
      await writeFile(`${FONDITOS_PATH}/${name}`, val, 'binary')
      console.log(`The fondito #${i+1} was saved under the name of ${name}!`)
    } catch (e) {
      console.log(`Error saving fondito ${i}: ${e}`)
    }
  })
}

const getIDs = (links, amount) =>
  [].concat(...links.map(link =>
    link
    .split('</a>')
    .map(link => link.split('/wallpaper/'))
    .filter(link => link[1])
    .map(link => link[1].split('-')[0])
  )).slice(0, amount)

module.exports = necroMagic()
