import base64
import io
import numpy as np
from PIL import Image


def encode_frame(rgb_array: np.ndarray, quality: int = 60, max_width: int = 400) -> str:
    """Encode an RGB numpy array as a base64 JPEG data URL."""
    img = Image.fromarray(rgb_array.astype(np.uint8))

    # Resize if wider than max_width to save bandwidth
    if img.width > max_width:
        ratio = max_width / img.width
        new_height = int(img.height * ratio)
        img = img.resize((max_width, new_height), Image.LANCZOS)

    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=quality)
    b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/jpeg;base64,{b64}"
