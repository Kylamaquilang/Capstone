import pkg from 'xlsx';
const { readFile, utils } = pkg;
import fs from 'fs';

// Test function to debug Excel file structure
export const debugExcelFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('🔍 Debugging Excel file:', req.file.originalname);
    console.log('🔍 File path:', req.file.path);
    console.log('🔍 File size:', req.file.size);

    // Read the Excel file
    const workbook = readFile(req.file.path);
    console.log('🔍 Sheet names:', workbook.SheetNames);
    
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON with different options
    const jsonDataArray = utils.sheet_to_json(worksheet, { header: 1 });
    const jsonDataObject = utils.sheet_to_json(worksheet, { header: 'A' });
    
    console.log('🔍 Raw JSON (array format):', jsonDataArray.slice(0, 3));
    console.log('🔍 Raw JSON (object format):', jsonDataObject.slice(0, 3));
    
    // Show headers
    if (jsonDataArray.length > 0) {
      const headers = jsonDataArray[0];
      console.log('🔍 Headers from array:', headers);
    }
    
    if (jsonDataObject.length > 0) {
      const firstRow = jsonDataObject[0];
      console.log('🔍 Headers from object:', Object.keys(firstRow));
    }

    // Clean up
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.json({
      message: 'Excel file debug completed',
      sheetNames: workbook.SheetNames,
      arrayFormat: jsonDataArray.slice(0, 3),
      objectFormat: jsonDataObject.slice(0, 3),
      headers: jsonDataArray.length > 0 ? jsonDataArray[0] : null,
      objectHeaders: jsonDataObject.length > 0 ? Object.keys(jsonDataObject[0]) : null
    });

  } catch (error) {
    console.error('❌ Debug error:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
};
