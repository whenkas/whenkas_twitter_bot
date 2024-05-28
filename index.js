require('dotenv').config();
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { TwitterApi } = require('twitter-api-v2');

const twitterClient = new TwitterApi({
    appKey: process.env.TWITTER_CONSUMER_KEY,
    appSecret: process.env.TWITTER_CONSUMER_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

const rwClient = twitterClient.readWrite;

async function captureAndPostScreenshot() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('https://whenkas.github.io/');
    await page.setViewport({ width: 1080, height: 1080 });
    await page.evaluate(() => { document.body.style.zoom = '0.90'; });
    await new Promise(resolve => setTimeout(resolve, 5000));

    const titleComponents = await page.evaluate(() => {
        return {
            titleTemplate: document.querySelector('#title_template')?.innerText || 'Title template not found',
            titleDate: document.querySelector('#title_date')?.innerText || 'Date not found',
            titleDuration: document.querySelector('#title_duration')?.innerText || 'Duration not found',
            titleR2: document.querySelector('#title_r2')?.innerText || 'R² not found'
        };
    });

    const screenshot = await page.screenshot({ encoding: 'binary' });
    await browser.close();

    const dateStr = new Date().toISOString().slice(0, 10);
    const screenshotPath = path.join("screenshots", `screenshot-${dateStr}.png`);
    fs.writeFileSync(screenshotPath, screenshot, 'binary');

    const tweetText = `${titleComponents.titleTemplate} ${titleComponents.titleDate}. ${titleComponents.titleDuration}. ${titleComponents.titleR2}`;
    const textPath = path.join("screenshots", `screenshot-${dateStr}.txt`);
    fs.writeFileSync(textPath, tweetText, 'utf8');
    console.log("Tweet text saved to file:", textPath);

    try {
        const mediaId = await rwClient.v1.uploadMedia(screenshotPath, { type: 'png' });
        const tweet = await rwClient.v2.tweet(tweetText, { media: { media_ids: [mediaId] } });
        console.log('Tweet posted:', tweet);
    } catch (error) {
        console.error('Error posting tweet:', error);
    }
}

captureAndPostScreenshot().catch(console.error);