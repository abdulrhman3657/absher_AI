# backend/config.py
import os

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from openai import OpenAI

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("Please set OPENAI_API_KEY environment variable.")


# -------------------------------
# LLM 1: Main chat / service tools
# -------------------------------
chat_llm = ChatOpenAI(
    model="gpt-4.1-mini",
    temperature=0.2,
)

# -------------------------------
# LLM 2: Notifications & SMS writer
# -------------------------------
notification_llm = ChatOpenAI(
    model="gpt-4.1-mini",
    temperature=0.0,
)

# -------------------------------
# Embeddings for FAISS
# -------------------------------
embeddings = OpenAIEmbeddings(
    model="text-embedding-3-small",
)

# -------------------------------
# Audio client for voice features
# -------------------------------
audio_client = OpenAI()  # uses OPENAI_API_KEY from env
