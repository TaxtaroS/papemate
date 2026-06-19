"""Shared JSON Schema response formats for LLM calls that must be parsed.

초보자 안내:
- 일반 채팅 답변은 자연어라 자유롭게 두지만, 차트/표 응답은 프론트가 JSON으로 파싱해야 합니다.
- 그래서 LLM에게 "JSON으로 답해줘"라고 말만 하지 않고, API의 Structured Outputs 기능으로 모양을 고정합니다.
- 이 파일은 OpenAI/Gemini에 넘길 스키마를 한곳에 모아 두어 provider별 호출부가 같은 규격을 쓰게 합니다.
"""


JSON_VALUE_SCHEMA = {
    "anyOf": [
        {"type": "string"},
        {"type": "number"},
        {"type": "boolean"},
        {"type": "null"},
    ]
}

# 시각화 JSON은 프론트 렌더러와 직접 맞물립니다.
# 자유로운 키를 허용하면 모델이 "2024매출", "값(명)" 같은 임의 키를 만들 수 있어
# xAxisKey/series.dataKey 연결이 자주 깨집니다. 그래서 data row 키를 제한합니다.
OPENAI_VISUAL_RESPONSE_FORMAT = {
    "type": "json_schema",
    "json_schema": {
        "name": "papermate_visual_response",
        "strict": True,
        "schema": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "reasoning_summary": {"type": "string"},
                "type": {"type": "string", "enum": ["chart", "table", "mindmap"]},
                "title": {"type": "string"},
                "chartType": {"type": "string", "enum": ["bar", "line", "pie", "none"]},
                "template": {
                    "type": "string",
                    "enum": [
                        "monthly_trend",
                        "yearly_trend",
                        "regional_bar",
                        "category_bar",
                        "dual_axis",
                        "default",
                        "none",
                    ],
                },
                "xAxisKey": {"type": "string"},
                "columns": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "key": {"type": "string"},
                            "label": {"type": "string"},
                        },
                        "required": ["key", "label"],
                    },
                },
                "series": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "dataKey": {"type": "string"},
                            "name": {"type": "string"},
                            "yAxisId": {"type": "string", "enum": ["left", "right"]},
                        },
                        "required": ["dataKey", "name", "yAxisId"],
                    },
                },
                "data": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "month": JSON_VALUE_SCHEMA,
                            "year": JSON_VALUE_SCHEMA,
                            "category": JSON_VALUE_SCHEMA,
                            "label": JSON_VALUE_SCHEMA,
                            "value": JSON_VALUE_SCHEMA,
                            "value2": JSON_VALUE_SCHEMA,
                            "value3": JSON_VALUE_SCHEMA,
                            "value4": JSON_VALUE_SCHEMA,
                        },
                        "required": [
                            "month",
                            "year",
                            "category",
                            "label",
                            "value",
                            "value2",
                            "value3",
                            "value4",
                        ],
                    },
                },
            },
            "required": [
                "reasoning_summary",
                "type",
                "title",
                "chartType",
                "template",
                "xAxisKey",
                "columns",
                "series",
                "data",
            ],
        },
    },
}


# Gemini REST API는 OpenAI의 response_format 래퍼 없이 schema 본문만 받기 때문에
# 같은 스키마 본문을 재사용합니다.
GEMINI_VISUAL_RESPONSE_SCHEMA = OPENAI_VISUAL_RESPONSE_FORMAT["json_schema"]["schema"]


# 분석 결과를 표로 바꾸는 보조 LLM 호출용 스키마입니다.
# 숫자 범위 보정은 table_visual.py의 _coerce_percent에서 다시 처리하므로
# 여기서는 구조 자체가 깨지지 않는 데 집중합니다.
OPENAI_TABLE_RESPONSE_FORMAT = {
    "type": "json_schema",
    "json_schema": {
        "name": "papermate_table_summary",
        "strict": True,
        "schema": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "title": {"type": "string"},
                "text": {"type": "string"},
                "data": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "toc": {"type": "string"},
                            "content": {"type": "string"},
                            "importance": {"type": "integer"},
                            "accuracy": {"type": "integer"},
                        },
                        "required": ["toc", "content", "importance", "accuracy"],
                    },
                },
            },
            "required": ["title", "text", "data"],
        },
    },
}
