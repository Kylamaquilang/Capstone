import pkg from 'xlsx';
const { utils, writeFile } = pkg;

// Create a sample Excel file with proper format
export const createSampleExcel = async (req, res) => {
  try {
    // Sample data with proper structure
    const sampleData = [
      ['Student ID', 'First Name', 'Last Name', 'Email', 'Degree', 'Status'],
      ['20240001', 'John', 'Doe', 'john.doe@example.com', 'BSIT', 'regular'],
      ['20240002', 'Jane', 'Smith', 'jane.smith@example.com', 'BSED', 'regular'],
      ['20240003', 'Robert', 'Johnson', 'robert.johnson@example.com', 'BEED', 'irregular'],
      ['20240004', 'Maria', 'Garcia', 'maria.garcia@example.com', 'BSHM', 'regular'],
      ['20240005', 'David', 'Brown', 'david.brown@example.com', 'BSIT', 'regular']
    ];

    // Create workbook and worksheet
    const workbook = utils.book_new();
    const worksheet = utils.aoa_to_sheet(sampleData);
    
    // Add worksheet to workbook
    utils.book_append_sheet(workbook, worksheet, 'Students');
    
    // Generate Excel file buffer
    const excelBuffer = writeFile(workbook, { type: 'buffer' });
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="sample_students_template.xlsx"');
    res.setHeader('Content-Length', excelBuffer.length);
    
    // Send the file
    res.send(excelBuffer);
    
  } catch (error) {
    console.error('❌ Error creating sample Excel:', error);
    res.status(500).json({ error: 'Failed to create sample Excel file' });
  }
};
