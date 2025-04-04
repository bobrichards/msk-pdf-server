const express = require("express");
const bodyParser = require("body-parser");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const app = express();
const PORT = process.env.PORT || 8080;

// Multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send("MSK PDF server is running.");
});

app.post("/generate", upload.fields([
  { name: 'photo1', maxCount: 1 },
  { name: 'photo2', maxCount: 1 }
]), async (req, res) => {
  try {
    const templatePath = path.join(__dirname, "template.html");
    let templateHtml = fs.readFileSync(templatePath, "utf8");

    const data = req.body;

    // Inject all text fields
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
      templateHtml = templateHtml.replace(regex, data[key] || '');
    });

    // Inject images as base64
    const photo1 = req.files?.photo1?.[0];
    const photo2 = req.files?.photo2?.[0];

    if (photo1) {
      const base64 = photo1.buffer.toString("base64");
      templateHtml = templateHtml.replace("{{photo1}}", `data:${photo1.mimetype};base64,${base64}`);
    } else {
      templateHtml = templateHtml.replace("{{photo1}}", "");
    }

    if (photo2) {
      const base64 = photo2.buffer.toString("base64");
      templateHtml = templateHtml.replace("{{photo2}}", `data:${photo2.mimetype};base64,${base64}`);
    } else {
      templateHtml = templateHtml.replace("{{photo2}}", "");
    }

    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.setContent(templateHtml, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({ format: "A4" });

    await browser.close();

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=MSK_Report.pdf",
    });
    res.send(pdfBuffer);

  } catch (err) {
    console.error("PDF Generation Error:", err);
    res.status(500).send("PDF generation failed");
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
