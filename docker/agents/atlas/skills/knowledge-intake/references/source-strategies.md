# Source-Specific Extraction Strategies

## YouTube Transcripts

YouTube transcripts are conversational, often messy, and contain filler. Strategy:
1. Identify the main topic/thesis from the first 2 minutes
2. Identify speaker changes and topic shifts
3. Extract by TOPIC SEGMENT, not arbitrary character splits
4. Weight conclusions and key takeaways higher than setup/context
5. Skip: intros, outros, sponsor segments, "like and subscribe" calls
6. Preserve speaker attribution when multiple speakers are present

## Articles & Web Pages

Articles have structure that aids extraction. Strategy:
1. Identify the article's thesis from the headline and first paragraph
2. Use headings to identify sections and their purpose
3. Weight conclusions, recommendations, and key arguments higher
4. Skip: navigation, sidebars, author bios, related article links
5. Preserve section context when extracting (which section did this come from?)

## PDFs & Documents

PDFs may have rich structure or be flat text. Strategy:
1. Use headings and chapter structure to segment content
2. Extract per-section with section context preserved
3. For academic papers: prioritize abstract, findings, and conclusions
4. For business documents: prioritize executive summary and recommendations
5. Skip: table of contents, bibliography, page headers/footers

## Meeting Transcripts

Meetings contain decisions, action items, and insights mixed with discussion. Strategy:
1. Identify decisions and their rationale (highest priority)
2. Extract action items with ownership
3. Pull insights and frameworks mentioned during discussion
4. Skip: scheduling logistics, "can you hear me", small talk
5. Attribute insights to speakers when possible

## General Text

For unstructured text or unknown sources:
1. Identify the main thesis or purpose of the content
2. Use the thesis as context for chunk-level extraction
3. Split on paragraph boundaries, not arbitrary character limits
4. Weight the introduction and conclusion sections higher
