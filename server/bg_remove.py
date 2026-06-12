import sys
from rembg import remove
from PIL import Image
import os

def remove_bg(input_path, output_path):
    try:
        input_image = Image.open(input_path)
        output_image = remove(input_image)
        output_image.save(output_path)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python bg_remove.py <input_image_path> <output_image_path>")
        sys.exit(1)
        
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    
    if not os.path.exists(input_path):
        print(f"Input file does not exist: {input_path}")
        sys.exit(1)
        
    remove_bg(input_path, output_path)
