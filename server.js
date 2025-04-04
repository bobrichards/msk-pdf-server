const express = require("express");
const multer = require("multer");
const puppeteer = require("puppeteer");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

const upload = multer({ storage: multer.memoryStorage() });

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Route: generate PDF
app.post("/generate", upload.fields([{ name: "photo1" }, { name: "photo2" }]), async (req, res) => {
  try {
    const formData = req.body;
    const files = req.files;

    // Read HTML template
    const templatePath = path.join(__dirname, "template.html");
    let html = fs.readFileSync(templatePath, "utf8");

    // Replace {{placeholders}} with form values
    const inject = (key, value) => {
      const safe = (value || "").toString().replace(/</g, "&lt;").replace(/>/g, "&gt;");
      html = html.replace(new RegExp(`{{\\s*${key}\\s*}}`, "g"), safe);
    };

    Object.keys(formData).forEach(key => inject(key, formData[key]));

    // Handle optional photos
    if (files && files["photo1"]) {
      const photo1 = files["photo1"][0];
      const base64 = photo1.buffer.toString("base64");
      inject("photo1", `data:${photo1.mimetype};base64,${base64}`);
    } else {
      html = html.replace(/{{#if photo1}}[\s\S]*?{{\/if}}/g, "");
    }

    if (files && files["photo2"]) {
      const photo2 = files["photo2"][0];
      const base64 = photo2.buffer.toString("base64");
      inject("photo2", `data:${photo2.mimetype};base64,${base64}`);
    } else {
      html = html.replace(/{{#if photo2}}[\s\S]*?{{\/if}}/g, "");
    }

    // Launch Puppeteer and generate PDF
    const browser = await puppeteer.launch({
      headless: "new", // for recent Puppeteer versions
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", bottom: "20mm", left: "10mm", right: "10mm" }
    });

    await browser.close();

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=MSK_Report_${formData.eventNo || "output"}.pdf`,
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error("PDF generation error:", error);
    res.status(500).send("Failed to generate PDF");
  }
});

// Basic homepage route (optional)
app.get("/", (req, res) => {
  res.send("MSK Analysis Pro PDF Generator Server is running.");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
