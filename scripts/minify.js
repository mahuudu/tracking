const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

async function minifyFiles() {
  const distDir = path.join(__dirname, '..', 'dist');
  
  // Find all JS files recursively
  function findJSFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        findJSFiles(filePath, fileList);
      } else if (file.endsWith('.js') && !file.endsWith('.min.js')) {
        fileList.push(filePath);
      }
    });
    return fileList;
  }

  const jsFiles = findJSFiles(distDir);
  
  console.log(`Found ${jsFiles.length} files to minify...`);
  
  for (const file of jsFiles) {
    try {
      const result = await esbuild.build({
        entryPoints: [file],
        bundle: false,
        minify: true,
        format: 'esm',
        target: 'es2020',
        outfile: file,
        write: false,
      });
      
      fs.writeFileSync(file, result.outputFiles[0].text);
      const originalSize = fs.statSync(file).size;
      console.log(`✓ ${path.relative(distDir, file)} (${(originalSize / 1024).toFixed(2)} KB)`);
    } catch (error) {
      console.error(`✗ Error minifying ${file}:`, error.message);
    }
  }
  
  console.log('\nMinification complete!');
}

minifyFiles().catch(console.error);

