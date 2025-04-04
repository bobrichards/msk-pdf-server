const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('MSK PDF server is running.');
});

app.post('/generate', async (req, res) => {
  const { name, result, date } = req.body;

  const html = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8')
    .replace('{{name}}', name)
    .replace('{{result}}', result)
    .replace('{{date}}', date);

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'domcontentloaded' });

  const pdfBuffer = await page.pdf({ format: 'A4' });
  await browser.close();

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': 'attachment; filename=output.pdf',
  });
  res.send(pdfBuffer);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
