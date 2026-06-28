import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const baseDir = "D:/MON3750/Data analysis";
const outputDir = `${baseDir}/outputs`;
const workbookOutDir = "D:/MON3750/reactor_analysis_outputs";
const tableDir = `${outputDir}/tables`;
const imageDir = `${outputDir}/images`;
const xlsxPath = `${workbookOutDir}/reactor_academy_survey_analysis.xlsx`;

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (quoted) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") {
      field += ch;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c !== ""));
}

async function readCsvMatrix(fileName) {
  const text = await fs.readFile(`${tableDir}/${fileName}`, "utf8");
  return parseCsv(text).map((row, idx) =>
    row.map((cell) => {
      if (idx > 0 && /^-?\d+(\.\d+)?$/.test(cell)) return Number(cell);
      return cell;
    }),
  );
}

function rangeFor(rows, cols) {
  function colName(n) {
    let s = "";
    while (n >= 0) {
      s = String.fromCharCode((n % 26) + 65) + s;
      n = Math.floor(n / 26) - 1;
    }
    return s;
  }
  return `A1:${colName(cols - 1)}${rows}`;
}

function styleTable(sheet, matrix, name) {
  const range = sheet.getRange(rangeFor(matrix.length, matrix[0].length));
  range.values = matrix;
  sheet.getRange(`A1:${String.fromCharCode(64 + matrix[0].length)}1`).format = {
    fill: "#111111",
    font: { bold: true, color: "#FFFFFF" },
  };
  range.format.borders = { preset: "inside", style: "thin", color: "#E7D9B7" };
  range.format.autofitColumns();
  sheet.tables.add(rangeFor(matrix.length, matrix[0].length), true, name);
  sheet.freezePanes.freezeRows(1);
  sheet.showGridLines = false;
}

async function addTableSheet(workbook, sheetName, csvFile, tableName) {
  const sheet = workbook.worksheets.add(sheetName);
  const matrix = await readCsvMatrix(csvFile);
  styleTable(sheet, matrix, tableName);
  return sheet;
}

const workbook = Workbook.create();

const executive = workbook.worksheets.add("Executive Summary");
executive.showGridLines = false;
executive.getRange("A1:H1").merge();
executive.getRange("A1").values = [["Reactor Academy Survey Analysis"]];
executive.getRange("A1").format = {
  fill: "#111111",
  font: { bold: true, color: "#FFFFFF", size: 18 },
};
executive.getRange("A3:H5").merge();
executive.getRange("A3").values = [[
  "A branded decision-support workbook for Reactor Frontier Launchpad. The analysis validates a short, hybrid, industry-connected sprint with strong emphasis on real company challenges, hands-on prototypes, pathway clarity, and partner-funded access.",
]];
executive.getRange("A3").format = { fill: "#FFF7E6", font: { color: "#222222" }, wrapText: true };

const metrics = [
  ["Metric", "Value"],
  ["Survey responses", 107],
  ["Aged 18-24", "89.7%"],
  ["University students", "89.7%"],
  ["Start with YouTube, Google, or AI", "93.5%"],
  ["Lack real industry exposure", "47.7%"],
  ["Prefer hybrid or in-person-heavy", "72.0%"],
  ["Rate Launchpad 4 or 5", "72.0%"],
];
executive.getRange("A7:B14").values = metrics;
executive.getRange("A7:B7").format = { fill: "#FFC233", font: { bold: true, color: "#111111" } };
executive.getRange("A7:B14").format.borders = { preset: "all", style: "thin", color: "#E7D9B7" };
executive.getRange("A:B").format.autofitColumns();

const dashboardPng = await fs.readFile(`${imageDir}/00_executive_dashboard.png`);
executive.images.add({
  dataUrl: `data:image/png;base64,${dashboardPng.toString("base64")}`,
  anchor: { from: { row: 6, col: 3 }, extent: { widthPx: 850, heightPx: 529 } },
});

await addTableSheet(workbook, "Opportunity Scores", "opportunity_scores.csv", "OpportunityScores");
await addTableSheet(workbook, "Learning Sources", "learning_source.csv", "LearningSources");
await addTableSheet(workbook, "Learning Gaps", "education_gap.csv", "LearningGaps");
await addTableSheet(workbook, "Content Demand", "want_to_learn.csv", "ContentDemand");
await addTableSheet(workbook, "Activity Demand", "learning_activities.csv", "ActivityDemand");
await addTableSheet(workbook, "Business Model", "access_model.csv", "AccessModel");
await addTableSheet(workbook, "Adoption Risks", "joining_hesitation.csv", "AdoptionRisks");
await addTableSheet(workbook, "Gap Heatmap", "gap_heatmap_by_field.csv", "GapHeatmap");

const visuals = workbook.worksheets.add("Visuals");
visuals.showGridLines = false;
visuals.getRange("A1:F1").merge();
visuals.getRange("A1").values = [["Branded slide visuals"]];
visuals.getRange("A1").format = { fill: "#111111", font: { bold: true, color: "#FFFFFF", size: 16 } };
const visualFiles = [
  "01_opportunity_scores.png",
  "02_gap_heatmap_by_field.png",
  "03_launchpad_validation.png",
  "04_business_model_evidence.png",
  "05_launchpad_blueprint.png",
];
let row = 3;
for (const file of visualFiles) {
  const bytes = await fs.readFile(`${imageDir}/${file}`);
  visuals.images.add({
    dataUrl: `data:image/png;base64,${bytes.toString("base64")}`,
    anchor: { from: { row, col: 0 }, extent: { widthPx: 850, heightPx: 478 } },
  });
  row += 27;
}

const clean = await readCsvMatrix("cleaned_survey_data.csv");
const raw = workbook.worksheets.add("Cleaned Survey Data");
styleTable(raw, clean, "CleanedSurveyData");

const preview = await workbook.render({
  sheetName: "Executive Summary",
  autoCrop: "all",
  scale: 1,
  format: "png",
});
await fs.mkdir(workbookOutDir, { recursive: true });
await fs.writeFile(`${workbookOutDir}/workbook_preview.png`, new Uint8Array(await preview.arrayBuffer()));

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 50 },
  summary: "final formula error scan",
});
console.log(errors.ndjson);

await fs.mkdir(workbookOutDir, { recursive: true });
const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(xlsxPath);
console.log(`Saved workbook: ${xlsxPath}`);
