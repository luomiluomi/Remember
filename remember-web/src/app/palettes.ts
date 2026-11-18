// Colors from FreeWorkLite/lib/theme/tokens.dart
export const palettes = {
  "editorial": {
    "label": [
      "编辑刊本",
      "Editorial"
    ],
    "colors": {
      "paper": "#F5F1E9",
      "surface": "#FFFDFA",
      "surfaceVariant": "#EEE8DE",
      "ink": "#25211E",
      "inkMuted": "#625B53",
      "accent": "#A52626",
      "accentSoft": "#F8E9E6",
      "border": "#D8D0C4",
      "success": "#15803D",
      "warning": "#B45309",
      "error": "#DC2626",
      "codeSurface": "#1A1714",
      "codeInk": "#F1E8D8"
    }
  },
  "midnight": {
    "label": [
      "午夜墨",
      "Midnight"
    ],
    "colors": {
      "paper": "#171920",
      "surface": "#232733",
      "surfaceVariant": "#1D202A",
      "ink": "#EEEFF6",
      "inkMuted": "#B5BDCF",
      "accent": "#AFC2FF",
      "accentSoft": "#323D59",
      "border": "#42495C",
      "success": "#6FBF91",
      "warning": "#DEA848",
      "error": "#E56364",
      "codeSurface": "#1D202A",
      "codeInk": "#E3E4EA"
    }
  },
  "indigo": {
    "label": [
      "靛蓝纸本",
      "Indigo"
    ],
    "colors": {
      "paper": "#EEF0F5",
      "surface": "#FCFCFF",
      "surfaceVariant": "#E5E8F1",
      "ink": "#23283A",
      "inkMuted": "#535C73",
      "accent": "#344C91",
      "accentSoft": "#E8EDFC",
      "border": "#CBD1E1",
      "success": "#166534",
      "warning": "#92400E",
      "error": "#B91C1C",
      "codeSurface": "#23283A",
      "codeInk": "#E8EDFC"
    }
  },
  "dune": {
    "label": [
      "沙丘",
      "Dune"
    ],
    "colors": {
      "paper": "#F4EADD",
      "surface": "#FFFAF2",
      "surfaceVariant": "#EBDECC",
      "ink": "#30251D",
      "inkMuted": "#655448",
      "accent": "#8D3928",
      "accentSoft": "#F7E3D8",
      "border": "#D8C5AE",
      "success": "#166534",
      "warning": "#92400E",
      "error": "#B91C1C",
      "codeSurface": "#30251D",
      "codeInk": "#FFEDE0"
    }
  },
  "forest": {
    "label": [
      "苔原绿",
      "Forest"
    ],
    "colors": {
      "paper": "#EEF3EC",
      "surface": "#FAFDF8",
      "surfaceVariant": "#DFE9DC",
      "ink": "#233529",
      "inkMuted": "#526354",
      "accent": "#285B40",
      "accentSoft": "#DDEEE1",
      "border": "#C6D5C5",
      "success": "#166534",
      "warning": "#92400E",
      "error": "#B91C1C",
      "codeSurface": "#29252E",
      "codeInk": "#F4EEF8"
    }
  },
  "plum": {
    "label": [
      "烟紫",
      "Plum"
    ],
    "colors": {
      "paper": "#F1EDF5",
      "surface": "#FDFBFF",
      "surfaceVariant": "#E7DFF0",
      "ink": "#33283E",
      "inkMuted": "#65566F",
      "accent": "#694084",
      "accentSoft": "#EDE1F5",
      "border": "#D4C6DF",
      "success": "#166534",
      "warning": "#92400E",
      "error": "#B91C1C",
      "codeSurface": "#29252E",
      "codeInk": "#F4EEF8"
    }
  },
  "rose": {
    "label": [
      "玫瑰笺",
      "Rose"
    ],
    "colors": {
      "paper": "#F8EEEE",
      "surface": "#FFFAFA",
      "surfaceVariant": "#F0DEDF",
      "ink": "#40292E",
      "inkMuted": "#77545C",
      "accent": "#963C58",
      "accentSoft": "#F8E0E8",
      "border": "#DFC6CE",
      "success": "#166534",
      "warning": "#92400E",
      "error": "#B91C1C",
      "codeSurface": "#29252E",
      "codeInk": "#F4EEF8"
    }
  }
} as const
export type Palette = keyof typeof palettes
