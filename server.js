const express = require('express');
const puppeteer = require('puppeteer');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

app.post('/generate-pdf', async (req, res) => {
  const data = req.body;
  const templatePath = path.join(__dirname, 'template.html');
  let html = fs.readFileSync(templatePath, 'utf8');

  // Replace placeholders in template
  for (const key in data) {
    const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
    html = html.replace(regex, data[key]);
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '1cm', bottom: '1cm', left: '1cm', right: '1cm' },
  });

  await browser.close();

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="report-${data.eventNo}.pdf"`,
  });

  res.send(pdfBuffer);
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Server running...');
});
