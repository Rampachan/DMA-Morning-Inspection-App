import * as fs from 'fs';
import * as path from 'path';
import * as ExcelJS from 'exceljs';

async function parseExcel() {
  const filePath = 'D:/corp & reg numbers/ULB details (1).xlsx';
  console.log(`Reading "${filePath}"...`);

  if (!fs.existsSync(filePath)) {
    console.error(`File not found at: ${filePath}`);
    process.exit(1);
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);

  const output: Record<string, any[]> = {};

  wb.eachSheet((ws) => {
    const rows: any[] = [];
    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      rows.push({
        rowNumber,
        values: row.values,
      });
    });
    output[ws.name] = rows;
    console.log(`Sheet "${ws.name}": parsed ${rows.length} rows.`);
  });

  // Also check if corp contact nos exists and parse it
  const contactPath = 'D:/corp & reg numbers/corp contact nos (1).xlsx';
  if (fs.existsSync(contactPath)) {
    const contactWb = new ExcelJS.Workbook();
    await contactWb.xlsx.readFile(contactPath);
    contactWb.eachSheet((ws) => {
      const rows: any[] = [];
      ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        rows.push({
          rowNumber,
          values: row.values,
        });
      });
      output[`CONTACT_${ws.name}`] = rows;
      console.log(`Contact Sheet "${ws.name}": parsed ${rows.length} rows.`);
    });
  }

  const outPath = path.resolve(__dirname, 'ulb-raw-data.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');
  console.log(`\nSuccessfully wrote parsed data to: ${outPath}`);
}

parseExcel().catch((err) => {
  console.error('Error parsing excel:', err);
  process.exit(1);
});
