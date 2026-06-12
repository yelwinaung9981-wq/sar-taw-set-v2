import https from 'https';

https.get('https://api.mapbox.com/search/geocode/v6/forward?q=Kuala+Lumpur', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(res.statusCode, data));
});
