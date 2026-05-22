from typing import Any

import faiss
import numpy as np


class FAISSStore:
    """
    In-memory FAISS index for nearest-neighbor retrieval of activity logs.

    Uses IndexFlatIP (inner product) which equals cosine similarity when
    embeddings are L2-normalised — the embedding service always normalises.
    """

    def __init__(self, dimension: int) -> None:
        self.dimension = dimension
        self.index = faiss.IndexFlatIP(dimension)
        self._logs: list[dict[str, Any]] = []

    def add_logs(self, logs: list[dict[str, Any]], embeddings: np.ndarray) -> None:
        if not logs:
            return
        self.index.add(embeddings)
        self._logs.extend(logs)

    def search(self, query_embedding: np.ndarray, k: int) -> list[dict[str, Any]]:
        if self.index.ntotal == 0:
            return []

        k = min(k, self.index.ntotal)
        query = query_embedding.reshape(1, -1)
        _, indices = self.index.search(query, k)

        return [self._logs[i] for i in indices[0] if i >= 0]

    @property
    def total(self) -> int:
        return self.index.ntotal
