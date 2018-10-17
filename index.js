
import fetch from 'node-fetch'
import cheerio from 'cheerio'

const host = 'https://www.cinevital.ch/'

const timeout = ms => new Promise(res => setTimeout(res, ms))

const fetchData = async (url) => {
  const response = await fetch(url)
  return await response.text()
}

const scrapeMoviesList = async (data) => {
  const $ = cheerio.load(data)
  const movieData = $(".movie-box > a").map((_, elem) => elem)

  const movieDetails = await Promise.all(movieData.map(async (_, elem) => {
    const name = $(elem).find('p').html()
    const url = $(elem).attr('href')
    await timeout(500)
    return {[name]: await scrapeMovieDetails(`${host}/${url}`, name)}
  }).get())

  return movieDetails
}

const scrapeMovieDetails = async (url, movieName) => {
  try {
    const data = await fetchData(url);
    const $ = cheerio.load(data)
    const dayKey = (elem) => $(elem).find('.showdate h4').html().trim()
    const findTime = (elem) => $(elem).find('button b').html().trim()
    const findLocation = (elem) => $(elem).find('button br').get(0).nextSibling.nodeValue.toString().trim()
    const showTimesPerDay = $('.showtimes .panel').map((_, elem) => ({
      [dayKey(elem)]: `${findTime(elem)} : ${findLocation(elem)}`
    })).get().reduce((a, b) => ({...a, ...b}), {})
    return showTimesPerDay
  } catch (error) {
    console.log(error)
  }
}

const crawl = async (url) => {
  try {
    const data = await fetchData(url)
    const details = await scrapeMoviesList(data)
    console.log(details)
  } catch (error) {
    console.log(error)
  }
}

(async () => {
  try {
    await crawl(`${host}/fr/biel.html`)
  } catch (error) {
    console.log(error)
  }
})()


