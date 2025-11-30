from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List

import json
from langchain_community.vectorstores import FAISS
from langchain.docstore.document import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from config import embeddings

KNOWLEDGE_DIR = Path(__file__).with_name("knowledge")
JSON_PATH = KNOWLEDGE_DIR / "absher_knowledge.json"


def _load_json_docs() -> List[Document]:
    """
    Load Absher documentation from the JSON file into a list of Documents.
    Each section becomes a Document with metadata (id, title, source).
    """
    if not JSON_PATH.exists():
        return []

    try:
        data: Dict[str, Any] = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    except Exception:
        return []

    sections = data.get("sections", [])
    docs: List[Document] = []

    for entry in sections:
        text = (entry.get("text") or "").strip()
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


def _build_vector_index() -> FAISS:
    """
    Build a FAISS index over the Absher documentation.
    If no docs are available, return a safe empty index.
    """
    raw_docs = _load_json_docs()
    if not raw_docs:
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
    """
    Cached accessor for the Absher FAISS index.
    """
    return _build_vector_index()


def search_absher_docs(query: str, k: int = 4) -> str:
    """
    Search the Absher documentation for the most relevant snippets.

    Returns a formatted string with titles and content, or a fallback
    message if nothing relevant is found.
    """
    index = get_absher_index()
    docs = index.similarity_search(query, k=k)

    if not docs:
        return "No relevant information found in the Absher documentation."

    response_parts: List[str] = []
    for doc in docs:
        title = doc.metadata.get("title", "Section")
        response_parts.append(f"{title}\n{doc.page_content.strip()}")

    return "\n\n".join(response_parts)
