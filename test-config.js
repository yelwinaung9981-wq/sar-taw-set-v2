import fetch from 'node-fetch';

async function testConfig() {
  const res = await fetch("http://localhost:3000/api/config/google-maps-key");
  const data = await res.json();
  console.log("google-key:", data);

  const res2 = await fetch("http://localhost:3000/api/config/mapbox-token");
  const data2 = await res2.json();
  console.log("mapbox-token:", data2);
}

testConfig();
