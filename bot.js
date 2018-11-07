
const { IncomingWebhook } = require('@slack/client');
const webhook = new IncomingWebhook(process.env.SLACK_WEB_HOOK);



const formatMessage = (newMovies) => {
    const messages = newMovies
        .map(e => `*${e.movie.toLowerCase()}* will be available starting *${e.firstDay}*\n`)
        .reduce((a, b) => a + b, "")
    return `
        Some new movies are coming !
        ${messages}
    `
}

export const onNewMovies = (newMovies) => {
    webhook.send(formatMessage(newMovies), function(err, res) {
        if (err) {
            console.log('Error:', err);
        } else {
            console.log('Message sent: ', res);
        }
    });
}