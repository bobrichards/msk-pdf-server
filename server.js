const express = require('express');
const multer = require('multer');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();
const upload = multer();

// CORS Middleware
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// Parsing Middlewares
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// PDF Generation Route
app.post('/generate', upload.any(), async (req, res) => {
 try {
  let html = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');

  // Load up to 4 photo files
  const photo1 = req.files.find(f => f.fieldname === "photo1");
  const photo2 = req.files.find(f => f.fieldname === "photo2");
  const photo3 = req.files.find(f => f.fieldname === "photo3");
  const photo4 = req.files.find(f => f.fieldname === "photo4");

  const images = [];

  if (photo1) {
    const data = `data:${photo1.mimetype};base64,${photo1.buffer.toString("base64")}`;
    images.push(`<div><img src="${data}" alt="Photo 1" /></div>`);
  }
  if (photo2) {
    const data = `data:${photo2.mimetype};base64,${photo2.buffer.toString("base64")}`;
    images.push(`<div><img src="${data}" alt="Photo 2" /></div>`);
  }
  if (photo3) {
    const data = `data:${photo3.mimetype};base64,${photo3.buffer.toString("base64")}`;
    images.push(`<div><img src="${data}" alt="Photo 3" /></div>`);
  }
  if (photo4) {
    const data = `data:${photo4.mimetype};base64,${photo4.buffer.toString("base64")}`;
    images.push(`<div><img src="${data}" alt="Photo 4" /></div>`);
  }

  let imageSection = '<div class="image-container">';
  if (images.length > 0) {
    imageSection += images.join('');
  } else {
    const logoUrl = req.body.logo || '';
    imageSection += `<div style="text-align:center;"><img src="${logoUrl}" alt="Logo" style="max-width: 300px; margin-top: 20px;" /></div>`;
  }
  imageSection += '</div>';

  // Replace {{ imageSection }} in your template
  html = html.replace(/{{\s*imageSection\s*}}/g, imageSection);


    const fields = {
      logo: req.body.logo || '',
      date: req.body.date,
      eventNo: req.body.eventNo,
      practitionersName: req.body.practitionersName,
      practitionersEmail: req.body.practitionersEmail,
      practitionersAddress: req.body.practitionersAddress,
      practitionersNumber: req.body.practitionersNumber,
      patientsName: req.body.patientsName,
      offer: req.body.offer || '',
      earLine: req.body.earLine || '',
      earDrop: req.body.earDrop || '',
      shoulderLine: req.body.shoulderLine || '',
      shoulderDrop: req.body.shoulderDrop || '',
      pelvisLine: req.body.pelvisLine || '',
      pelvisDrop: req.body.pelvisDrop || '',
      weightDistributionLeft: req.body.weightDistributionLeft || '',
      weightDistributionRight: req.body.weightDistributionRight || '',
      forwardHeadAngle: req.body.forwardHeadAngle || '',
      bodySway: req.body.bodySway || '',
      bodySwayDirection: req.body.bodySwayDirection || '',
      kneeHeightDifference: req.body.kneeHeightDifference || '',
      kneeDrop: req.body.kneeDrop || '',
      aiSummary: req.body.aiSummary || '',
      shortenedUrl: req.body.shortenedUrl || '',
      qrCodeDataURL: req.body.qrCodeDataURL || '',
      imageSection: imageSection
    };

    // Replace all placeholders in the HTML
    for (const key in fields) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      html = html.replace(regex, fields[key]);
    }

    // Output final HTML for debug if needed
    fs.writeFileSync("debug_rendered.html", html);

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=MSK_Report_${fields.eventNo || 'output'}.pdf`
    });
    res.send(pdfBuffer);

  } catch (error) {
    console.error("PDF generation error:", error);
    res.status(500).send("PDF generation failed");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`PDF generation server running on port ${PORT}`);
});