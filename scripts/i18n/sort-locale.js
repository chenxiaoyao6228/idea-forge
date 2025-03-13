// node scripts/sort-locale.js [localeDirs...]

const fs = require("fs");
const path = require("path");

// Function to sort object keys recursively
function sortObjectKeys(obj) {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }

  return Object.keys(obj)
    .sort()
    .reduce((result, key) => {
      result[key] = sortObjectKeys(obj[key]);
      return result;
    }, {});
}

// Function to process a single file
function processFile(filePath) {
  try {
    // Read the file
    const content = fs.readFileSync(filePath, "utf8");

    // Parse JSON
    const json = JSON.parse(content);

    // Sort keys
    const sortedJson = sortObjectKeys(json);

    // Write back to file with proper formatting
    fs.writeFileSync(
      filePath,
      JSON.stringify(sortedJson, null, 2) + "\n",
      "utf8",
    );

    console.log(`✅ Sorted: ${path.basename(filePath)}`);
  } catch (error) {
    console.error(
      `❌ Error processing ${path.basename(filePath)}:`,
      error.message,
    );
  }
}

// Main function to process all locale files
function sortLocaleFiles(localeDirs) {
  try {
    // Process each locale directory
    localeDirs.forEach(localeDir => {
      console.log(`\n📁 Sorting directory: ${localeDir}`);
      
      if (!fs.existsSync(localeDir)) {
        console.log(`⚠️ Directory doesn't exist, skipping: ${localeDir}`);
        return;
      }

      // Read all files in the locale directory
      const files = fs.readdirSync(localeDir);

      // Process each JSON file
      files.forEach((file) => {
        if (file.endsWith(".json")) {
          const filePath = path.join(localeDir, file);
          processFile(filePath);
        }
      });
    });

    console.log("\n🎉 All locale files have been sorted successfully!");
  } catch (error) {
    console.error("❌ Error reading locale directory:", error.message);
  }
}

// Run the script if called directly
if (require.main === module) {
  const dirs = process.argv.slice(2);
  if (dirs.length === 0) {
    console.error("❌ Please provide at least one locale directory path");
    process.exit(1);
  }
  sortLocaleFiles(dirs);
}

// Export for use as module
module.exports = { sortLocaleFiles };
