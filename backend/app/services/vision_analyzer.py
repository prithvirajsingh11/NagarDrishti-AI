from abc import ABC, abstractmethod
from app.schemas.ai import CivicDetectionResult

class VisionAnalyzer(ABC):
    """
    Abstract VisionAnalyzer interface.
    Decouples the application and endpoints from any specific AI provider (Gemini, Local model, etc.)
    """

    @abstractmethod
    async def analyze(self, image_bytes: bytes, mime_type: str = "image/jpeg") -> CivicDetectionResult:
        """
        Analyze civic photograph and return structured CivicDetectionResult.
        
        Args:
            image_bytes: Raw bytes of the image
            mime_type: MIME type of the image (image/jpeg, image/png, image/webp)
            
        Returns:
            CivicDetectionResult structured analysis
        """
        pass
