const express = require('express');
const app = express();
const fs = require('fs');

const date = (new Date().toLocaleString().split(' ')[0]).replaceAll('/', '-');
const port = process.env.PORT || 3000;

app.get('/send', (req, res) => {
  try {
    const dataraw = fs.readFileSync(`./reviews-${date}.json`);
    const json = JSON.parse(dataraw);

    if (json) {
      res.send(json);
    }
  } catch (error) {
    res.status(500).jsonp({ erro: 'no file.' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});