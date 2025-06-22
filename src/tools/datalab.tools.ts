import { zodToJsonSchema } from "zod-to-json-schema";
import {
  DatalabSearchSchema,
  DatalabShoppingSchema,
  DatalabShoppingDeviceSchema,
  DatalabShoppingGenderSchema,
  DatalabShoppingAgeSchema,
  DatalabShoppingKeywordsSchema,
  DatalabShoppingKeywordDeviceSchema,
  DatalabShoppingKeywordGenderSchema,
  DatalabShoppingKeywordAgeSchema
} from "../schemas/datalab.schemas.js";

/**
 * 데이터랩 관련 도구 정의
 */
export const datalabTools = [
  {
    name: "datalab_search",
    description: "Perform a trend analysis on Naver search keywords. (네이버 검색어 트렌드 분석)",
    inputSchema: zodToJsonSchema(DatalabSearchSchema),
  },
  {
    name: "datalab_shopping_category",
    description: "Perform a trend analysis on Naver Shopping category. (네이버 쇼핑 카테고리별 트렌드 분석)",
    inputSchema: zodToJsonSchema(DatalabShoppingSchema),
  },
  {
    name: "datalab_shopping_by_device",
    description: "Perform a trend analysis on Naver Shopping by device. (네이버 쇼핑 기기별 트렌드 분석)",
    inputSchema: zodToJsonSchema(
      DatalabShoppingDeviceSchema.pick({
        startDate: true,
        endDate: true,
        timeUnit: true,
        category: true,
        device: true,
      })
    ),
  },
  {
    name: "datalab_shopping_by_gender",
    description: "Perform a trend analysis on Naver Shopping by gender. (네이버 쇼핑 성별 트렌드 분석)",
    inputSchema: zodToJsonSchema(
      DatalabShoppingGenderSchema.pick({
        startDate: true,
        endDate: true,
        timeUnit: true,
        category: true,
        gender: true,
      })
    ),
  },
  {
    name: "datalab_shopping_by_age",
    description: "Perform a trend analysis on Naver Shopping by age. (네이버 쇼핑 연령별 트렌드 분석)",
    inputSchema: zodToJsonSchema(
      DatalabShoppingAgeSchema.pick({
        startDate: true,
        endDate: true,
        timeUnit: true,
        category: true,
        ages: true,
      })
    ),
  },
  {
    name: "datalab_shopping_keywords",
    description: "Perform a trend analysis on Naver Shopping keywords. (네이버 쇼핑 키워드별 트렌드 분석)",
    inputSchema: zodToJsonSchema(DatalabShoppingKeywordsSchema),
  },
  {
    name: "datalab_shopping_keyword_by_device",
    description: "Perform a trend analysis on Naver Shopping keywords by device. (네이버 쇼핑 키워드 기기별 트렌드 분석)",
    inputSchema: zodToJsonSchema(DatalabShoppingKeywordDeviceSchema),
  },
  {
    name: "datalab_shopping_keyword_by_gender",
    description: "Perform a trend analysis on Naver Shopping keywords by gender. (네이버 쇼핑 키워드 성별 트렌드 분석)",
    inputSchema: zodToJsonSchema(DatalabShoppingKeywordGenderSchema),
  },
  {
    name: "datalab_shopping_keyword_by_age",
    description: "Perform a trend analysis on Naver Shopping keywords by age. (네이버 쇼핑 키워드 연령별 트렌드 분석)",
    inputSchema: zodToJsonSchema(DatalabShoppingKeywordAgeSchema),
  },
]; 