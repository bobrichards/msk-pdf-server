const express = require('express');
const multer = require('multer');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const app = express();
const upload = multer();

// Helper: Convert image URL to Base64
async function fetchImageAsBase64(url) {
  try {
    console.log("Fetching image from URL:", url);
    const res = await fetch(url);
    const buffer = await res.buffer(); // Correct buffer method
    const mime = res.headers.get("content-type") || "image/png";
    return `data:${mime};base64,${buffer.toString("base64")}`;
  } catch (err) {
    console.error("Failed to fetch logo image:", err.message);
    return '';
  }
}

// CORS Middleware
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// ? PDF Generation Route
app.post('/generate', upload.any(), async (req, res) => {
  try {
    let html = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');

    // Log logo and field debug (optional)
    fs.writeFileSync('debug_raw_new.txt', JSON.stringify({
      logo: req.body.logo,
      allBody: req.body,
      files: req.files.map(f => f.fieldname)
    }, null, 2));

    // Prepare images
    const photoFields = ['photo1', 'photo2', 'photo3', 'photo4'];
    const images = [];

    photoFields.forEach(name => {
      const file = req.files.find(f => f.fieldname === name);
      if (file) {
        const base64 = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
        images.push(`<div><img src="${base64}" alt="${name}" /></div>`);
      }
    });

    // Logo as fallback
    const logoUrl = req.body.logo || '';
    const logoBase64 = await fetchImageAsBase64(logoUrl);

    // Construct image section
    let imageSection = '';
    if (images.length > 0) {
     imageSection = `
  <div class="image-container" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; width: 60%; margin: 40px auto;">
    ${images.map(img => `
      <div style="width: 100%;">
        <img src="${img.match(/src="([^"]+)"/)[1]}" style="width: 100%; height: auto; border: 1px solid #ccc; border-radius: 4px;" />
      </div>`).join('\n')}
  </div>`;



} else {
  imageSection = `
    <div class="image-container1" style="text-align: center; padding: 20px;">
      <img src="${logoBase64}" alt="Logo" style="max-width: 300px; display: block; margin: 0 auto;" />
    </div>`;
}


    // Inject image section first
    html = html.replace(/{{\s*imageSection\s*}}/g, imageSection);

    // Replace all other fields
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
      aiSummary: String(req.body.aiSummary || '').replace(/^[,\s]+/, ''),
      shortenedUrl: String(req.body.shortenedUrl || '').replace(/^[,\s]+/, ''),
      qrCodeDataURL: req.body.qrCodeDataURL || ''
    };

    console.log("FIELDS RECEIVED:", JSON.stringify(fields, null, 2));

    for (const key in fields) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      html = html.replace(regex, fields[key]);
    }

    // Save HTML for review (optional)
    fs.writeFileSync("debug_rendered.html", html);

    //  Generate PDF
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

//  Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`PDF generation server running on port ${PORT}`);
});
