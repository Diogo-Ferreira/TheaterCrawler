import fetch from 'node-fetch'
import cheerio from 'cheerio'
import { sdc } from './index'

const fetchData = async (url) => {
  const hrstart = process.hrtime()
  const response = await fetch(url)
  const [_, ms] = process.hrtime(hrstart)
  sdc.timing('tc.cinevital.fetchMoviePageTimeMs', ms);
  return await response.text()
}

const scrapeMoviesList = async (data) => {
  const $ = cheerio.load(data)
  const movieData = $(".movie-box > a").map((_, elem) => elem)

  const movieNames = movieData.map((_, elem) => {
    return $(elem).find('p').html()
  }).get()

  return movieNames
}

export const crawl = async (url) => {
  try {
    const data = await fetchData(url)
    const details = await scrapeMoviesList(data)
    return details
  } catch (error) {
    console.log(error)
    sdc.increment('tc.cinevital.numberCrawlErrors', 1)
  }
}