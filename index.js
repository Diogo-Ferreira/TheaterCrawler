

import { crawl } from './crawler'
import _ from 'lodash'
import moment from 'moment';
import { onNewMovies } from './bot';
import { timeout } from './utils';

let currentMovies = new Set();

const { ENV } = process.env

const crawlBeetween = async (startDate, endDate) => {
  const host = 'https://www.cinevital.ch/'
  try {
    const crawledData = await crawl(`${host}/fr/biel.html?date=${startDate}&sdate=${endDate}`)
    return crawledData
  } catch (error) {
    console.log(error)
  }
};

const main = async (days) => {
  console.log('Starting crawling !')
  const baseDate = moment()
  const baseDateStr = baseDate.format('YYYY-M-D')
  const numberOfDays = days || 7
  
  const dates = Array(numberOfDays)
    .fill()
    .map(_ => baseDate.add(1, 'day').format('YYYY-M-D'))

  const crawlings = dates.map(async date => ({date, data: await crawlBeetween(baseDateStr, date)}))

  const results = await Promise.all(crawlings)

  const firstTime = currentMovies.size === 0 && ENV !== 'DEV'

  const {newMovies} =  compareResulstsAndGetNewMovies(currentMovies, results, firstTime);

  currentMovies = new Set([...newMovies.map(i => i.movie), ...currentMovies])

  if (newMovies.length > 0 && !firstTime) {
    await onNewMovies(newMovies)
  }
};

export const compareResulstsAndGetNewMovies = (currentMovies, results) => {
  let movies = new Set(currentMovies)
  const newMovies = []
  results.forEach(result => {
    const { date, data } = result
    data.forEach(movie => {
      if (!movies.has(movie)) {
        newMovies.push({firstDay: date, movie});
      }
      movies.add(movie)
    })
  })
  return {
    currentMovies,
    newMovies
  }
}


(async () => {
  console.log("OLA !")
  while(true) {
    try {
      await main(14)
      await timeout(60 * 60000)
    } catch (err) {
      console.log(err)
    }
  }
})()



