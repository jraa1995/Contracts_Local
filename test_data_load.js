/**
 * Test script to verify data loading works
 * Run this function in Google Apps Script to test
 */
function testDataLoad() {
  console.log('=== Testing Data Load ===');
  
  try {
    const data = getContractData();
    console.log('SUCCESS: Loaded', data.length, 'contracts');
    
    if (data.length > 0) {
      console.log('First contract:', JSON.stringify(data[0]));
      console.log('Contract keys:', Object.keys(data[0]).join(', '));
    }
    
    return {
      success: true,
      count: data.length,
      sample: data[0]
    };
    
  } catch (error) {
    console.error('FAILED:', error.message);
    console.error('Stack:', error.stack);
    return {
      success: false,
      error: error.message
    };
  }
}
