# OPTION 2: VISUAL CARDS - INKSCAPE IMPLEMENTATION GUIDE
## Complete Step-by-Step Instructions for Creating the 3×3 Card Layout

---

## 🎯 **WHAT YOU'RE BUILDING**

A stunning **3×3 grid of cards** showcasing statistical failures (8 red cards) with Guardian as the solution (1 green card). Each card has:
- Eye-catching icon/emoji
- Bold case name
- Large number (impact metric)
- Brief description
- Colored badge

**Visual impact: 10/10 | Memorability: 10/10 | EMBO-ready: ✅**

---

## 📏 **UPDATED POSTER LAYOUT**

### **Original Box (from POSTER_VISUAL_LAYOUT_GUIDE.md):**
- Position: X: 290mm, Y: 720mm
- Size: Width: 245mm, Height: 350mm

### **NEW Box for Option 2 Cards:**
- Position: X: 280mm, Y: 720mm (10mm left shift)
- Size: Width: **280mm**, Height: **400mm**
- This gives you space for the 3×3 grid plus margins

**Adjustment needed:** Expand the "Retracted Papers" box width from 245mm → 280mm

---

## 🎨 **COMPLETE CARD GRID SPECIFICATIONS**

### **Overall Grid:**
```
Box: 280mm wide × 400mm tall
Margins: 15mm all sides
Usable area: 250mm × 370mm

Grid: 3 columns × 3 rows
Card size: 75mm × 110mm (each)
Gap between cards: 12mm horizontal, 15mm vertical
```

### **Precise Card Positions (from top-left of box):**

| Card | Column | Row | X Position | Y Position |
|------|--------|-----|------------|------------|
| Wansink | 1 | 1 | 15mm | 15mm |
| Stapel | 2 | 1 | 102mm | 15mm |
| Psychology | 3 | 1 | 189mm | 15mm |
| Duke | 1 | 2 | 15mm | 140mm |
| Wakefield | 2 | 2 | 102mm | 140mm |
| Anversa | 3 | 2 | 189mm | 140mm |
| STAP | 1 | 3 | 15mm | 265mm |
| Reinhart | 2 | 3 | 102mm | 265mm |
| Guardian | 3 | 3 | 189mm | 265mm |

---

## 🛠️ **INKSCAPE STEP-BY-STEP IMPLEMENTATION**

### **PHASE 1: Set Up the Main Box**

1. **Create the container box:**
   ```
   Tool: Rectangle (R)
   Position: X: 280mm, Y: 720mm
   Size: W: 280mm, H: 400mm
   Fill: #F5F5F5 (light gray)
   Stroke: 4pt, #D32F2F (red)
   Corner radius: 8px
   ```

2. **Add the section title:**
   ```
   Tool: Text (T)
   Text: "STATISTICAL FAILURES THAT SHOOK SCIENCE"
   Position: Centered at top, Y: 735mm
   Font: Helvetica Neue Bold
   Size: 36pt
   Color: #1976D2 (blue)
   ```

3. **Add title underline:**
   ```
   Tool: Line
   Position: Y: 755mm
   Width: 250mm (centered)
   Stroke: 3pt, #1976D2 (blue)
   ```

---

### **PHASE 2: Create the Card Template**

**Create ONE card first, then duplicate and modify:**

#### **Card 1: Wansink (Template)**

**Step 2.1 - Card Background:**
```
Tool: Rectangle (R)
Position: X: 295mm (15mm from box left), Y: 780mm (15mm from title)
Size: W: 75mm, H: 110mm
Fill: #FFEBEE (light red)
Stroke: 3pt, #D32F2F (red)
Corner radius: 5px
```

**Step 2.2 - Icon:**
```
Tool: Text (T)
Text: 🔴 (or type "Red Circle" emoji)
Position: Centered horizontally, Y: 785mm
Font: 40pt
```

**Step 2.3 - Card Title:**
```
Tool: Text (T)
Text: "WANSINK"
Position: Centered, Y: 805mm
Font: Helvetica Neue Bold
Size: 20pt
Color: #212121 (black)
Align: Center
```

**Step 2.4 - Big Number:**
```
Tool: Text (T)
Text: "17"
Position: Centered, Y: 825mm
Font: Helvetica Neue Bold
Size: 42pt
Color: #D32F2F (red)
Align: Center
```

**Step 2.5 - Subtitle:**
```
Tool: Text (T)
Text: "Papers Retracted"
Position: Centered, Y: 850mm
Font: Helvetica Neue Semibold
Size: 16pt
Color: #424242 (dark gray)
Align: Center
```

**Step 2.6 - Description:**
```
Tool: Text (T)
Text: "P-hacking via emails"
Position: Centered, Y: 865mm
Font: Helvetica Neue Regular
Size: 14pt
Color: #616161 (gray)
Align: Center
```

**Step 2.7 - Badge:**
```
Tool: Rounded Rectangle
Position: Centered, Y: 875mm
Size: W: 50mm, H: 8mm
Fill: #D32F2F (red)
Corner radius: 4mm

Tool: Text (T) - inside badge
Text: "Cornell"
Font: Helvetica Neue Bold
Size: 12pt
Color: #FFFFFF (white)
Align: Center
```

---

### **PHASE 3: Duplicate and Customize Cards**

**Now that you have the Wansink card template:**

1. **Select the entire card** (all elements: background, icon, texts, badge)
2. **Group them:** Object → Group (or Ctrl+G)
3. **Duplicate:** Edit → Duplicate (or Ctrl+D)
4. **Move to position** (use positions from the table above)
5. **Ungroup:** Object → Ungroup (or Ctrl+Shift+G)
6. **Edit text** for each card (see content below)

---

## 📝 **CONTENT FOR EACH CARD**

### **Card 1: WANSINK**
```
Icon: 🔴
Title: WANSINK
Number: 17
Subtitle: Papers Retracted
Description: P-hacking via emails
Badge: Cornell
Badge Color: #D32F2F (red)
Card BG: #FFEBEE (light red)
Card Border: #D32F2F (red)
```

### **Card 2: STAPEL**
```
Icon: 🔴
Title: STAPEL
Number: 58
Subtitle: Papers Retracted
Description: Fabricated data
             p = 0.049
Badge: Psychology
Badge Color: #D32F2F (red)
Card BG: #FFEBEE (light red)
Card Border: #D32F2F (red)
```

### **Card 3: PSYCHOLOGY**
```
Icon: 🔴
Title: PSYCHOLOGY
Number: 64%
Subtitle: Failed to Replicate
Description: Underpowered studies
Badge: Systemic Crisis
Badge Color: #D32F2F (red)
Card BG: #FFEBEE (light red)
Card Border: #D32F2F (red)
```

### **Card 4: DUKE GENOMICS**
```
Icon: 🏥
Title: DUKE GENOMICS
Number: 3
Subtitle: Trials Terminated
Description: Invalid models
             Patients at risk
Badge: NIH Shutdown
Badge Color: #D32F2F (red)
Card BG: #FFEBEE (light red)
Card Border: #D32F2F (red)
```

### **Card 5: WAKEFIELD MMR**
```
Icon: 💉
Title: WAKEFIELD MMR
Number: n=12
Subtitle: No Control Group
Description: Vaccine panic
             Measles outbreak
Badge: Lancet
Badge Color: #D32F2F (red)
Card BG: #FFEBEE (light red)
Card Border: #D32F2F (red)
```

### **Card 6: ANVERSA**
```
Icon: 🫀
Title: ANVERSA
Number: 31
Subtitle: Papers Retracted
Description: $10M NIH wasted
             100+ trials affected
Badge: Harvard
Badge Color: #D32F2F (red)
Card BG: #FFEBEE (light red)
Card Border: #D32F2F (red)
```

### **Card 7: STAP CELLS**
```
Icon: 🧬
Title: STAP CELLS
Number: 2014
Subtitle: Nature Retraction
Description: Impossible statistics
             Field disrupted
Badge: Tragedy
Badge Color: #D32F2F (red)
Card BG: #FFEBEE (light red)
Card Border: #D32F2F (red)
```

### **Card 8: REINHART-ROGOFF**
```
Icon: 💰
Title: REINHART-ROGOFF
Number: Excel
Subtitle: Statistical Error
Description: Billions in
             austerity policies
Badge: Global Impact
Badge Color: #D32F2F (red)
Card BG: #FFEBEE (light red)
Card Border: #D32F2F (red)
```

### **Card 9: GUARDIAN ⭐ (THE SOLUTION)**
```
Icon: ✅
Title: GUARDIAN
Number: <200ms
Subtitle: Validation Time
Description: Prevents
             ALL of these
Badge: Solution
Badge Color: #388E3C (green)
Card BG: #E8F5E9 (light green)
Card Border: #388E3C (green)
Number Color: #388E3C (green) ← Different!
Description Color: #388E3C (green, bold) ← Different!
```

---

## 🎨 **COLOR PALETTE REFERENCE**

### **For Failure Cards (1-8):**
```
Background: #FFEBEE (light red/pink)
Border: #D32F2F (red), 3pt
Title: #212121 (black)
Number: #D32F2F (red)
Subtitle: #424242 (dark gray)
Description: #616161 (gray)
Badge BG: #D32F2F (red)
Badge Text: #FFFFFF (white)
```

### **For Guardian Card (9):**
```
Background: #E8F5E9 (light green)
Border: #388E3C (green), 3pt
Title: #212121 (black)
Number: #388E3C (green) ← Different!
Subtitle: #424242 (dark gray)
Description: #388E3C (green), bold ← Different!
Badge BG: #388E3C (green)
Badge Text: #FFFFFF (white)
```

---

## 🔤 **TYPOGRAPHY SPECIFICATIONS**

| Element | Font | Size | Weight | Color |
|---------|------|------|--------|-------|
| Section Title | Helvetica Neue | 36pt | Bold | #1976D2 |
| Card Icon | System Emoji | 40pt | - | Native |
| Card Title | Helvetica Neue | 20pt | Bold | #212121 |
| Card Number | Helvetica Neue | 42pt | Bold | #D32F2F (or #388E3C for Guardian) |
| Card Subtitle | Helvetica Neue | 16pt | Semibold | #424242 |
| Card Description | Helvetica Neue | 14pt | Regular | #616161 (or #388E3C for Guardian) |
| Badge Text | Helvetica Neue | 12pt | Bold | #FFFFFF |
| Footer Text | Helvetica Neue | 18pt | Semibold | #388E3C |

---

## 📐 **DETAILED MEASUREMENTS**

### **Card Dimensions:**
```
Width: 75mm
Height: 110mm
Corner radius: 5px
Border: 3pt
Padding: 5mm internal
```

### **Element Spacing (within each card):**
```
Icon: Top margin 5mm
Title: 5mm below icon
Number: 5mm below title
Subtitle: 10mm below number
Description: 5mm below subtitle
Badge: 5mm below description, centered
```

### **Grid Spacing:**
```
Horizontal gap between cards: 12mm
Vertical gap between cards: 15mm
Left/right margins: 15mm
Top margin (below title): 10mm
Bottom margin: 15mm
```

---

## ✅ **FOOTER BOX**

**Add below the 3×3 grid:**

```
Tool: Rectangle
Position: X: 295mm, Y: 1105mm (15mm below last row)
Size: W: 250mm, H: 50mm
Fill: #E8F5E9 (light green)
Stroke: 3pt, #388E3C (green)
Corner radius: 5px

Tool: Text (centered inside)
Line 1: "✓ Guardian's gold-standard validators catch p-hacking, underpowered studies,"
Line 2: "assumption violations, and impossible data patterns"
Font: Helvetica Neue Semibold
Size: 18pt
Color: #388E3C (green)
Align: Center
Line height: 1.5
```

---

## 🚀 **QUICK CREATION WORKFLOW**

### **Method 1: Create One, Duplicate All**

1. **Create Wansink card completely** (all 7 elements)
2. **Group all elements** (Ctrl+G)
3. **Duplicate 8 times** (Ctrl+D, Ctrl+D, Ctrl+D...)
4. **Arrange in 3×3 grid** using positions from table
5. **Ungroup each** (Ctrl+Shift+G)
6. **Edit text/colors** for each card using content above
7. **Special styling for Guardian card** (green colors)

### **Method 2: Template-Based**

1. **Create card background template** (75×110mm rectangle)
2. **Create text placeholders** (icon, title, number, etc.)
3. **Duplicate 9 times**
4. **Fill in content** for each
5. **Apply colors** (8 red, 1 green)

---

## 💡 **PRO TIPS FOR INKSCAPE**

### **Tip 1: Use Align & Distribute**
```
Select all cards in a row
Object → Align and Distribute
Align: Horizontal centers
Distribute: Horizontal gaps (12mm)
```

### **Tip 2: Clone Instead of Duplicate**
```
Create perfect Wansink card
Edit → Clone (Alt+D) instead of Duplicate
Changes to original affect all clones
Unlink when ready: Edit → Clone → Unlink Clone
```

### **Tip 3: Use Layers**
```
Layer 1: Card backgrounds
Layer 2: Icons
Layer 3: Text
Layer 4: Badges
Makes editing easier!
```

### **Tip 4: Emoji Icons**
If emojis don't show:
```
Option A: Use Unicode
  🔴 = U+1F534
  🏥 = U+1F3E5
  💉 = U+1F489
  🫀 = U+1FAC0
  🧬 = U+1F9EC
  💰 = U+1F4B0
  ✅ = U+2705

Option B: Use SVG icons from
  - Flaticon.com
  - Noun Project
  - Font Awesome

Option C: Create simple colored circles
  - Rectangle tool
  - Make circle
  - Fill with #D32F2F
```

### **Tip 5: Precise Positioning**
```
Press Ctrl while dragging to constrain movement
Use arrow keys for 1px adjustments
Use Shift+Arrow for 10px adjustments
View → Show → Grids (helps alignment)
```

---

## 📋 **CREATION CHECKLIST**

### **Setup:**
- [ ] Expand retraction box to 280mm width
- [ ] Set up guides for margins (15mm)
- [ ] Create 3×3 grid guides

### **Cards:**
- [ ] Create Wansink card (all elements)
- [ ] Duplicate and position 9 cards in grid
- [ ] Update text for each card
- [ ] Apply red colors to cards 1-8
- [ ] Apply green colors to card 9 (Guardian)
- [ ] Check alignment (all cards aligned properly)

### **Details:**
- [ ] Add section title "STATISTICAL FAILURES..."
- [ ] Add title underline
- [ ] Add footer box with green border
- [ ] Add footer text
- [ ] Check all fonts (sizes, weights correct)
- [ ] Check all colors (red/green/blue palette)

### **Polish:**
- [ ] Ensure consistent spacing (12mm horizontal, 15mm vertical)
- [ ] Verify all numbers bold and large (42pt)
- [ ] Check badges are centered and readable
- [ ] Test readability from 2 meters (zoom out 10%)
- [ ] Verify Guardian card stands out (green vs red)

### **Final:**
- [ ] Save SVG file
- [ ] Export as PDF (300 DPI)
- [ ] Create PNG backup (9933×14043 px for A0)
- [ ] Print test at A4 scale

---

## 🎯 **EXPECTED RESULT**

When finished, you'll have:

```
┌────────────────────────────────────────────────────────────┐
│      STATISTICAL FAILURES THAT SHOOK SCIENCE               │
│      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━        │
│                                                            │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                  │
│  │🔴       │  │🔴       │  │🔴       │                  │
│  │WANSINK  │  │STAPEL   │  │PSYCH    │                  │
│  │   17    │  │   58    │  │  64%    │  ← Row 1        │
│  │Papers   │  │Papers   │  │Failed   │                  │
│  │P-hack   │  │Fake data│  │Underp'd │                  │
│  │[Cornell]│  │[Psych]  │  │[Crisis] │                  │
│  └─────────┘  └─────────┘  └─────────┘                  │
│                                                            │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                  │
│  │🏥       │  │💉       │  │🫀       │                  │
│  │DUKE     │  │WAKEFIELD│  │ANVERSA  │                  │
│  │    3    │  │  n=12   │  │   31    │  ← Row 2        │
│  │Trials   │  │No ctrl  │  │Papers   │                  │
│  │Invalid  │  │Vaccine  │  │$10M     │                  │
│  │[NIH]    │  │[Lancet] │  │[Harvard]│                  │
│  └─────────┘  └─────────┘  └─────────┘                  │
│                                                            │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                  │
│  │🧬       │  │💰       │  │✅       │                  │
│  │STAP     │  │REINHART │  │GUARDIAN │                  │
│  │  2014   │  │  Excel  │  │ <200ms  │  ← Row 3        │
│  │Nature   │  │Stat err │  │Valid    │                  │
│  │Imposs   │  │Billions │  │PREVENTS │  ← GREEN!       │
│  │[Tragedy]│  │[Global] │  │[Solution]│                  │
│  └─────────┘  └─────────┘  └─────────┘                  │
│                                                            │
│  ┌────────────────────────────────────────────────────┐  │
│  │ ✓ Guardian's gold-standard validators catch       │  │
│  │   p-hacking, underpowered studies, assumption     │  │
│  │   violations, and impossible data patterns        │  │
│  └────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

---

## 📸 **VISUAL REFERENCE**

**Keep your browser open with:**
`retraction_layout_option2_cards.html`

**Use it as reference for:**
- Color placement
- Text alignment
- Badge styling
- Overall visual balance

**Match the HTML preview as closely as possible!**

---

## 🚨 **COMMON MISTAKES TO AVOID**

1. **❌ Inconsistent card sizes** → Use 75×110mm for ALL cards
2. **❌ Uneven spacing** → Use 12mm horizontal, 15mm vertical consistently
3. **❌ Wrong colors on Guardian card** → Must be GREEN, not red!
4. **❌ Small numbers** → Must be 42pt bold, highly visible
5. **❌ Misaligned badges** → Center horizontally in each card
6. **❌ Wrong emoji codes** → Test emojis render correctly in Inkscape
7. **❌ Inconsistent fonts** → Use Helvetica Neue throughout
8. **❌ Missing footer** → Don't forget the green footer box!

---

## ⏱️ **TIME ESTIMATE**

- **First card (Wansink):** 15-20 minutes (getting it perfect)
- **Duplicating & editing 8 more:** 30-40 minutes
- **Footer & title:** 10 minutes
- **Alignment & polish:** 15 minutes
- **Total:** ~90 minutes for perfection

**Speed it up:**
- Use cloning instead of recreating
- Copy-paste text content from this file
- Use alignment tools (don't drag manually)

---

## ✅ **FINAL QUALITY CHECK**

Before you're done, verify:

- [ ] All 9 cards are exactly 75×110mm
- [ ] Spacing is exactly 12mm (horizontal) and 15mm (vertical)
- [ ] Cards 1-8 have red theme (#D32F2F)
- [ ] Card 9 (Guardian) has green theme (#388E3C)
- [ ] All numbers are 42pt bold
- [ ] All badges are readable and centered
- [ ] Section title is blue (#1976D2)
- [ ] Footer box has green border and text
- [ ] Emojis/icons render correctly
- [ ] Zoom to 10% - does it look balanced?
- [ ] Zoom to 100% - is all text crisp?

---

## 🎉 **CONGRATULATIONS!**

Once complete, you'll have:

✅ **Visually stunning 3×3 grid** that catches eyes from across the room
✅ **Clear failure → solution narrative** (8 red disasters, 1 green guardian)
✅ **Scientifically bulletproof content** (every case verified)
✅ **EMBO-ready design** (professional, modern, memorable)
✅ **Conversation starter** (visitors will ask about specific cases)

**This will be one of the most impactful sections on your poster!** 🚀

---

**Ready to start? Open Inkscape and let's create this masterpiece!** 🎨

**Need help with any step? Just ask!** I can provide more detail on:
- Creating the first card
- Emoji/icon alternatives
- Color application
- Alignment techniques
- Export settings
