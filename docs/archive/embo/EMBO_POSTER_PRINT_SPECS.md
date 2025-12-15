# EMBO Conference Poster - Print Specifications
## 4 feet × 3 feet Landscape Format

---

## 📐 EXACT DIMENSIONS

### Imperial (Primary):
- **Width**: 4 feet (48 inches)
- **Height**: 3 feet (36 inches)
- **Aspect Ratio**: 4:3 (landscape)

### Metric Conversion:
- **Width**: 1219.2 mm
- **Height**: 914.4 mm

### Digital Resolution (for printing):
- **300 DPI**: 14,400 × 10,800 pixels
- **150 DPI**: 7,200 × 5,400 pixels (minimum acceptable)
- **File Size**: ~100-200 MB (high quality PDF)

---

## 🎨 POSTER LAYOUT STRUCTURE

The poster uses a **3-column grid** optimized for landscape viewing:

```
┌────────────────────────────────────────────────┐
│              HEADER (Full Width)                │  ← 120px height
├────────────┬──────────────────┬────────────────┤
│            │                  │                 │
│   LEFT     │     CENTER       │     RIGHT       │
│  PROBLEM   │    SOLUTION      │    SUCCESS      │  ← Main content
│   (Red)    │   (Gradient)     │    (Green)      │
│            │                  │                 │
├────────────┴──────────────────┴────────────────┤
│              FOOTER (Full Width)                │  ← 100px height
└────────────────────────────────────────────────┘

Column Widths: 25% | 40% | 25% | = 100%
```

---

## 🖨️ PRINTING GUIDELINES

### File Preparation:
1. **Export Format**: PDF/X-1a or PDF/X-4
2. **Color Mode**: CMYK (not RGB)
3. **Bleed**: Add 0.125" (3mm) on all sides
4. **Safe Zone**: Keep critical text 0.5" from edges
5. **Font Embedding**: Embed all fonts in PDF

### Recommended Print Settings:
- **Material**: Matte vinyl or fabric (for portability)
- **Weight**: 13-15 oz blockout material
- **Finish**: Matte (reduces glare under conference lights)
- **Mounting**: Foam core backing or roll-up stand

### Color Specifications:
```
Primary Colors (CMYK values):
- Red (Problems): C:0 M:80 Y:70 K:10
- Purple (Solution): C:50 M:70 Y:0 K:0
- Green (Success): C:60 M:0 Y:100 K:10
- Dark Grey (Footer): C:60 M:50 Y:40 K:80
```

---

## 📏 CONTENT SIZE GUIDELINES

### Minimum Readable Sizes (from 3-6 feet viewing distance):

| Element | Minimum Size | Recommended Size |
|---------|--------------|------------------|
| Main Title | 48pt | 60-72pt |
| Section Headers | 28pt | 32-36pt |
| Subheadings | 20pt | 24pt |
| Body Text | 14pt | 16-18pt |
| Captions | 12pt | 14pt |

### Visual Elements:
- **QR Code**: Minimum 4" × 4" (10cm × 10cm)
- **Charts/Graphs**: Minimum 6" width
- **Icons**: Minimum 1.5" (4cm)
- **Line thickness**: Minimum 2pt

---

## 🎯 THREE-ZONE VISUAL FLOW

The landscape format creates natural reading zones:

### Zone 1: LEFT (Problem/Hook)
- **Purpose**: Grab attention with shocking statistics
- **Color**: Red tones signal problems
- **Content**: 5-6 key failure examples
- **Reading time**: 30 seconds

### Zone 2: CENTER (Solution/Demo)
- **Purpose**: Present StickForStats as solution
- **Color**: Purple/gradient for innovation
- **Content**: 4 interactive modules + QR code
- **Reading time**: 45 seconds

### Zone 3: RIGHT (Success/Proof)
- **Purpose**: Show positive outcomes
- **Color**: Green tones signal success
- **Content**: Success metrics + testimonials
- **Reading time**: 30 seconds

---

## 💾 FILE EXPORT CHECKLIST

### From HTML to Print:

1. **Screenshot/Export HTML**:
   ```bash
   # Using Chrome headless
   google-chrome --headless --disable-gpu \
     --window-size=14400,10800 \
     --screenshot=poster.png \
     embo_poster_4x3_feet.html
   ```

2. **Convert to PDF** (using design software):
   - Import HTML screenshot
   - Set document to 48" × 36"
   - Convert RGB to CMYK
   - Add 0.125" bleed
   - Export as PDF/X-1a

3. **Professional Software Options**:
   - Adobe Illustrator (recommended)
   - Adobe InDesign
   - Affinity Designer
   - Canva Pro (has 4×3 ft poster template)

---

## 🔍 QUALITY CHECK BEFORE PRINTING

### Content Review:
- [ ] All text is spell-checked
- [ ] Statistics are accurate and cited
- [ ] QR code is tested and working
- [ ] Contact information is current
- [ ] Institution logos are high-res

### Technical Review:
- [ ] Resolution ≥ 150 DPI
- [ ] All fonts embedded
- [ ] Colors in CMYK
- [ ] File size < 250MB
- [ ] Bleed area added

### Visual Review:
- [ ] Text readable from 6 feet
- [ ] Good contrast ratios
- [ ] No pixelated images
- [ ] Consistent alignment
- [ ] Clear visual hierarchy

---

## 📦 TRANSPORT & DISPLAY

### For 4×3 feet poster:

**Option 1: Rolled Transport**
- Use 4" diameter mailing tube
- Roll with printed side OUT
- Secure with rubber bands (not tape)
- Unroll 2 hours before display

**Option 2: Folded (if laminated)**
- Fold into thirds (16" sections)
- Place in portfolio case
- Use poster tabs for hanging

**Display Options**:
- Foam board mounting (most professional)
- Poster stand (X-frame or tripod)
- Wall mounting with poster strips
- Tabletop easel (for smaller venues)

---

## 🏪 RECOMMENDED PRINT VENDORS

### Online Services:
1. **PosterPresentations.com**
   - Academic discount available
   - 48×36" fabric: ~$85
   - 2-day shipping

2. **MakeSigns.com**
   - 48×36" vinyl: ~$65
   - Next-day available

3. **FedEx Office**
   - Local printing
   - 48×36" paper: ~$50
   - Same-day possible

### Local Options (India):
1. **Printo**
   - Multiple locations
   - Flex printing available

2. **Local flex printing shops**
   - Most economical (~₹2000-3000)
   - Ask for "conference poster printing"

---

## 🎨 ALTERNATIVE DESIGN TOOLS

If you need to modify the design:

### Free Options:
- **Canva** (has scientific poster templates)
- **Google Slides** (set custom size: 48×36 inches)
- **PowerPoint** (Design → Slide Size → Custom)

### Template Settings:
```
PowerPoint/Google Slides:
- Width: 48 inches
- Height: 36 inches
- Orientation: Landscape
- Export: PDF (High Quality)
```

---

## ✅ FINAL PREPARATION TIMELINE

### 1 Week Before:
- Finalize content
- Test QR codes
- Get supervisor approval

### 3 Days Before:
- Send to print shop
- Request proof/preview

### 1 Day Before:
- Pick up poster
- Practice setup
- Prepare handouts

### Day Of:
- Arrive early to setup
- Test QR code at venue
- Have backup on USB

---

## 🚨 EMERGENCY BACKUP PLAN

Always have:
1. **Digital backup** on phone/laptop
2. **PDF on USB drive**
3. **A0 size version** (standard backup)
4. **Handout version** (8.5×11" summary)
5. **Cloud link** for instant access

---

## 📱 QR CODE SPECIFICATIONS

For the demo QR code:
- **Size**: 4×4 inches minimum
- **Error Correction**: Level H (30%)
- **Quiet Zone**: 0.5 inch border
- **Testing**: Scan from 3 feet away
- **URL**: Short link to http://192.168.40.86:3001

Generate at: https://www.qr-code-generator.com/
- Select "URL"
- Enter your link
- Choose highest error correction
- Download as SVG (scalable)

---

**Remember**: The 4×3 feet landscape format is perfect for conference settings where viewers approach from the front. The wide format allows multiple people to view simultaneously without crowding!

Good luck with your presentation! 🚀