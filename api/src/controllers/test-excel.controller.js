import pkg from 'xlsx';
const { readFile, utils } = pkg;
import fs from 'fs';

// Simple test to see what's in the Excel file
export const testExcelProcessing = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('🧪 Testing Excel processing for:', req.file.originalname);

    // Read the Excel file
    const workbook = readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON with different options
    const jsonDataArray = utils.sheet_to_json(worksheet, { 
      header: 1,
      defval: '',
      raw: false
    });
    
    console.log('🧪 Raw Excel data:', jsonDataArray.slice(0, 5));
    
    // Process headers
    const headers = jsonDataArray[0].map(h => h ? h.toString().trim().toLowerCase() : '');
    console.log('🧪 Headers:', headers);
    
    // Process first few rows
    const results = [];
    for (let i = 1; i < Math.min(4, jsonDataArray.length); i++) {
      const row = jsonDataArray[i];
      const cleanedData = {};
      
      headers.forEach((header, index) => {
        cleanedData[header] = row[index] ? row[index].toString().trim() : '';
      });
      
      results.push(cleanedData);
    }
    
    console.log('🧪 Processed results:', results);

    // Clean up
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.json({
      message: 'Excel processing test completed',
      fileName: req.file.originalname,
      totalRows: jsonDataArray.length,
      headers: headers,
      sampleData: jsonDataArray.slice(0, 4),
      processedResults: results
    });

  } catch (error) {
    console.error('❌ Test error:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
};
