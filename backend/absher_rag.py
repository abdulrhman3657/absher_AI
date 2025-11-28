# backend/absher_rag.py
from functools import lru_cache
from pathlib import Path
from typing import List, Dict, Any

import json
from langchain_community.vectorstores import FAISS
from langchain.docstore.document import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from config import embeddings

KNOWLEDGE_DIR = Path(__file__).with_name("knowledge")
JSON_PATH = KNOWLEDGE_DIR / "absher_knowledge.json"


# ---------------------------------------------------------
# Load JSON -> List[Document]
# ---------------------------------------------------------
def _load_json_docs() -> List[Document]:
    if not JSON_PATH.exists():
        return []

    try:
        data = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    except Exception:
        return []

    sections = data.get("sections", [])
    docs: List[Document] = []

    for entry in sections:
        text = entry.get("text", "").strip()
        if not text:
            continue

        docs.append(
            Document(
                page_content=text,
                metadata={
                    "id": entry.get("id", "unknown"),
                    "title": entry.get("title", "Untitled Section"),
                    "source": str(JSON_PATH),
                },
            )
        )

    return docs


# ---------------------------------------------------------
# Build FAISS index
# ---------------------------------------------------------
def _build_vector_index() -> FAISS:
    raw_docs = _load_json_docs()
    if not raw_docs:
        # safe default index
        return FAISS.from_texts(
            texts=[""],
            embedding=embeddings,
            metadatas=[{"source": "empty"}],
        )

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=700,
        chunk_overlap=120,
        separators=["\n\n", "\n", ".", " "],
    )

    chunks: List[Document] = []
    for doc in raw_docs:
        chunks.extend(splitter.split_documents([doc]))

    texts = [c.page_content for c in chunks]
    metadatas = [c.metadata for c in chunks]

    return FAISS.from_texts(
        texts=texts,
        embedding=embeddings,
        metadatas=metadatas,
    )


@lru_cache(maxsize=1)
def get_absher_index() -> FAISS:
    return _build_vector_index()


# ---------------------------------------------------------
# Search API for agent
# ---------------------------------------------------------
def search_absher_docs(query: str, k: int = 4) -> str:
    index = get_absher_index()
    docs = index.similarity_search(query, k=k)

    if not docs:
        return "No relevant information found in the Absher documentation."

    response_parts = []
    for i, d in enumerate(docs, start=1):
        title = d.metadata.get("title", "Section")
        response_parts.append(
            f"{title}\n{d.page_content.strip()}"
        )

    return "\n\n".join(response_parts)
