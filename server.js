<script>
async function generateReport(button) {
  const form = document.getElementById("reportForm");
  const formData = new FormData(form);

  const payload = {
    practitionersName: formData.get("practitionersName"),
    profession: formData.get("profession"),
    practitionersAddress: document.getElementById("practitionersAddress").value,
    practitionersNumber: formData.get("practitionersNumber"),
    practitionersEmail: formData.get("practitionersEmail"),
    patientsName: formData.get("patientsName"),
    url: formData.get("url"),
    offer: formData.get("offer"),
    eventNo: formData.get("eventNo"),
    earLine: formData.get("earLine"),
    earDrop: formData.get("earDrop"),
    shoulderLine: formData.get("shoulderLine"),
    shoulderDrop: formData.get("shoulderDrop"),
    pelvisLine: formData.get("pelvisLine"),
    pelvisDrop: formData.get("pelvisDrop"),
    weightDistributionLeft: formData.get("weightDistributionLeft"),
    weightDistributionRight: formData.get("weightDistributionRight"),
    forwardHeadAngle: formData.get("forwardHeadAngle"),
    bodySway: formData.get("bodySway"),
    bodySwayDirection: formData.get("bodySwayDirection"),
    kneeHeightDifference: formData.get("kneeHeightDifference"),
    kneeDrop: formData.get("kneeDrop"),
    photosTaken: formData.get("photosTaken"),
    date: new Date().toLocaleDateString()
  };

  const photo1 = formData.get("photo1");
  const photo2 = formData.get("photo2");

  if (photo1 && photo1.size > 0) {
    payload.photo1 = await toBase64(photo1);
  }
  if (photo2 && photo2.size > 0) {
    payload.photo2 = await toBase64(photo2);
  }

  try {
    const response = await fetch("https://msk-pdf-server-production.up.railway.app/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error("Network response was not ok");

    const blob = await response.blob();
    const pdfUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = `MSK_Report_${payload.eventNo || "output"}.pdf`;
    link.click();
  } catch (error) {
    alert("PDF generation failed: " + error.message);
  }
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });
}
</script>
