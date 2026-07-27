const XLSX = require("xlsx");
const file = "C:/Users/ander/Downloads/PRODUTOS_hdecker_fabricantes_vazios_preenchidos - TESTE HDECKER.xlsx";
const workbook = XLSX.readFile(file);
const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {
  defval: "",
  raw: false,
});
const linesBook = XLSX.readFile("C:/Users/ander/OneDrive/Desktop/LINHAS.xlsx");
const lineRows = XLSX.utils.sheet_to_json(linesBook.Sheets[linesBook.SheetNames[0]], {
  defval: "",
  raw: false,
});
const validCodes = new Set(lineRows.map((row) => String(row["CÓDIGO"] || "").trim()));
const found = rows
  .map((row, index) => ({ row: index + 2, data: row }))
  .filter(({ data }) => {
    const code = String(data["Cod Linha"] || "").replace(/['"]/g, "").trim();
    return code && !validCodes.has(code);
  })
  .slice(0, 100);
console.log(JSON.stringify({
  validLineCodes: validCodes.size,
  missingCount: rows.filter((data) => {
    const code = String(data["Cod Linha"] || "").replace(/['"]/g, "").trim();
    return code && !validCodes.has(code);
  }).length,
  found: found.map(({ row, data }) => ({
    row,
    produto: data["Cod Produto"],
    codLinha: data["Cod Linha"],
    nomeLinha: data["Nome Linha"],
    nomeLinhaAlternativo: data["Nome Linha_1"],
    ativo: data["Ativo"],
  })),
}, null, 2));
