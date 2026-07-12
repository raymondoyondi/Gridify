"""Vector database service for storing and retrieving embeddings."""

from typing import List, Dict, Any, Optional
import json
from app.config import settings


class ChromaVectorStore:
    """Vector store using Chroma."""
    
    def __init__(self):
        """Initialize Chroma client."""
        try:
            import chromadb
            self.client = chromadb.HttpClient(
                host=settings.CHROMA_HOST,
                port=settings.CHROMA_PORT
            )
            self.collection = self.client.get_or_create_collection(
                name="gridify_embeddings",
                metadata={"hnsw:space": "cosine"}
            )
        except Exception as e:
            print(f"Warning: Could not initialize Chroma: {e}")
            self.client = None
            self.collection = None
    
    def add_documents(self, documents: List[Dict[str, Any]]):
        """Add documents with embeddings to Chroma."""
        if not self.collection:
            return
        
        for doc in documents:
            self.collection.add(
                ids=[doc.get("id", "")],
                documents=[doc.get("content", "")],
                metadatas=[doc.get("metadata", {})],
                embeddings=[doc.get("embedding", [])]
            )
    
    def query(self, query_text: str, top_k: int = 5) -> List[Dict]:
        """Query similar documents."""
        if not self.collection:
            return []
        
        results = self.collection.query(
            query_texts=[query_text],
            n_results=top_k
        )
        return results
    
    def delete_document(self, doc_id: str):
        """Delete a document."""
        if self.collection:
            self.collection.delete(ids=[doc_id])


class QdrantVectorStore:
    """Vector store using Qdrant."""
    
    def __init__(self):
        """Initialize Qdrant client."""
        try:
            from qdrant_client import QdrantClient
            self.client = QdrantClient(
                url=settings.QDRANT_URL or "http://localhost:6333"
            )
            self.collection_name = "gridify_embeddings"
        except Exception as e:
            print(f"Warning: Could not initialize Qdrant: {e}")
            self.client = None
    
    def create_collection(self, vector_size: int = 1536):
        """Create a new collection."""
        if not self.client:
            return
        
        try:
            from qdrant_client.models import Distance, VectorParams
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE)
            )
        except Exception:
            pass  # Collection might already exist
    
    def add_points(self, points: List[Dict[str, Any]]):
        """Add points to Qdrant."""
        if not self.client:
            return
        
        from qdrant_client.models import PointStruct
        
        qdrant_points = [
            PointStruct(
                id=point.get("id"),
                vector=point.get("embedding", []),
                payload=point.get("metadata", {})
            )
            for point in points
        ]
        
        self.client.upsert(
            collection_name=self.collection_name,
            points=qdrant_points
        )
    
    def search(self, query_vector: List[float], top_k: int = 5) -> List[Dict]:
        """Search for similar vectors."""
        if not self.client:
            return []
        
        results = self.client.search(
            collection_name=self.collection_name,
            query_vector=query_vector,
            limit=top_k
        )
        return results


class VectorDBService:
    """Unified vector database service supporting multiple backends."""
    
    def __init__(self, provider: str = "chroma"):
        """Initialize vector DB service."""
        self.provider = provider
        
        if provider == "qdrant":
            self.store = QdrantVectorStore()
        else:
            self.store = ChromaVectorStore()
    
    def store_embedding(self, doc_id: str, text: str, 
                       embedding: List[float], metadata: Dict = None):
        """Store a document with its embedding."""
        doc = {
            "id": doc_id,
            "content": text,
            "embedding": embedding,
            "metadata": metadata or {}
        }
        
        if isinstance(self.store, ChromaVectorStore):
            self.store.add_documents([doc])
        elif isinstance(self.store, QdrantVectorStore):
            self.store.add_points([doc])
    
    def search_similar(self, query: str, top_k: int = 5) -> List[Dict]:
        """Search for similar documents."""
        # In production, would use actual embedding model
        if isinstance(self.store, ChromaVectorStore):
            return self.store.query(query, top_k)
        elif isinstance(self.store, QdrantVectorStore):
            # Would need to embed the query first
            query_embedding = self._embed_text(query)
            return self.store.search(query_embedding, top_k)
        return []
    
    def _embed_text(self, text: str) -> List[float]:
        """Generate embedding for text."""
        # Placeholder - would use actual embedding model
        import hashlib
        hash_val = int(hashlib.md5(text.encode()).hexdigest(), 16)
        return [float(hash_val % 1000) / 1000 for _ in range(1536)]


def get_vector_db_service(provider: str = "chroma") -> VectorDBService:
    """Get vector database service instance."""
    return VectorDBService(provider)
