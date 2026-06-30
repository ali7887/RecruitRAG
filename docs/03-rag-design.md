# RAG Design

## Chunking

Resume text is split into chunks of:
- 300-500 words

Purpose:
- improve embedding relevance
- reduce hallucinations

## Embeddings

Model:
- text-embedding-3-small

## Retrieval

Similarity:
- cosine similarity

Top K:
- top 3 chunks

## Analysis

Claude receives:
- relevant chunks
- job description

Claude returns:
- match score
- strengths
- gaps
- interview questions

## Hybrid Score

Final score combines:
- semantic similarity
- LLM analysis score
