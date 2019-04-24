

import { crawl } from './crawler'
import _ from 'lodash'
import moment from 'moment';
import { onNewMovies } from './bot';
import { timeout } from './utils';
import SDC from 'statsd-client'
import os from 'os'

export const sdc = new SDC({
  host: process.env.STATSD_HOST || 'localhost',
  port: process.env.STATSD_PORT || '8125',
})

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
  console.log('Starting crawling, bonjour dom et bryan !')
  const baseDate = moment()
  const baseDateStr = baseDate.format('YYYY-M-D')
  const numberOfDays = days || 7
  
  const dates = Array(numberOfDays)
    .fill()
    .map(_ => baseDate.add(20, 'day').format('YYYY-M-D'))

  const crawlings = dates.map(async date => ({date, data: await crawlBeetween(baseDateStr, date)}))

  const results = await Promise.all(crawlings)

  const firstTime = currentMovies.size === 0 && ENV !== 'DEV'

  const {newMovies} =  compareResulstsAndGetNewMovies(currentMovies, results, firstTime);

  currentMovies = new Set([...newMovies.map(i => i.movie), ...currentMovies])

  if (newMovies.length > 0 && !firstTime) {
    await onNewMovies(newMovies)
  }
  sdc.increment('tc.numberOfCrawlings', 10)
};

export const compareResulstsAndGetNewMovies = (currentMovies, results) => {
  let movies = new Set(currentMovies)
  const newMovies = []
  results.forEach(result => {
    const { date, data } = result
    data.forEach(movie => {
      if (!movies.has(movie)) {
        newMovies.push({firstDay: date, movie});
        sdc.increment(`tc.newMoviesByWeek.${moment().format('MMM')}`, 1)
        
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
  const execTime = process.hrtime()
  while(true) {
    try {
      const hrstart = process.hrtime()
      await main(14)
      const [seconds, nanoseconds] = process.hrtime(hrstart)
      sdc.timing('tc.crawlingTimeSeconds', seconds)
      sdc.timing('tc.crawlingTimeNanoSeconds', nanoseconds)
      await timeout(60 * 60000)
      const [aliveSinceSeconds, _] = process.hrtime(execTime);
      sdc.gauge(`tc.aliveSince.${os.hostname()}`, aliveSinceSeconds)
    } catch (err) {
      console.log(err)
    }
  }
})()



