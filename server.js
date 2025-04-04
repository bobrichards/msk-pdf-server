const express = require('express');
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json({ limit: '10mb' }));

app.post('/generate-pdf', async (req, res) => {
  const html = req.body.html;

  if (!html) {
    return res.status(400).send('Missing HTML content');
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome'
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdfBuffer = await page.pdf({ format: 'A4' });

  await browser.close();

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': 'attachment; filename="generated.pdf"',
  });

  res.send(pdfBuffer);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`PDF server running on port ${PORT}`));
