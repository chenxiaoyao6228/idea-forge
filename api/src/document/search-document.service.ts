import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { SearchDocumentDto } from "./document.dto";
import { ContentMatch, SearchDocumentResponse } from "shared";

@Injectable()
export class SearchDocumentService {
  constructor(private prisma: PrismaService) {}

  async searchDocuments(ownerId: number, { keyword, sort, order, limit }: SearchDocumentDto): Promise<SearchDocumentResponse> {
    try {
      if (!keyword) {
        return {
          titleMatches: [],
          contentMatches: [],
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
                block#>>'{content,0,text}'
              WHEN block->>'type' IN ('paragraph', 'heading', 'tableCell', 'listItem', 'taskItem') THEN
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
        ),
        MatchedText AS (
            SELECT
              id,
              title,
              block_type,
              node_id,
              text_content,
              position(LOWER(${keyword}) in LOWER(text_content)) as match_position,
              length(${keyword}) as keyword_length
            FROM BlockText
            WHERE 
              block_type IN ('heading', 'paragraph', 'codeBlock', 'tableCell', 'listItem', 'taskItem')
              AND text_content IS NOT NULL
              AND text_content != ''
              AND LOWER(text_content) LIKE ${`%${keyword.toLowerCase()}%`}
          )
        SELECT 
          id,
          title,
          array_agg(
            json_build_object(
              'text', 
              CASE
                WHEN length(text_content) <= 140 THEN text_content
                ELSE
                  concat(
                    CASE 
                      WHEN match_position <= 65 THEN ''
                      ELSE '...'
                    END,
                    substring(
                      text_content 
                      from greatest(1, match_position - 65) 
                      for least(
                        length(text_content),
                        CASE 
                          WHEN match_position <= 65 THEN 130 + match_position
                          ELSE 130
                        END
                      )
                    ),
                    CASE 
                      WHEN (match_position + keyword_length + 65) >= length(text_content) THEN ''
                      ELSE '...'
                    END
                  )
              END,
              'type', block_type,
              'nodeId', COALESCE(node_id, '')
            )
          ) as matches
        FROM MatchedText
        GROUP BY id, title
        LIMIT ${limit}
      `;

      return {
        titleMatches,
        contentMatches,
      };
    } catch (error) {
      console.error("Search documents error:", error);
      throw error;
    }
  }
}
