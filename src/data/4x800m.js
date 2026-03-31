// 4x800m Relay Split Times Database
// Leg-by-leg relay splits

export const eventMeta = {
  "id": "4x800m",
  "name": "4×800m Relay",
  "distance": 3200,
  "segments": [
    { "label": "Leg 1 (800m)", "distance": 800 },
    { "label": "Leg 2 (800m)", "distance": 800 },
    { "label": "Leg 3 (800m)", "distance": 800 },
    { "label": "Leg 4 (800m)", "distance": 800 }
  ],
  "timeUnit": "minutes",
  "timeRange": { "min": 420, "max": 720 }
};

export const pacingModels = {
  "male": [
    {
      "level": "World Record",
      "range": "",
      "targetTime": 422.43,
      "pcts": [25.0, 25.0, 25.0, 25.0]
    },
    {
      "level": "World Class (7:05-7:20)",
      "range": "",
      "targetTime": 432.5,
      "pcts": [24.9, 25.0, 25.0, 25.1]
    },
    {
      "level": "Elite (7:20-7:40)",
      "range": "",
      "targetTime": 450,
      "pcts": [24.8, 25.0, 25.1, 25.1]
    },
    {
      "level": "Sub-Elite (7:40-8:10)",
      "range": "",
      "targetTime": 475,
      "pcts": [24.7, 25.0, 25.1, 25.2]
    },
    {
      "level": "Collegiate (8:10-9:00)",
      "range": "",
      "targetTime": 515,
      "pcts": [24.6, 25.0, 25.1, 25.3]
    },
    {
      "level": "HS Varsity (9:00-10:30)",
      "range": "",
      "targetTime": 585,
      "pcts": [24.5, 25.0, 25.2, 25.3]
    },
    {
      "level": "HS JV (10:30-12:00)",
      "range": "",
      "targetTime": 675,
      "pcts": [24.4, 25.0, 25.2, 25.4]
    }
  ],
  "female": [
    {
      "level": "World Record",
      "range": "",
      "targetTime": 480.46,
      "pcts": [25.0, 25.0, 25.0, 25.0]
    },
    {
      "level": "World Class (8:05-8:20)",
      "range": "",
      "targetTime": 492.5,
      "pcts": [24.9, 25.0, 25.0, 25.1]
    },
    {
      "level": "Elite (8:20-8:50)",
      "range": "",
      "targetTime": 515,
      "pcts": [24.8, 25.0, 25.1, 25.1]
    },
    {
      "level": "Sub-Elite (8:50-9:30)",
      "range": "",
      "targetTime": 550,
      "pcts": [24.7, 25.0, 25.1, 25.2]
    },
    {
      "level": "Collegiate (9:30-10:30)",
      "range": "",
      "targetTime": 600,
      "pcts": [24.6, 25.0, 25.1, 25.3]
    },
    {
      "level": "HS Varsity (10:30-12:00)",
      "range": "",
      "targetTime": 675,
      "pcts": [24.5, 25.0, 25.2, 25.3]
    }
  ]
};

export const menData = [];

export const womenData = [];
