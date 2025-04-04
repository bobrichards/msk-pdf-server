const express = require('express');
const multer = require('multer');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();
const upload = multer();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*"); // You can restrict to your domain later
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// Middlewares
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// PDF Generation Route
app.post('/generate', upload.any(), async (req, res) => {
  try {
    // Load the HTML template
    let html = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');

    // Extract fields
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
      qrCodeDataURL: req.body.qrCodeDataURL || ''
    };

    // ? Optional Logging for Debugging
    console.log("Incoming request fields:");
    console.log(fields);
    fs.writeFileSync("last_fields.json", JSON.stringify(fields, null, 2)); // For offline debugging if needed

    // Replace {{ variable }} in the template
    for (const key in fields) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      html = html.replace(regex, fields[key]);
    }

    // Optional: Write final HTML to file for manual testing
    fs.writeFileSync("debug_rendered.html", html);

    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    // Send response
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

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`PDF generation server running on port ${PORT}`);
});
