require('dotenv').config();
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { TwitterApi } = require('twitter-api-v2');

// Configure Twitter client for read-write operations
const twitterClient = new TwitterApi({
    appKey: process.env.TWITTER_CONSUMER_KEY,
    appSecret: process.env.TWITTER_CONSUMER_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

const rwClient = twitterClient.readWrite;

async function captureAndPostScreenshot() {
    const browser = await puppeteer.launch({
        args: (process.env.PUPPETEER_ARGS || '').split(' ').filter(arg => arg)
    });
    const page = await browser.newPage();
    await page.goto('https://whenkas.github.io/');
    await page.setViewport({ width: 1080, height: 1080 });
    await page.evaluate(() => { document.body.style.zoom = '0.90'; });
    await new Promise(resolve => setTimeout(resolve, 5000));

    // parsing title
    const titleComponents = await page.evaluate(() => {
        return {
            titleTemplate: document.querySelector('#title_template')?.innerText || 'Title template not found',
            titleDate: document.querySelector('#title_date')?.innerText || 'Date not found',
            titleDuration: document.querySelector('#title_duration')?.innerText || 'Duration not found',
        };
    });

    const screenshot = await page.screenshot({ encoding: 'binary' });
    await browser.close();

    const dateStr = new Date().toISOString().slice(0, 10);
    const screenshotPath = path.join("screenshots", `screenshot-${dateStr}.png`);
    const textPath = path.join("screenshots", `screenshot-${dateStr}.txt`);
    const lastTextPath = path.join("screenshots", 'last_tweet.txt');

    const tweetText = `${titleComponents.titleTemplate} ${titleComponents.titleDate}. ${titleComponents.titleDuration}`;

    // Check if the text has changed
    let lastTweetText = '';
    if (fs.existsSync(lastTextPath)) {
        lastTweetText = fs.readFileSync(lastTextPath, 'utf8');
        console.log("Last tweet exists");
    } else {
        console.log("No last tweet");
    }

    if (tweetText !== lastTweetText) {
        try {
            // Save the screenshot and tweet text only if the text has changed
            fs.writeFileSync(screenshotPath, screenshot, 'binary');
            fs.writeFileSync(textPath, tweetText, 'utf8');
            console.log("Screenshot and tweet text saved to file:", screenshotPath, textPath);

            const mediaId = await rwClient.v1.uploadMedia(screenshotPath, { mimeType: 'image/png' });
            const tweet = await rwClient.v2.tweet(tweetText, { media: { media_ids: [mediaId] } });

            console.log('Tweet posted:', tweet);

            // Save the current tweet text as the last tweet text
            fs.writeFileSync(lastTextPath, tweetText, 'utf8');
        } catch (error) {
            console.error('Error posting tweet:', error);
        }
    } else {
        console.log('Tweet text has not changed. No tweet posted.');
    }
}

captureAndPostScreenshot().catch(console.error);