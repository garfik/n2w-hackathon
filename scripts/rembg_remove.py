#!/usr/bin/env python3
"""
Remove background from an image using rembg.
Usage: python rembg_remove.py <input_path> <output_path>
Reads image from input_path, writes PNG with transparent background to output_path.
Requires: pip install rembg pillow
"""

import io
import sys
from pathlib import Path


def main() -> None:
    if len(sys.argv) != 3:
        print("Usage: rembg_remove.py <input_path> <output_path>", file=sys.stderr)
        sys.exit(1)
    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])
    if not input_path.is_file():
        print(f"Input file not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    from rembg import remove
    from PIL import Image

    with open(input_path, "rb") as f:
        input_data = f.read()
    output_data = remove(input_data)
    img = Image.open(io.BytesIO(output_data))
    img.save(output_path, "PNG")


if __name__ == "__main__":
    main()
