// 4x100m Relay Split Times Database
// Leg-by-leg relay splits

export const eventMeta = {
  "id": "4x100m",
  "name": "4×100m Relay",
  "distance": 400,
  "segments": [
    { "label": "Leg 1 (100m)", "distance": 100 },
    { "label": "Leg 2 (100m)", "distance": 100 },
    { "label": "Leg 3 (100m)", "distance": 100 },
    { "label": "Leg 4 (100m)", "distance": 100 }
  ],
  "timeUnit": "seconds",
  "timeRange": { "min": 36, "max": 52 }
};

export const pacingModels = {
  "male": [
    {
      "level": "World Record",
      "range": "",
      "targetTime": 36.84,
      "pcts": [26.2, 24.4, 24.5, 24.9]
    },
    {
      "level": "World Class (37.0-37.8)",
      "range": "",
      "targetTime": 37.4,
      "pcts": [26.0, 24.5, 24.5, 25.0]
    },
    {
      "level": "Elite (37.8-38.5)",
      "range": "",
      "targetTime": 38.15,
      "pcts": [25.8, 24.5, 24.6, 25.1]
    },
    {
      "level": "Sub-Elite (38.5-40.0)",
      "range": "",
      "targetTime": 39.25,
      "pcts": [25.7, 24.6, 24.6, 25.1]
    },
    {
      "level": "Collegiate (40-42)",
      "range": "",
      "targetTime": 41,
      "pcts": [25.6, 24.6, 24.7, 25.1]
    },
    {
      "level": "HS Varsity (42-46)",
      "range": "",
      "targetTime": 44,
      "pcts": [25.5, 24.7, 24.7, 25.1]
    },
    {
      "level": "HS JV (46-52)",
      "range": "",
      "targetTime": 49,
      "pcts": [25.5, 24.8, 24.8, 24.9]
    }
  ],
  "female": [
    {
      "level": "World Record",
      "range": "",
      "targetTime": 40.82,
      "pcts": [26.3, 24.3, 24.5, 24.9]
    },
    {
      "level": "World Class (41.0-42.0)",
      "range": "",
      "targetTime": 41.5,
      "pcts": [26.1, 24.4, 24.5, 25.0]
    },
    {
      "level": "Elite (42.0-43.5)",
      "range": "",
      "targetTime": 42.75,
      "pcts": [25.9, 24.5, 24.6, 25.0]
    },
    {
      "level": "Sub-Elite (43.5-45.5)",
      "range": "",
      "targetTime": 44.5,
      "pcts": [25.7, 24.6, 24.6, 25.1]
    },
    {
      "level": "Collegiate (45.5-48)",
      "range": "",
      "targetTime": 46.75,
      "pcts": [25.6, 24.7, 24.7, 25.0]
    },
    {
      "level": "HS Varsity (48-52)",
      "range": "",
      "targetTime": 50,
      "pcts": [25.5, 24.7, 24.8, 25.0]
    }
  ]
};

export const menData = [];

export const womenData = [];
