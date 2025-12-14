#!/usr/bin/env python3
"""
Generate QR codes for EMBO Conference Poster
Creates two QR codes:
1. Network access to StickForStats app
2. Portfolio website
"""

import qrcode
from pathlib import Path

def generate_qr_code(url, filename, size=10):
    """
    Generate a QR code for the given URL

    Args:
        url: URL to encode
        filename: Output filename (without extension)
        size: QR code box size (default: 10)
    """
    # Create QR code instance
    qr = qrcode.QRCode(
        version=1,  # Controls the size (1 is smallest)
        error_correction=qrcode.constants.ERROR_CORRECT_H,  # High error correction
        box_size=size,
        border=4,
    )

    # Add data
    qr.add_data(url)
    qr.make(fit=True)

    # Create image
    img = qr.make_image(fill_color="black", back_color="white")

    # Save
    output_path = Path(filename)
    img.save(output_path)
    print(f"✅ Generated: {output_path}")
    print(f"   URL: {url}")
    print(f"   Size: {img.size[0]}x{img.size[1]} pixels")
    print()

def main():
    """Generate both QR codes"""

    print("=" * 60)
    print("  EMBO Conference QR Code Generator")
    print("=" * 60)
    print()

    # QR Code 1: Network access to app
    print("📱 QR Code 1: StickForStats Demo App")
    generate_qr_code(
        url="http://192.168.8.101:3001",
        filename="qr_code_app_network.png",
        size=10
    )

    # QR Code 2: Portfolio website
    print("🌐 QR Code 2: Portfolio Website")
    generate_qr_code(
        url="https://visvikbharti.github.io/pages/projects.html",
        filename="qr_code_portfolio.png",
        size=10
    )

    print("=" * 60)
    print("✅ BOTH QR CODES GENERATED SUCCESSFULLY")
    print("=" * 60)
    print()
    print("📋 FILES CREATED:")
    print("   • qr_code_app_network.png  (StickForStats app)")
    print("   • qr_code_portfolio.png    (Portfolio website)")
    print()
    print("📐 SIZE: ~400x400 pixels each (print at 2-3 inches)")
    print()
    print("🖨️  FOR POSTER:")
    print("   1. Insert both images into poster")
    print("   2. Add labels:")
    print("      - 'Try the Demo!' (app QR code)")
    print("      - 'Learn More' (portfolio QR code)")
    print("   3. Print at high resolution (300 DPI)")
    print()

if __name__ == "__main__":
    main()
