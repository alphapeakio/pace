// 4x200m Relay Split Times Database
// Leg-by-leg relay splits

export const eventMeta = {
  "id": "4x200m",
  "name": "4×200m Relay",
  "distance": 800,
  "segments": [
    { "label": "Leg 1 (200m)", "distance": 200 },
    { "label": "Leg 2 (200m)", "distance": 200 },
    { "label": "Leg 3 (200m)", "distance": 200 },
    { "label": "Leg 4 (200m)", "distance": 200 }
  ],
  "timeUnit": "seconds",
  "timeRange": { "min": 78, "max": 120 }
};

export const pacingModels = {
  "male": [
    {
      "level": "World Record",
      "range": "",
      "targetTime": 78.63,
      "pcts": [25.8, 24.8, 24.8, 24.6]
    },
    {
      "level": "World Class (79-82)",
      "range": "",
      "targetTime": 80.5,
      "pcts": [25.6, 24.8, 24.8, 24.8]
    },
    {
      "level": "Elite (82-86)",
      "range": "",
      "targetTime": 84,
      "pcts": [25.4, 24.8, 24.9, 24.9]
    },
    {
      "level": "Sub-Elite (86-92)",
      "range": "",
      "targetTime": 89,
      "pcts": [25.3, 24.9, 24.9, 24.9]
    },
    {
      "level": "Collegiate (92-100)",
      "range": "",
      "targetTime": 96,
      "pcts": [25.2, 24.9, 25.0, 24.9]
    },
    {
      "level": "HS Varsity (100-115)",
      "range": "",
      "targetTime": 107.5,
      "pcts": [25.1, 25.0, 25.0, 24.9]
    }
  ],
  "female": [
    {
      "level": "World Record",
      "range": "",
      "targetTime": 87.46,
      "pcts": [25.8, 24.8, 24.8, 24.6]
    },
    {
      "level": "World Class (88-92)",
      "range": "",
      "targetTime": 90,
      "pcts": [25.6, 24.8, 24.8, 24.8]
    },
    {
      "level": "Elite (92-96)",
      "range": "",
      "targetTime": 94,
      "pcts": [25.4, 24.9, 24.9, 24.8]
    },
    {
      "level": "Sub-Elite (96-104)",
      "range": "",
      "targetTime": 100,
      "pcts": [25.3, 24.9, 24.9, 24.9]
    },
    {
      "level": "Collegiate (104-115)",
      "range": "",
      "targetTime": 109.5,
      "pcts": [25.2, 24.9, 25.0, 24.9]
    },
    {
      "level": "HS Varsity (115-130)",
      "range": "",
      "targetTime": 122.5,
      "pcts": [25.1, 25.0, 25.0, 24.9]
    }
  ]
};

export const menData = [];

export const womenData = [];
