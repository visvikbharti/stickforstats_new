#!/usr/bin/env python3
"""
Generate QR codes for EMBO poster
High-resolution QR codes suitable for A0 poster printing (300 DPI)
"""

import qrcode
from PIL import Image, ImageDraw, ImageFont
import os

# URLs for QR codes
URLS = {
    'main_demo': 'http://192.168.40.86:3001',
    'localhost': 'http://localhost:3001',
    'statistical_hub': 'http://192.168.40.86:3001/statistical-analysis',
    'education_hub': 'http://192.168.40.86:3001/education',
    'pca_module': 'http://192.168.40.86:3001/education/pca',
    'ci_module': 'http://192.168.40.86:3001/education/confidence-intervals',
}

def generate_qr_code(url, filename, size=1000, border=4, add_label=True, label_text=""):
    """
    Generate high-resolution QR code suitable for poster printing

    Args:
        url: URL to encode
        filename: Output filename
        size: QR code size in pixels (default 1000 for A0 printing)
        border: White border size (default 4)
        add_label: Whether to add text label below QR code
        label_text: Text to display below QR code
    """
    # Create QR code
    qr = qrcode.QRCode(
        version=None,  # Auto-detect size
        error_correction=qrcode.constants.ERROR_CORRECT_H,  # High error correction
        box_size=20,  # Size of each box in pixels
        border=border,
    )

    qr.add_data(url)
    qr.make(fit=True)

    # Create image
    img = qr.make_image(fill_color="black", back_color="white")

    # Resize to target size
    img = img.resize((size, size), Image.LANCZOS)

    if add_label and label_text:
        # Add label below QR code
        label_height = 100
        new_img = Image.new('RGB', (size, size + label_height), 'white')
        new_img.paste(img, (0, 0))

        # Draw text
        draw = ImageDraw.Draw(new_img)

        # Try to use a nice font, fall back to default if not available
        try:
            font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 40)
        except:
            try:
                font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 40)
            except:
                font = ImageFont.load_default()

        # Center the text
        text_bbox = draw.textbbox((0, 0), label_text, font=font)
        text_width = text_bbox[2] - text_bbox[0]
        text_x = (size - text_width) // 2
        text_y = size + 20

        draw.text((text_x, text_y), label_text, fill='black', font=font)

        img = new_img

    # Save with high quality
    img.save(filename, 'PNG', dpi=(300, 300), quality=100)
    print(f"✓ Generated: {filename} ({size}x{size if not add_label else size + 100}px, 300 DPI)")
    print(f"  URL: {url}")
    print()

def main():
    """Generate all QR codes for the poster"""

    # Create output directory
    output_dir = "qr_codes_embo"
    os.makedirs(output_dir, exist_ok=True)

    print("=" * 70)
    print("GENERATING QR CODES FOR EMBO POSTER")
    print("=" * 70)
    print()

    # Main demo QR code (large, for prominent display)
    generate_qr_code(
        URLS['main_demo'],
        f"{output_dir}/qr_main_demo_large.png",
        size=1500,
        add_label=True,
        label_text="Scan to Try Guardian"
    )

    # Main demo QR code (medium, for compact display)
    generate_qr_code(
        URLS['main_demo'],
        f"{output_dir}/qr_main_demo_medium.png",
        size=1000,
        add_label=True,
        label_text="Try StickForStats Guardian"
    )

    # Statistical Analysis Hub
    generate_qr_code(
        URLS['statistical_hub'],
        f"{output_dir}/qr_statistical_hub.png",
        size=800,
        add_label=True,
        label_text="Statistical Analysis Hub"
    )

    # Education Hub
    generate_qr_code(
        URLS['education_hub'],
        f"{output_dir}/qr_education_hub.png",
        size=800,
        add_label=True,
        label_text="32 Interactive Lessons"
    )

    # PCA Module
    generate_qr_code(
        URLS['pca_module'],
        f"{output_dir}/qr_pca_module.png",
        size=600,
        add_label=True,
        label_text="PCA Lessons"
    )

    # CI Module
    generate_qr_code(
        URLS['ci_module'],
        f"{output_dir}/qr_ci_module.png",
        size=600,
        add_label=True,
        label_text="Confidence Intervals"
    )

    # Plain QR codes (no labels, for flexibility in design)
    print("Generating plain QR codes (no labels)...")
    generate_qr_code(
        URLS['main_demo'],
        f"{output_dir}/qr_main_demo_plain.png",
        size=1200,
        add_label=False
    )

    print("=" * 70)
    print("✓ ALL QR CODES GENERATED SUCCESSFULLY")
    print("=" * 70)
    print()
    print(f"QR codes saved in: {output_dir}/")
    print()
    print("RECOMMENDATIONS FOR POSTER:")
    print("  • Use qr_main_demo_large.png for main Call-to-Action box")
    print("  • Use qr_main_demo_plain.png if adding custom styling in Inkscape")
    print("  • All QR codes are 300 DPI, suitable for A0 poster printing")
    print("  • Test QR codes by scanning before printing!")
    print()
    print("IMPORTANT: Update URLs before printing if using different network!")
    print()

if __name__ == "__main__":
    # Check if qrcode is installed
    try:
        import qrcode
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        print("ERROR: Required packages not installed")
        print()
        print("Please install with:")
        print("  pip install qrcode[pil] pillow")
        print()
        exit(1)

    main()
