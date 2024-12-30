import { PrismaClient } from "@prisma/client";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();

interface PresetCover {
  id: string;
  key: string;
  url: string;
  contentType: string;
}

interface CategoryItem {
  url: string;
  id: string;
}

interface Category {
  name: string;
  items: CategoryItem[];
}

async function scanCoverDirectory(basePath: string): Promise<Map<string, PresetCover[]>> {
  const categories = new Map<string, PresetCover[]>();
  
  // 读取基础目录下的所有文件夹
  const dirs = await fs.readdir(basePath);
  
  for (const dir of dirs) {
    const dirPath = path.join(basePath, dir);
    const stat = await fs.stat(dirPath);
    
    if (stat.isDirectory()) {
      const files = await fs.readdir(dirPath);
      const covers: PresetCover[] = [];
      
      for (const file of files) {
        if (file.match(/\.(jpg|jpeg|png|gif)$/i)) {
          const filePath = path.join(dir, file);
          const contentType = `image/${path.extname(file).slice(1)}`;
          
          covers.push({
            id: uuidv4(),
            key: uuidv4(),
            url: `/images/cover/${filePath}`,
            contentType,
          });
        }
      }
      
      if (covers.length > 0) {
        categories.set(dir, covers);
      }
    }
  }
  
  return categories;
}

async function ensurePresetCovers(covers: Map<string, PresetCover[]>) {
  for (const [category, categoryCovers] of covers) {
    for (const cover of categoryCovers) {
      // 检查文件是否已存在
      const existingFile = await prisma.file.findFirst({
        where: {
          url: cover.url,
    
        },
      });
      
      if (!existingFile) {
        await prisma.file.create({
          data: {
            id: cover.id,
            key: cover.key,
            url: cover.url,
            contentType: cover.contentType,
            status: "active",
          },
        });
      }
    }
  }
}

async function generateTypeFile(covers: Map<string, PresetCover[]>) {
  const categories: Category[] = [];
  
  for (const [categoryName, categoryCovers] of covers) {
    categories.push({
      name: categoryName,
      items: categoryCovers.map(cover => ({
        url: cover.url,
        id: cover.id,
      })),
    });
  }
  
  const content = `// Auto-generated file. Do not edit manually.
export const PRESET_CATEGORIES = ${JSON.stringify(categories, null, 2)} as const;

export type PresetCategory = typeof PRESET_CATEGORIES[number];
export type PresetCoverItem = PresetCategory['items'][number];
`;
  
  await fs.writeFile(
    path.resolve(__dirname, '../../shared/src/auto-gen-cover-data.ts'),
    content,
    'utf-8'
  );
}

async function main() {
  try {
    const coverPath = path.resolve(__dirname, '../public/images/cover');
    const covers = await scanCoverDirectory(coverPath);
    
    // 确保所有预设封面都在数据库中
    await ensurePresetCovers(covers);
    
    // 生成 TypeScript 类型文件
    await generateTypeFile(covers);
    
    console.log('Successfully generated preset covers data');
  } catch (error) {
    console.error('Error generating preset covers:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();