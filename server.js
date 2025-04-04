const express = require("express");
const bodyParser = require("body-parser");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// File upload config
const upload = multer({ dest: "uploads/" });

// Serve HTML template file
const htmlTemplatePath = path.join(__dirname, "template.html");

// Root endpoint to confirm server is running
app.get("/", (req, res) => {
  res.send("MSK PDF server is running.");
});

// PDF generation endpoint
app.post("/generate-pdf", upload.fields([{ name: "photo1" }, { name: "photo2" }]), async (req, res) => {
  try {
    const formData = req.body;

    // Load HTML template
    let html = fs.readFileSync(htmlTemplatePath, "utf8");

    // Replace placeholders with actual data
    for (const key in formData) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
      html = html.replace(regex, formData[key]);
    }

    // Handle uploaded images
    const photo1 = req.files?.photo1?.[0];
    const photo2 = req.files?.photo2?.[0];

    if (photo1) {
      const imageBase64 = fs.readFileSync(photo1.path, "base64");
      html = html.replace("{{photo1}}", `data:image/jpeg;base64,${imageBase64}`);
    } else {
      html = html.replace("{{photo1}}", "");
    }

    if (photo2) {
      const imageBase64 = fs.readFileSync(photo2.path, "base64");
      html = html.replace("{{photo2}}", `data:image/jpeg;base64,${imageBase64}`);
    } else {
      html = html.replace("{{photo2}}", "");
    }

    // Launch Puppeteer and generate PDF
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({ format: "A4" });
    await browser.close();

    // Set response headers and send PDF
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=report.pdf",
    });

    res.send(pdfBuffer);

    // Cleanup uploaded files
    if (photo1) fs.unlinkSync(photo1.path);
    if (photo2) fs.unlinkSync(photo2.path);
  } catch (err) {
    console.error("Error generating PDF:", err);
    res.status(500).send("PDF generation failed.");
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
