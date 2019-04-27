
import { IncomingWebhook } from '@slack/client'
import  MovieDB from 'moviedb'
import { timeout } from './utils';
import { sdc } from './index'

const webhook = new IncomingWebhook(process.env.SLACK_WEB_HOOK)
const movieApi = MovieDB(process.env.MOVIE_DB_TOKEN)

const createAttachement = ({id, original_title, overview, trailerId, firstDay, poster_path}) => ({
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
    console.log(code, etc);
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

    const { poster_path, overview, original_title } = firstMovie

    const trailerId = youtube[0] && youtube[0].source

    return {
        poster_path,
        overview,
        original_title,
        trailerId,
        id: firstMovie.id
    }
}

export const onNewMovies = async (newMovies) => {
    const attachments = await Promise.all(
        newMovies.map(async (movie, index) => {
            await timeout(index * 2000)
            const data = await fetchMovieData(movie)
            return createAttachement({
                firstDay: movie.firstDay,
                ...data
            })
        })
    )
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
}