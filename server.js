const express = require('express');
const multer = require('multer');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();
const upload = multer();

// Allow CORS
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Helper to fetch external image and convert to base64
async function fetchImageAsBase64(url) {
  try {
    const res = await fetch(url);
    const buffer = await res.arrayBuffer();
    const mime = res.headers.get("content-type") || "image/png";
    return `data:${mime};base64,${Buffer.from(buffer).toString("base64")}`;
  } catch (err) {
    console.error("Failed to fetch logo image:", err.message);
    return '';
  }
}

app.post('/generate', upload.any(), async (req, res) => {
  try {
    let html = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');

    // Prepare photos
    const photoFields = ['photo1', 'photo2', 'photo3', 'photo4'];
    const images = [];

    photoFields.forEach(name => {
      const file = req.files.find(f => f.fieldname === name);
      if (file) {
        const base64 = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
        images.push(`<div><img src="${base64}" alt="${name}" /></div>`);
      }
    });

    // Prepare fallback logo
    const logoUrl = req.body.logo || '';
    const logoBase64 = await fetchImageAsBase64(logoUrl);

    let imageSection = '<div class="image-container">';
    if (images.length > 0) {
      // Format 2 per row using a CSS grid wrapper
      imageSection = `
        <div class="image-container" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
        ${images.join('\n')}
        </div>`;
    } else {
      imageSection = `
        <div class="image-container" style="text-align:center; padding: 20px;">
          <img src="${logoBase64}" alt="Logo" style="max-width: 300px;" />
        </div>`;
    }

    // Replace placeholder now
    html = html.replace(/{{\s*imageSection\s*}}/g, imageSection);

    // Now replace all other fields
    const fields = {
      logo: logoBase64,
      date: req.body.date || '',
      eventNo: req.body.eventNo || '',
      practitionersName: req.body.practitionersName || '',
      practitionersEmail: req.body.practitionersEmail || '',
      practitionersAddress: req.body.practitionersAddress || '',
      practitionersNumber: req.body.practitionersNumber || '',
      patientsName: req.body.patientsName || '',
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
      qrCodeDataURL: req.body.qrCodeDataURL || ''
    };

    for (const key in fields) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      html = html.replace(regex, fields[key]);
    }

    // Debugging (optional)
    fs.writeFileSync("debug_rendered.html", html);

    // Generate PDF
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

  } catch (err) {
    console.error("PDF generation error:", err);
    res.status(500).send("PDF generation failed");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`PDF generation server running on port ${PORT}`);
});
