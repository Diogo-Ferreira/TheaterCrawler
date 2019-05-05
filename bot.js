
import { IncomingWebhook } from '@slack/client'
import  MovieDB from 'moviedb'
import { timeout } from './utils'
import moment from 'moment';
import { sdc } from './index'
import Twitter from 'twitter'

const webhook = new IncomingWebhook(process.env.SLACK_WEB_HOOK)
const movieApi = MovieDB(process.env.MOVIE_DB_TOKEN)

const twitter = new Twitter({
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token_key: process.env.TWITTER_TOKEN_KEY,
    access_token_secret: process.env.TWITTER_TOKEN_SECRET,
})

const escapeHtml = unsafe => unsafe
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/'&#039;/g, "'")
    .replace(/&apos;/g, "’");

const printActor = hideCharacters => ({ name, character }) => (character && !hideCharacters) ? `   - ${name} as ${character}` : `    - ${name}`

const createTweet = ({ id, original_title, trailerId, firstDay, topActors, hideActors, hideCharacters, hideMovieDb }) => `
A new movie arrived in BNC ! 🎉 📽

🍿 ${escapeHtml(original_title)} 🍿

📅 ${firstDay} 📅

${(topActors && !hideActors) ? `Featuring:\n${topActors.map(printActor(hideCharacters)).join('\n')}` : ''}

${(id && !hideMovieDb) ? `Learn more about here 🤓 https://www.themoviedb.org/movie/${id}`: ''}

${trailerId ? `Watch the trailer 👉 https://youtube.com/watch?v=${trailerId}`: ''}
`

const createAttachement = ({ id, original_title, overview, trailerId, firstDay, poster_path }) => ({
    "fallback": "Required plain-text summary of the attachment.",
    "color": "grey",
    "title": original_title,
    "title_link": `https://www.themoviedb.org/movie/${id}`,
    "author_name": `Will be availabe starting ${firstDay}`,
    "text": `${overview}\n ${trailerId && `<https://youtube.com/watch?v=${trailerId}| Watch trailer>`}`,
    "thumb_url": `http://image.tmdb.org/t/p/w185${poster_path}`
})

const fetchMovieData = async ({ movie }) => {
    const hrstart = process.hrtime();
    const { results } = await new Promise((resolve, reject) => movieApi.searchMovie({ query: movie }, (err, res) => {
        if (err) {
            reject(err)
        }
        resolve(res)
    })) 
    const [_, ms] = process.hrtime(hrstart);
    sdc.timing('tc.movieDb.fetchTime', ms)

    await timeout(2000) // stress moviedb api we must not
    
    const firstMovie = results[0] // we hope to get right in the first result

    if (!firstMovie) {
        return {
            original_title: movie
        }
    }
    
    const { youtube } = await new Promise((resolve, reject) => movieApi.movieTrailers({ id: firstMovie.id }, (err, res) => {
        if (err) {
            reject(err)
        }
        resolve(res)
    }))

    await timeout(2000) // stress moviedb api we must not

    const { cast } = await new Promise((resolve, reject) => movieApi.movieCredits({ id: firstMovie.id }, (err, res) => {
        if (err) {
            reject(err)
        }
        resolve(res)
    }))

    const topActors = cast
        .sort((a, b) => a.order - b.order )
        .slice(0, 3)
        .map(({ name, order, character }) => ({ name, order, character }) );

    const { poster_path, overview, original_title } = firstMovie

    const trailerId = youtube[0] && youtube[0].source

    return {
        poster_path,
        overview,
        original_title,
        trailerId,
        topActors,
        id: firstMovie.id
    }
}

export const onNewMovies = async (newMovies) => {
    const movieDbData = await Promise.all(
        newMovies.map(async (movie, index) => {
            await timeout(index * 2000)
            const data = await fetchMovieData(movie)
            return [movie, data]
        })
    )

    const attachments = movieDbData.map(([ movie, data]) => createAttachement({
        firstDay: movie.firstDay,
        ...data
    }))

    const tweets = movieDbData.filter(([ _, ({ id })]) => id).map(([ movie, data]) => {
        let firstTry = createTweet({
            firstDay: movie.firstDay,
            ...data
        })
        if (firstTry.length > 280) {
            firstTry = createTweet({
                firstDay: movie.firstDay,
                hideMovieDb: true,
                ...data
            })
        }
        if (firstTry.length > 280) {
            firstTry = createTweet({
                firstDay: movie.firstDay,
                hideMovieDb: true,
                hideCharacters: true,
                ...data
            })
        }
        if (firstTry.length > 280) {
            firstTry = createTweet({
                firstDay: movie.firstDay,
                hideActors: true,
                ...data
            })
        }

        return firstTry
    })
    
    const ob = {
        text: "New movies are coming to BNC :movie_camera: :tada: !",
        attachments
    }

    webhook.send(ob, function(err, res) {
        if (err) {
            console.log('Error:', err);
        } else {
            console.log('Message sent: ', res);
        }
    });

    try {
        const twitterRequests = tweets.map(async tw => {
            try {
                const res = await twitter.post('statuses/update', { 
                    status: tw,
                });
                return res;
            } catch (err) {
                return err;
            }
        })
        const res = await Promise.all(twitterRequests)
    } catch (err) {
        console.log(err);
    }   
}