require('dotenv').config();
const puppeteer = require('puppeteer');
const Twit = require('twit');
const fs = require('fs');
const path = require('path');

const T = new Twit({
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token: process.env.TWITTER_ACCESS_TOKEN,
    access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

async function captureAndPostScreenshot() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('https://whenkas.github.io/'); // Replace with your target URL

    // Set viewport size to a larger dimension
    await page.setViewport({ width: 1080, height: 1080 });

    // Zoom out the page
    await page.evaluate(() => {
        document.body.style.zoom = '0.90'; // Adjust the zoom level as needed
    });

    // Wait for 5 seconds before taking the screenshot
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Extract the title components
    const titleComponents = await page.evaluate(() => {
        const titleTemplate = document.querySelector('#title_template')?.innerText || 'Title template not found';
        const titleDate = document.querySelector('#title_date')?.innerText || 'Date not found';
        const titleDuration = document.querySelector('#title_duration')?.innerText || 'Duration not found';
        const titleR2 = document.querySelector('#title_r2')?.innerText || 'R² not found';
        return { titleTemplate, titleDate, titleDuration, titleR2 };
    });

    const screenshot = await page.screenshot({ encoding: 'binary' });
    await browser.close();

    // Save the screenshot to a file
    const dateStr = new Date().toISOString().slice(0, 10);
    const screenshotPath = path.join("screenshots", `screenshot-${dateStr}.png`);
    fs.writeFileSync(screenshotPath, screenshot, 'binary');
    console.log('Screenshot saved to file:', screenshotPath);

    // Construct the tweet content
    const tweetText = `${titleComponents.titleTemplate} ${titleComponents.titleDate}. ${titleComponents.titleDuration}. ${titleComponents.titleR2}`;

    // Save the text content to a file
    const textPath = path.join("screenshots", `screenshot-${dateStr}.txt`);
    fs.writeFileSync(textPath, tweetText, 'utf8');

    console.log("tweetText", tweetText);

    // Post the screenshot to Twitter
    T.post('media/upload', { media_data: screenshot.toString('base64') }, async (err, data, response) => {
        if (err) throw err;

        const mediaIdStr = data.media_id_string;
        const altText = `A graph showing ${titleComponents.titleTemplate} ${titleComponents.titleDate}. ${titleComponents.titleDuration}. ${titleComponents.titleR2}`;
        const metaParams = { media_id: mediaIdStr, alt_text: { text: altText } };

        T.post('media/metadata/create', metaParams, (err, data, response) => {
            if (err) throw err;

            const params = { status: tweetText, media_ids: [mediaIdStr] };
            T.post('statuses/update', params, (err, data, response) => {
                if (err) throw err;
                console.log('Posted!');
            });
        });
    });
}

captureAndPostScreenshot().catch(console.error);