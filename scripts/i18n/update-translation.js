// update translation from en.json to other languages

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const dotenv = require("dotenv");
const OpenAI = require("openai");

dotenv.config({ path: path.join(__dirname, "trans.env") });

// Keys to update by force
const keysToUpdate = [
  //
];

// Path to the i18n locale directories
const localeDirs = [
  path.join(__dirname, "../../api/locales"),
  path.join(__dirname, "../../api/public/locales"),
];

const config = {
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.siliconflow.cn/v1",
  model: "deepseek-ai/DeepSeek-V3",
};

const openai = new OpenAI(config);

async function translateText(texts, targetLang) {
  const prompt = `Translate the following texts from English to ${targetLang}. Important rules:
1. DO NOT translate any HTML-like tags such as <bold>, <br/>, <ul>, <li>, etc.
2. DO NOT translate placeholders like {{organizationName}}
3. Preserve all formatting and tags exactly as they appear
4. Only translate the actual text content between tags

Original texts:
${texts.join("\n")}

Example:
English: "Hello <bold>{{name}}</bold> "
German: "Hallo <bold>{{name}}</bold> "

Translations:`;

  console.log("texts", texts);

  try {
    const response = await openai.chat.completions.create({
      model: config.model,
      messages: [
        {
          role: "system",
          content:
            "You are a professional translator. You must preserve all HTML tags (<bold>, <br/>, <ul>, <li>, etc) and placeholders ({{name}}) exactly as they appear in the original text. Only translate the actual content between tags.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
    });

    return response.choices[0].message.content
      .trim()
      .split("\n")
      .map((line) => line.trim());
  } catch (error) {
    console.error("Translation API error:", error);
    throw error;
  }
}

function readJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return null;
  }
}

function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
    return true;
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error.message);
    return false;
  }
}

// Update translations sequentially
async function updateTranslations() {
  try {
    // Process each locale directory
    for (const localeDir of localeDirs) {
      console.log(`\n📁 Processing directory: ${localeDir}`);
      
      if (!fs.existsSync(localeDir)) {
        console.log(`⚠️ Directory doesn't exist, skipping: ${localeDir}`);
        continue;
      }

      const enUSPath = path.join(localeDir, "en.json");
      const enUSData = readJsonFile(enUSPath);

      if (!enUSData) {
        console.log(`⚠️ Could not read en.json in ${localeDir}, skipping...`);
        continue;
      }

      const files = fs.readdirSync(localeDir);
      const langFiles = files.filter(
        (file) => file.endsWith(".json") && file !== "en.json",
      );

      const BATCH_SIZE = 100;

      // Process all languages in parallel for current directory
      await Promise.all(
        langFiles.map(async (langFile) => {
          const langCode = langFile.replace(".json", "");
          const filePath = path.join(localeDir, langFile);
          const langData = readJsonFile(filePath) || {};
          const updatedTranslations = { ...langData };

          // Collect all texts and keys that need translation
          const allTextsToTranslate = [];
          const allKeysToTranslate = [];

          for (const [key, enValue] of Object.entries(enUSData)) {
            if (keysToUpdate.includes(key) || !langData[key]) {
              allTextsToTranslate.push(enValue);
              allKeysToTranslate.push(key);
            }
          }

          // Create batches
          const batches = [];
          for (let i = 0; i < allTextsToTranslate.length; i += BATCH_SIZE) {
            batches.push({
              texts: allTextsToTranslate.slice(i, i + BATCH_SIZE),
              keys: allKeysToTranslate.slice(i, i + BATCH_SIZE),
              batchNumber: Math.floor(i / BATCH_SIZE) + 1,
            });
          }

          // Process all batches for this language in parallel
          await Promise.all(
            batches.map(async ({ texts, keys, batchNumber }) => {
              console.log(
                `Translating batch ${batchNumber} (${texts.length} items) for ${langCode}...`,
              );

              const translations = await translateText(texts, langCode);

              // Update translations for this batch
              translations.forEach((translation, index) => {
                const key = keys[index];
                updatedTranslations[key] = translation;
              });
            }),
          );

          // Remove the "undefined" key if it exists
        delete updatedTranslations["undefined"];

          // Write updated translations
          if (writeJsonFile(filePath, updatedTranslations)) {
            console.log(`✅ Updated translations for ${langCode}`);
          }
        }),
      );
    }

    // Sort translations after all updates are complete
    console.log("\n🔄 Sorting translation files...");
    const { sortLocaleFiles } = require("./sort-locale.js");
    sortLocaleFiles(localeDirs);

    console.log("\n🎉 All translations have been updated and sorted successfully!");
  } catch (error) {
    console.error("❌ Error updating translations:", error.message);
  }
}

updateTranslations().catch(console.error);
