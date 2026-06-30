import json
import os
from pathlib import Path
from typing import Any

import numpy as np


os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")

EMBEDDING_MODEL = "all-MiniLM-L6-v2"
CHUNK_TOKENS = 500
CHUNK_OVERLAP = 50
INDEX_FOLDER_NAME = "faiss_index"
PDF_LOAD_NUM_WORKERS = 0  # num_workers=0: load PDFs serially for Windows compatibility.

_BASE_DIR = Path(__file__).resolve().parent
_VECTOR_STORE: dict[str, Any] | None = None
_EMBEDDING_MODEL: Any | None = None


def _resolve_docs_folder(docs_folder: str | Path = "rag_docs") -> Path:
    folder = Path(docs_folder)
    if folder.is_absolute():
        return folder
    return _BASE_DIR / folder


def _index_paths(docs_path: Path) -> tuple[Path, Path]:
    index_dir = docs_path / INDEX_FOLDER_NAME
    return index_dir / "index.faiss", index_dir / "chunks.json"


def _get_embedding_model() -> Any:
    global _EMBEDDING_MODEL

    if _EMBEDDING_MODEL is None:
        from sentence_transformers import SentenceTransformer

        # PDF_LOAD_NUM_WORKERS=0 and CPU embedding keep first-run indexing predictable on Windows.
        try:
            _EMBEDDING_MODEL = SentenceTransformer(
                EMBEDDING_MODEL,
                device="cpu",
                local_files_only=True,
            )
        except Exception:
            _EMBEDDING_MODEL = SentenceTransformer(EMBEDDING_MODEL, device="cpu")
        _EMBEDDING_MODEL.max_seq_length = 512
    return _EMBEDDING_MODEL


def _chunk_text(text: str, model: Any) -> list[str]:
    cleaned = " ".join(text.split())
    if not cleaned:
        return []

    tokenizer = getattr(model, "tokenizer", None)
    if tokenizer is None:
        words = cleaned.split()
        step = max(CHUNK_TOKENS - CHUNK_OVERLAP, 1)
        return [" ".join(words[i : i + CHUNK_TOKENS]) for i in range(0, len(words), step)]

    token_ids = tokenizer.encode(cleaned, add_special_tokens=False)
    step = max(CHUNK_TOKENS - CHUNK_OVERLAP, 1)
    chunks = []
    for start in range(0, len(token_ids), step):
        window = token_ids[start : start + CHUNK_TOKENS]
        if not window:
            continue
        chunk = tokenizer.decode(window, skip_special_tokens=True).strip()
        if chunk:
            chunks.append(chunk)
    return chunks


def _load_pdf_chunks(docs_path: Path, model: Any) -> list[dict[str, Any]]:
    from pypdf import PdfReader

    chunks: list[dict[str, Any]] = []
    pdf_paths = sorted(
        path
        for path in docs_path.rglob("*.pdf")
        if INDEX_FOLDER_NAME not in path.relative_to(docs_path).parts
    )

    for pdf_path in pdf_paths:
        try:
            reader = PdfReader(str(pdf_path))
        except Exception as exc:
            print(f"[rag] Skipping {pdf_path.name}: {exc}")
            continue

        for page_number, page in enumerate(reader.pages, start=1):
            try:
                text = page.extract_text() or ""
            except Exception as exc:
                print(f"[rag] Could not read {pdf_path.name} page {page_number}: {exc}")
                continue

            for chunk_number, chunk in enumerate(_chunk_text(text, model), start=1):
                chunks.append(
                    {
                        "text": chunk,
                        "source": pdf_path.name,
                        "page": page_number,
                        "chunk": chunk_number,
                    }
                )

    return chunks


def _embed_texts(texts: list[str], model: Any) -> np.ndarray:
    embeddings = model.encode(
        texts,
        batch_size=32,
        show_progress_bar=False,
        convert_to_numpy=True,
        normalize_embeddings=True,
    )
    return np.asarray(embeddings, dtype="float32")


def build_vector_store(docs_folder: str | Path = "rag_docs") -> dict[str, Any] | None:
    # Load PDFs, chunk, embed, store in FAISS. Save index to rag_docs/faiss_index/.
    global _VECTOR_STORE

    docs_path = _resolve_docs_folder(docs_folder)
    if not docs_path.exists() or not docs_path.is_dir():
        print(f"[rag] Docs folder not found: {docs_path}")
        _VECTOR_STORE = None
        return None

    pdfs = list(docs_path.rglob("*.pdf"))
    if not pdfs:
        print(f"[rag] No PDFs found in {docs_path}")
        _VECTOR_STORE = None
        return None

    try:
        import faiss

        model = _get_embedding_model()
        chunks = _load_pdf_chunks(docs_path, model)
        if not chunks:
            print(f"[rag] No text chunks extracted from PDFs in {docs_path}")
            _VECTOR_STORE = None
            return None

        embeddings = _embed_texts([chunk["text"] for chunk in chunks], model)
        index = faiss.IndexFlatIP(embeddings.shape[1])
        index.add(embeddings)

        index_file, chunks_file = _index_paths(docs_path)
        index_file.parent.mkdir(parents=True, exist_ok=True)
        faiss.write_index(index, str(index_file))
        chunks_file.write_text(json.dumps(chunks, ensure_ascii=False, indent=2), encoding="utf-8")

        _VECTOR_STORE = {"index": index, "chunks": chunks, "model": model, "docs_path": docs_path}
        return _VECTOR_STORE
    except Exception as exc:
        print(f"[rag] Could not build vector store: {exc}")
        _VECTOR_STORE = None
        return None


def load_vector_store() -> dict[str, Any] | None:
    # Load existing FAISS index. Build it on first run if no cached index exists.
    global _VECTOR_STORE

    if _VECTOR_STORE is not None:
        return _VECTOR_STORE

    docs_path = _resolve_docs_folder("rag_docs")
    if not docs_path.exists() or not docs_path.is_dir():
        print(f"[rag] Docs folder not found: {docs_path}")
        return None

    index_file, chunks_file = _index_paths(docs_path)
    if not index_file.exists() or not chunks_file.exists():
        return build_vector_store(docs_path)

    try:
        import faiss

        index = faiss.read_index(str(index_file))
        chunks = json.loads(chunks_file.read_text(encoding="utf-8"))
        model = _get_embedding_model()
        _VECTOR_STORE = {"index": index, "chunks": chunks, "model": model, "docs_path": docs_path}
        return _VECTOR_STORE
    except Exception as exc:
        print(f"[rag] Could not load cached vector store: {exc}")
        return build_vector_store(docs_path)


def retrieve_context(query: str, k: int = 3) -> str:
    # Return top k relevant chunks as string.
    if not query.strip():
        return ""

    store = load_vector_store()
    if store is None:
        return ""

    try:
        query_embedding = _embed_texts([query], store["model"])
        scores, indices = store["index"].search(query_embedding, k)
    except Exception as exc:
        print(f"[rag] Could not retrieve context: {exc}")
        return ""

    selected = []
    chunks = store["chunks"]
    for score, index in zip(scores[0], indices[0]):
        if index < 0 or index >= len(chunks):
            continue
        chunk = chunks[index]
        selected.append(
            "[{source}, page {page}, score {score:.3f}]\n{text}".format(
                source=chunk.get("source", "unknown"),
                page=chunk.get("page", "?"),
                score=float(score),
                text=chunk.get("text", ""),
            )
        )

    return "\n\n---\n\n".join(selected)
