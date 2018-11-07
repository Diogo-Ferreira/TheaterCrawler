import fetch from 'node-fetch'
import cheerio from 'cheerio'

const fetchData = async (url) => {
  const response = await fetch(url)
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
  }
}