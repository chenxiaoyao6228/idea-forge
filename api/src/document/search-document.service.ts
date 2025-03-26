import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { SearchDocumentDto } from "./document.dto";
import { ContentMatch } from "shared";

@Injectable()
export class SearchDocumentService {
  constructor(private prisma: PrismaService) {}

  async searchDocuments(ownerId: number, { keyword, sort, order, limit }: SearchDocumentDto) {
    try {
      if (!keyword) {
        return {
          documents: [],
          contentMatches: [],
          total: 0,
        };
      }
      // Title matches remain the same
      const titleMatches = await this.prisma.doc.findMany({
        where: {
          ownerId,
          title: { contains: keyword, mode: "insensitive" },
        },
        select: {
          id: true,
          title: true,
        },
        orderBy: {
          [sort]: order,
        },
        take: limit,
      });

      // 添加一个调试查询
      const debugQuery = await this.prisma.$queryRaw`
        WITH JsonContent AS (
          SELECT 
            d.id,
            d.title,
            d.content::jsonb as content
          FROM "Doc" d
          WHERE d."ownerId" = ${ownerId}
            AND d.content::text LIKE ${`%${keyword}%`}
        )
        SELECT 
          id,
          title,
          jsonb_pretty(content) as formatted_content
        FROM JsonContent
        LIMIT 1;
      `;
      console.log("Debug Query Result:", JSON.stringify(debugQuery, null, 2));

      // Modified content matches query with context
      const contentMatches = await this.prisma.$queryRaw<ContentMatch[]>`
        WITH RECURSIVE JsonContent AS (
          SELECT 
            d.id,
            d.title,
            CASE 
              WHEN d.content IS NULL OR d.content = '' 
              THEN '{"content":[]}'::jsonb 
              ELSE d.content::jsonb
            END as content
          FROM "Doc" d
          WHERE d."ownerId" = ${ownerId}
            AND NOT d."isArchived"
        ),
        Blocks AS (
          SELECT 
            id,
            title,
            jsonb_array_elements(content->'content') as block,
            ROW_NUMBER() OVER (PARTITION BY id ORDER BY id) as block_position
          FROM JsonContent
        ),
        BlockText AS (
          SELECT
            id,
            title,
            block_position,
            block->>'type' as block_type,
            block#>>'{attrs,id}' as node_id,
            CASE
              WHEN block->>'type' = 'codeBlock' THEN
                -- 对于代码块，我们需要获取整个文本内容
                COALESCE(block#>>'{content,0,text}', '')
              WHEN block->>'type' IN ('paragraph', 'heading', 'tableCell', 'listItem', 'taskItem') THEN
                -- 对于其他类型，我们需要处理可能的嵌套内容
                CASE
                  WHEN jsonb_typeof(block->'content') = 'array' AND 
                       jsonb_array_length(block->'content') > 0 THEN
                    COALESCE(
                      block#>>'{content,0,text}',
                      block#>>'{content,0,content,0,text}',
                      ''
                    )
                  ELSE ''
                END
              ELSE ''
            END as text_content
          FROM Blocks
        )
        SELECT 
          id,
          title,
          array_agg(
            json_build_object(
              'text', text_content,
              'position', block_position,
              'type', block_type,
              'nodeId', COALESCE(node_id, ''),
              'beforeText', 
                LEFT(
                  text_content,
                  GREATEST(0, POSITION(${keyword} IN LOWER(text_content)) - 31)
                ),
              'afterText',
                RIGHT(
                  text_content,
                  GREATEST(0, 
                    LENGTH(text_content) - 
                    (POSITION(${keyword} IN LOWER(text_content)) + LENGTH(${keyword}) + 30)
                  )
                )
            )
          ) as matches
        FROM BlockText
        WHERE 
          block_type IN (
            'heading', 
            'paragraph', 
            'blockQuote', 
            'code', 
            'codeBlock', 
            'link', 
            'tableCell', 
            'tableRow', 
            'tableHeader', 
            'listItem',
            'taskItem'
          )
          AND LOWER(text_content) LIKE ${`%${keyword.toLowerCase()}%`}
        GROUP BY id, title
        LIMIT ${limit}
      `;

      return {
        documents: titleMatches,
        contentMatches,
        total: titleMatches.length + contentMatches.length,
      };
    } catch (error) {
      console.error("Search documents error:", error);
      throw error;
    }
  }
}
