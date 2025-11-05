# BlockFinaX Design Tokens

## 🎨 Color Palette

### Primary Colors
```
Indigo Blue:     #4F46E5  ███████  (Main brand color)
Vibrant Purple:  #7C3AED  ███████  (Accent color)
Success Green:   #10B981  ███████  (Positive actions)
Warning Yellow:  #F59E0B  ███████  (Alerts)
Error Red:       #EF4444  ███████  (Errors)
```

### Neutral Colors
```
Dark:           #1F2937  ███████  (Headings, primary text)
Mid:            #6B7280  ███████  (Body text)
Light:          #9CA3AF  ███████  (Disabled, placeholders)
Lighter:        #D1D5DB  ███████  (Borders)
Lightest:       #F3F4F6  ███████  (Backgrounds)
White:          #FFFFFF  ███████  (Cards, surfaces)
```

### Gradient Combinations
```
Hero:           #4F46E5 → #7C3AED  (Primary gradients)
Success:        #10B981 → #059669  (Positive states)
Warning:        #F59E0B → #D97706  (Alert states)
Teal:           #14B8A6 → #0891B2  (Alternative accent)
Purple:         #7C3AED → #6366F1  (Alternative primary)
```

---

## 📏 Spacing Scale

```
xs:    4px   ▪
sm:    8px   ▪▪
md:    16px  ▪▪▪▪
lg:    24px  ▪▪▪▪▪▪
xl:    32px  ▪▪▪▪▪▪▪▪
xxl:   48px  ▪▪▪▪▪▪▪▪▪▪▪▪
```

---

## 🔤 Typography Scale

### Font Sizes
```
Display:   32px  📝  Large headlines
Title:     24px  📝  Section titles
Subtitle:  18px  📝  Card headers
Body:      16px  📝  Main content
Small:     14px  📝  Secondary text
Tiny:      12px  📝  Captions
```

### Font Weights
```
Regular:   400  Normal text
Medium:    500  Subtle emphasis
Semibold:  600  Headings
Bold:      700  Strong emphasis
ExtraBold: 800  Display text
```

### Line Heights
```
Display:   40px  (1.25x)
Title:     32px  (1.33x)
Subtitle:  28px  (1.55x)
Body:      24px  (1.5x)
Small:     20px  (1.43x)
Tiny:      16px  (1.33x)
```

---

## 📐 Border Radius

```
Small:     12px  └──┘  Buttons, pills
Medium:    16px  └───┘  Inputs, cards
Large:     20px  └────┘  Large cards
XLarge:    24px  └─────┘  Featured cards
XXLarge:   28px  └──────┘  Hero sections
Massive:   32px  └───────┘  Screen sections
Circle:    50%   ●  Pills, avatars
```

---

## 🌓 Shadows

### Light Shadows (Subtle Elevation)
```
Level 1:
  shadowOffset: { width: 0, height: 2 }
  shadowOpacity: 0.05
  shadowRadius: 4
  elevation: 1

Level 2:
  shadowOffset: { width: 0, height: 2 }
  shadowOpacity: 0.06
  shadowRadius: 8
  elevation: 2
```

### Medium Shadows (Cards, Buttons)
```
Level 3:
  shadowOffset: { width: 0, height: 4 }
  shadowOpacity: 0.08
  shadowRadius: 12
  elevation: 3

Level 4:
  shadowOffset: { width: 0, height: 4 }
  shadowOpacity: 0.1
  shadowRadius: 12
  elevation: 4
```

### Strong Shadows (Modals, Drawers)
```
Level 6:
  shadowOffset: { width: 0, height: 8 }
  shadowOpacity: 0.15
  shadowRadius: 16
  elevation: 6

Level 8:
  shadowOffset: { width: 0, height: 8 }
  shadowOpacity: 0.2
  shadowRadius: 16
  elevation: 8
```

---

## 🎬 Animation Timings

### Duration
```
Instant:   100ms  Quick feedback
Fast:      200ms  UI transitions
Normal:    300ms  Default animations
Slow:      500ms  Emphasized transitions
Smooth:    800ms  Onboarding, fades
```

### Easing
```
Spring:
  tension: 40
  friction: 8
  bounciness: 4

Timing:
  easeInOut: Standard transitions
  easeOut: Entrances
  easeIn: Exits
```

### Transform Values
```
Press Scale:     0.96-0.98
Slide Distance:  20px
Fade Range:      0 → 1
```

---

## 📱 Component Sizing

### Buttons
```
Height:          52px
Padding H:       24px
Padding V:       14px
Border Radius:   16px
Min Width:       120px
Icon Size:       20px
```

### Inputs
```
Height:          56px
Padding H:       16px
Padding V:       16px
Border Width:    2px
Border Radius:   16px
Icon Size:       20px
```

### Cards
```
Padding:         20-24px
Border Radius:   24-28px
Gap:             16-24px
```

### Icons
```
Small:           16px  Navigation, inline
Medium:          20-24px  Buttons, cards
Large:           28px  Headers
XLarge:          48px  Features
XXLarge:         64-72px  Empty states, logos
```

---

## 🎯 Touch Targets

```
Minimum:         44x44pt  (iOS guidelines)
Button:          52px height
Icon Button:     40x40px
Input:           56px height
List Item:       56-64px height
```

---

## 🔍 Opacity Levels

```
Disabled:        0.5   Half transparent
Muted:           0.7   Slightly faded
Subtle:          0.8   Light emphasis
Emphasized:      0.9   Strong emphasis
Solid:           1.0   Full opacity
```

### Color Transparency
```
Overlay:         color + '15'  (15% opacity)
Background:      'rgba(255, 255, 255, 0.2)'
Frosted Glass:   'rgba(255, 255, 255, 0.25)'
```

---

## 📊 Z-Index Layers

```
Base:            0     Normal content
Raised:          1     Cards, buttons
Dropdown:        10    Dropdowns, tooltips
Sticky:          100   Sticky headers
Overlay:         1000  Modals, overlays
Modal:           2000  Modal dialogs
Toast:           3000  Notifications
```

---

## 🎨 Usage Examples

### Primary Button
```tsx
backgroundColor: #4F46E5
color: #FFFFFF
height: 52px
borderRadius: 16px
shadow: Level 2
```

### Card
```tsx
backgroundColor: #FFFFFF
borderRadius: 24px
padding: 24px
shadow: Level 3
gap: 16px
```

### Input (Focus State)
```tsx
backgroundColor: #FFFFFF
borderColor: #4F46E5 (animated)
borderWidth: 2px
borderRadius: 16px
height: 56px
shadow: Level 2
```

### Gradient Header
```tsx
colors: ['#4F46E5', '#7C3AED']
borderRadius: 0 0 32px 32px
padding: 32px 24px
shadow: Level 8
```

---

## 🚀 Quick Reference

### Most Used Combinations

**Hero Section:**
- Gradient: `#4F46E5 → #7C3AED`
- Border Radius: `32px`
- Shadow: `Level 8`
- Text Color: `#FFFFFF`

**Card:**
- Background: `#FFFFFF`
- Border Radius: `24px`
- Padding: `24px`
- Shadow: `Level 3`
- Gap: `16px`

**Button (Primary):**
- Background: `#4F46E5`
- Height: `52px`
- Border Radius: `16px`
- Shadow: `Level 2`
- Press Scale: `0.96`

**Input:**
- Height: `56px`
- Border: `2px`
- Border Radius: `16px`
- Focus Color: `#4F46E5`
- Shadow (Focus): `Level 2`

---

**Version:** 1.0  
**Last Updated:** [Current Date]  
**Status:** ✅ Active
