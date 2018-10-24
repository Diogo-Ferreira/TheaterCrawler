

import { crawl } from './crawler'
import _ from 'lodash'
import moment from 'moment';

let currentMovies = {};

const main = async (startDate, endDate) => {
  const host = 'https://www.cinevital.ch/'
  try {
    const crawledData = await crawl(`${host}/fr/biel.html?date=${startDate}&sdate=${endDate}`)
    return crawledData
  } catch (error) {
    console.log(error)
  }
};

(async () => {
  const baseDate = moment();
  const baseDateStr = baseDate.format('YYYY-M-D')
  const numberOfDays = 1;
  
  const dates = Array(numberOfDays)
    .fill()
    .map(_ => baseDate.add(1, 'day').format('YYYY-M-D'))

  const crawlings = dates.map(async date => await main(baseDateStr, date))

  const results = await Promise.all(crawlings)

  console.log(results)
})()



