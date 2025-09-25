import pkg from 'xlsx';
const { readFile, utils } = pkg;
import fs from 'fs';

// Simple test endpoint to see Excel structure
export const testExcelStructure = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('🔍 Testing Excel structure:', req.file.originalname);

    // Read the Excel file
    const workbook = readFile(req.file.path);
    console.log('🔍 Sheet names:', workbook.SheetNames);
    
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Get the range of the worksheet
    const range = utils.decode_range(worksheet['!ref'] || 'A1:A1');
    console.log('🔍 Worksheet range:', range);
    
    // Convert to JSON with different options
    const jsonDataArray = utils.sheet_to_json(worksheet, { 
      header: 1,
      defval: '', // Use empty string for empty cells
      raw: false  // Convert all values to strings
    });
    
    console.log('🔍 Total rows:', jsonDataArray.length);
    console.log('🔍 First 5 rows:', jsonDataArray.slice(0, 5));
    
    // Analyze each row to see what's actually there
    const analysis = jsonDataArray.map((row, index) => {
      return {
        rowNumber: index + 1,
        hasData: row.some(cell => cell && cell.toString().trim() !== ''),
        nonEmptyCells: row.filter(cell => cell && cell.toString().trim() !== '').length,
        cells: row.map(cell => cell ? cell.toString().trim() : ''),
        isEmpty: row.every(cell => !cell || cell.toString().trim() === '')
      };
    }).filter(row => row.hasData); // Only show rows with data
    
    console.log('🔍 Row analysis:', analysis.slice(0, 10));

    // Clean up
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.json({
      message: 'Excel structure analysis completed',
      fileName: req.file.originalname,
      sheetNames: workbook.SheetNames,
      totalRows: jsonDataArray.length,
      firstFiveRows: jsonDataArray.slice(0, 5),
      rowAnalysis: analysis.slice(0, 10),
      worksheetRange: range
    });

  } catch (error) {
    console.error('❌ Test error:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
};
