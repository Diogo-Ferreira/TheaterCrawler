

import { crawl } from './crawler'
import _ from 'lodash'

let results = {};

const main = async (fakeData) => {
  const host = 'https://www.cinevital.ch/'
  try {
    const crawledData = await crawl(`${host}/fr/biel.html`)
    const resultKeys = Object.keys(results)
    const crawledDataKeys = Object.keys({...fakeData, ...crawledData})
    if (resultKeys.length > 0) {
      const diff = _.difference(crawledDataKeys, resultKeys)
      if (diff.length > 0) {
        console.log('Theres new data')
      }
    }

    results = {...crawledData};

  } catch (error) {
    console.log(error)
  }
};
(async () => {
  await main()
  await main({'coolMovie': {}})
})()



