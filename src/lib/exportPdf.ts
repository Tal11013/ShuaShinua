// html2canvas re-implements CSS painting in JS and its color parser doesn't
// understand oklch() — which is what every color in this app's :root
// resolves to (Chromium's getComputedStyle now reports oklch() literally
// instead of converting to rgb()). Left alone this throws when html2canvas
// walks ancestor elements (body, .mobile-shell, .card-soft's box-shadow,
// etc.) while cloning the document, well before it gets to the (already
// hex-only) print view itself. onclone lets us patch the cloned document's
// stylesheet with hex equivalents right before html2canvas reads any of it.
const HEX_TOKEN_OVERRIDES = `
  :root {
    --background: #f5f7f9;
    --card: #ffffff;
    --foreground: #131922;
    --muted: #f1f3f7;
    --muted-foreground: #6c727b;
    --primary: #306fed;
    --primary-foreground: #ffffff;
    --primary-soft: #e7f1ff;
    --secondary: #f1f3f7;
    --success: #02985f;
    --success-soft: #dbf9e6;
    --warning: #da950b;
    --warning-soft: #fff0cc;
    --destructive: #db2a3d;
    --destructive-soft: #ffeae8;
    --border: #e2e5e9;
    --shadow: 0 10px 28px rgba(19, 25, 34, 0.07);
  }
`;

// Captures a (typically off-screen) DOM node as a raster image and lays it
// across as many A4 pages as its height needs. html2canvas renders text via
// the browser's own canvas text shaping, so Hebrew/RTL comes out correctly
// without needing to embed a font into jsPDF (its built-in fonts have no
// Hebrew glyphs and no bidi support).
//
// jsPDF + html2canvas are loaded on demand (not bundled into the main
// chunk): every other screen in this app is used by workers who never touch
// PDF export, so they shouldn't pay for it on first load.
export async function exportElementToPdf(element: HTMLElement, fileName: string) {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    onclone: (clonedDoc: Document) => {
      const style = clonedDoc.createElement("style");
      style.textContent = HEX_TOKEN_OVERRIDES;
      clonedDoc.head.appendChild(style);
    },
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let position = 0;
  let remaining = imgHeight;
  let page = 0;

  while (remaining > 0) {
    if (page > 0) {
      pdf.addPage();
    }

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    remaining -= pageHeight;
    position -= pageHeight;
    page += 1;
  }

  pdf.save(fileName);
}
