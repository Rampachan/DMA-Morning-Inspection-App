const fs = require('fs');
const path = require('path');

const src = 'C:\\Users\\Admin\\.gemini\\antigravity\\scratch\\mobile-compliance-system\\MCRS_Comprehensive_QA_Test_Report.pdf';
const desktop = 'C:\\Users\\Admin\\Desktop\\MCRS_Comprehensive_QA_Test_Report.pdf';
const publicDir = 'C:\\Users\\Admin\\.gemini\\antigravity\\scratch\\mobile-compliance-system\\dashboard\\public\\MCRS_Comprehensive_QA_Test_Report.pdf';

fs.copyFileSync(src, desktop);
console.log('Successfully copied to Desktop:', desktop);

try {
  const pubPath = path.dirname(publicDir);
  if (!fs.existsSync(pubPath)) {
    fs.mkdirSync(pubPath, { recursive: true });
  }
  fs.copyFileSync(src, publicDir);
  console.log('Successfully copied to Dashboard Public folder:', publicDir);
} catch (e) {
  console.log('Public folder copy:', e.message);
}
