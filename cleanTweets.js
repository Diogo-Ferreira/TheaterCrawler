import Twitter from 'twitter'

(async () => {
    const client = new Twitter({
        consumer_key: process.env.TWITTER_CONSUMER_KEY,
        consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
        access_token_key: process.env.TWITTER_TOKEN_KEY,
        access_token_secret: process.env.TWITTER_TOKEN_SECRET,
    })
    
    try {
        const tweets = await client.get('statuses/home_timeline', {});
        const ids = tweets.map(({ id_str }) => id_str)

        console.log(ids)

        const res = await Promise.all(ids.map(id => client.post(`statuses/destroy/${id}`,{})))
        console.log(res);
    } catch (err) {
        console.log(err)
    }

})()