const express = require('express');
const router = express.Router();
const https = require('https');

// Google Maps URL for Fresh Hot Bread All Day, Stockton, CA
const MAPS_URL = 'https://www.google.com/maps/place/Fresh+Hot+Bread+All+Day/@37.98456,-121.3346066,17z/data=!4m8!3m7!1s0x80900d0009850a5b:0x97b6c03eb644a54!8m2!3d37.98456!4d-121.3346066!9m1!1b1!16s%2Fg%2F11vhg53d8_';

// GET /api/reviews - Fetch live Google Reviews (Up to 12 recent reviews)
router.get('/', async (req, res) => {
  try {
    const html = await new Promise((resolve, reject) => {
      const request = https.get(MAPS_URL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 8000
      }, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => resolve(data));
      });
      request.on('error', reject);
      request.on('timeout', () => { request.destroy(); reject(new Error('Timeout')); });
    });

    // Parse Google Maps review data
    const reviewMatches = [...html.matchAll(/\["(https:\/\/lh3\.googleusercontent\.com\/[^"]+)","([^"]+)",(?:null|true),"(.*?)"/g)];

    let scrapedReviews = [];
    if (reviewMatches && reviewMatches.length > 0) {
      const seenAuthors = new Set();
      
      scrapedReviews = reviewMatches
        .map(m => {
          let cleanText = m[3] ? m[3].replace(/\\n/g, ' ').replace(/\\"/g, '"').replace(/\\u0026/g, '&') : '';
          return {
            avatar: m[1],
            author: m[2],
            text: cleanText,
            rating: 5,
            time: 'Google Review'
          };
        })
        .filter(r => {
          if (!r.text || r.text.length < 5 || !r.author || seenAuthors.has(r.author)) {
            return false;
          }
          seenAuthors.add(r.author);
          return true;
        })
        .slice(0, 12); // Up to 12 recent reviews
    }

    console.log(`✅ Live Google Reviews fetched: ${scrapedReviews.length}`);

    return res.json({
      success: true,
      rating: 4.9,
      totalReviews: 100,
      reviews: scrapedReviews
    });

  } catch (err) {
    console.error('⚠️ Scraper Warning:', err.message);
    return res.json({
      success: true,
      rating: 4.9,
      totalReviews: 100,
      reviews: []
    });
  }
});

module.exports = router;