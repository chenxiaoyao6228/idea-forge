# Test Fixtures

This directory contains test files for document import functionality.

## Files

### Markdown
- **test-document.md** - Sample markdown file with various formatting features

### HTML
- **test-document.html** - Sample HTML file with various elements

### CSV
- **test-data.csv** - Sample CSV file with employee data (5 rows)

### DOCX (Word Documents)
- **file-sample_500kB.docx** - 500KB DOCX file for testing
- **file-sample_1MB.docx** - 1MB DOCX file for testing

### DOC (Legacy Word)
- **file-sample_500kB.doc** - Legacy .doc format (not currently supported)

### XLS/XLSX (Excel - Not Yet Supported)
- **file_example_XLSX_10.xlsx** - Small Excel file (10 rows)
- **file_example_XLSX_5000.xlsx** - Large Excel file (5000 rows)
- **file_example_XLS_100.xls** - Legacy Excel format (100 rows)
- **file_example_XLS_5000.xls** - Legacy Excel format (5000 rows)

## Supported Formats

Currently, the document converter supports:
- ✅ Markdown (.md, .markdown)
- ✅ HTML (.html, .htm)
- ✅ DOCX (.docx)
- ✅ CSV (.csv)

## Usage in Tests

### Unit Tests

```typescript
import * as fs from "fs";
import * as path from "path";

const FIXTURES_DIR = path.join(__dirname, "../test/fixtures");
const markdown = fs.readFileSync(path.join(FIXTURES_DIR, "test-document.md"), "utf-8");
```

### Integration Tests

```bash
# Test specific file
npx tsx scripts/test-document-import.ts apps/api/test/fixtures/test-document.md

# Test all fixtures
npx tsx scripts/test-document-import.ts --all
```

## Adding New Fixtures

When adding new test files:
1. Place the file in this directory
2. Update this README
3. Add to the TEST_FILES array in `scripts/test-document-import.ts`
4. Add test case in `src/_shared/utils/document-converter.test.ts`
