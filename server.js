const express = require("express");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(bodyParser.json());
app.use(express.static("public"));

// ? Home route to confirm server is working
app.get("/", (req, res) => {
  res.send("MSK PDF server is running.");
});

// ?? PDF generation route
app.post("/generate", async (req, res) => {
  try {
    const templatePath = path.join(__dirname, "template.html");
    let html = fs.readFileSync(templatePath, "utf8");

    // Replace placeholders with data from request body
    for (const key in req.body) {
      html = html.replace(`{{${key}}}`, req.body[key]);
    }

    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({ format: "A4" });
    await browser.close();

    res.contentType("application/pdf");
    res.send(pdfBuffer);
  } catch (error) {
    console.error("PDF generation error:", error);
    res.status(500).send("Error generating PDF");
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
