// 4x400m Relay Split Times Database
// Leg-by-leg relay splits

export const eventMeta = {
  "id": "4x400m",
  "name": "4×400m Relay",
  "distance": 1600,
  "segments": [
    { "label": "Leg 1 (400m)", "distance": 400 },
    { "label": "Leg 2 (400m)", "distance": 400 },
    { "label": "Leg 3 (400m)", "distance": 400 },
    { "label": "Leg 4 (400m)", "distance": 400 }
  ],
  "timeUnit": "minutes",
  "timeRange": { "min": 174, "max": 300 }
};

export const pacingModels = {
  "male": [
    {
      "level": "World Record",
      "range": "",
      "targetTime": 174.29,
      "pcts": [25.2, 24.9, 25.0, 24.9]
    },
    {
      "level": "World Class (2:55-3:00)",
      "range": "",
      "targetTime": 177.5,
      "pcts": [25.1, 24.9, 25.0, 25.0]
    },
    {
      "level": "Elite (3:00-3:06)",
      "range": "",
      "targetTime": 183,
      "pcts": [25.0, 25.0, 25.0, 25.0]
    },
    {
      "level": "Sub-Elite (3:06-3:18)",
      "range": "",
      "targetTime": 192,
      "pcts": [24.9, 25.0, 25.0, 25.1]
    },
    {
      "level": "Collegiate (3:18-3:30)",
      "range": "",
      "targetTime": 204,
      "pcts": [24.8, 25.0, 25.1, 25.1]
    },
    {
      "level": "HS Varsity (3:30-4:00)",
      "range": "",
      "targetTime": 225,
      "pcts": [24.7, 25.0, 25.1, 25.2]
    },
    {
      "level": "HS JV (4:00-5:00)",
      "range": "",
      "targetTime": 270,
      "pcts": [24.5, 25.0, 25.2, 25.3]
    }
  ],
  "female": [
    {
      "level": "World Record",
      "range": "",
      "targetTime": 195.17,
      "pcts": [25.2, 24.9, 25.0, 24.9]
    },
    {
      "level": "World Class (3:16-3:22)",
      "range": "",
      "targetTime": 199,
      "pcts": [25.1, 24.9, 25.0, 25.0]
    },
    {
      "level": "Elite (3:22-3:30)",
      "range": "",
      "targetTime": 206,
      "pcts": [25.0, 25.0, 25.0, 25.0]
    },
    {
      "level": "Sub-Elite (3:30-3:45)",
      "range": "",
      "targetTime": 217.5,
      "pcts": [24.9, 25.0, 25.0, 25.1]
    },
    {
      "level": "Collegiate (3:45-4:05)",
      "range": "",
      "targetTime": 235,
      "pcts": [24.8, 25.0, 25.1, 25.1]
    },
    {
      "level": "HS Varsity (4:05-4:40)",
      "range": "",
      "targetTime": 262.5,
      "pcts": [24.7, 25.0, 25.1, 25.2]
    },
    {
      "level": "HS JV (4:40-5:30)",
      "range": "",
      "targetTime": 305,
      "pcts": [24.5, 25.0, 25.2, 25.3]
    }
  ]
};

export const menData = [];

export const womenData = [];
