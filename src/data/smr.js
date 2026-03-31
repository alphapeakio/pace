// Sprint Medley Relay (SMR) Split Times Database
// Legs: 200m – 200m – 400m – 800m (1600m total)

export const eventMeta = {
  "id": "smr",
  "name": "Sprint Medley Relay",
  "distance": 1600,
  "segments": [
    { "label": "Leg 1 (200m)", "distance": 200 },
    { "label": "Leg 2 (200m)", "distance": 200 },
    { "label": "Leg 3 (400m)", "distance": 400 },
    { "label": "Leg 4 (800m)", "distance": 800 }
  ],
  "timeUnit": "minutes",
  "timeRange": { "min": 180, "max": 330 }
};

export const pacingModels = {
  "male": [
    {
      "level": "World Class",
      "range": "",
      "targetTime": 186,
      "pcts": [11.8, 11.6, 24.7, 51.9]
    },
    {
      "level": "Elite (3:10-3:20)",
      "range": "",
      "targetTime": 195,
      "pcts": [11.9, 11.7, 24.8, 51.6]
    },
    {
      "level": "Sub-Elite (3:20-3:35)",
      "range": "",
      "targetTime": 207.5,
      "pcts": [12.0, 11.8, 24.9, 51.3]
    },
    {
      "level": "Collegiate (3:35-3:55)",
      "range": "",
      "targetTime": 225,
      "pcts": [12.1, 11.9, 25.0, 51.0]
    },
    {
      "level": "HS Varsity (3:55-4:30)",
      "range": "",
      "targetTime": 252.5,
      "pcts": [12.2, 12.0, 25.1, 50.7]
    },
    {
      "level": "HS JV (4:30-5:30)",
      "range": "",
      "targetTime": 300,
      "pcts": [12.3, 12.1, 25.2, 50.4]
    }
  ],
  "female": [
    {
      "level": "World Class",
      "range": "",
      "targetTime": 216,
      "pcts": [11.8, 11.6, 24.7, 51.9]
    },
    {
      "level": "Elite (3:40-3:55)",
      "range": "",
      "targetTime": 227.5,
      "pcts": [11.9, 11.7, 24.8, 51.6]
    },
    {
      "level": "Sub-Elite (3:55-4:15)",
      "range": "",
      "targetTime": 245,
      "pcts": [12.0, 11.8, 24.9, 51.3]
    },
    {
      "level": "Collegiate (4:15-4:45)",
      "range": "",
      "targetTime": 270,
      "pcts": [12.1, 11.9, 25.0, 51.0]
    },
    {
      "level": "HS Varsity (4:45-5:30)",
      "range": "",
      "targetTime": 307.5,
      "pcts": [12.2, 12.0, 25.1, 50.7]
    }
  ]
};

export const menData = [];

export const womenData = [];
