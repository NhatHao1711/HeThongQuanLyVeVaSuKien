const http = require('http');

http.get('http://localhost:8080/api/events', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log(JSON.stringify(parsed, null, 2).substring(0, 1000)); // print first 1000 chars
    } catch(e) {
      console.log(data);
    }
  });
}).on("error", (err) => {
  console.log("Error: " + err.message);
});
