// Distance Medley Relay (DMR) Split Times Database
// Legs: 1200m – 400m – 800m – 1600m (4000m total)

export const eventMeta = {
  "id": "dmr",
  "name": "Distance Medley Relay",
  "distance": 4000,
  "segments": [
    { "label": "Leg 1 (1200m)", "distance": 1200 },
    { "label": "Leg 2 (400m)", "distance": 400 },
    { "label": "Leg 3 (800m)", "distance": 800 },
    { "label": "Leg 4 (1600m)", "distance": 1600 }
  ],
  "timeUnit": "minutes",
  "timeRange": { "min": 555, "max": 900 }
};

export const pacingModels = {
  "male": [
    {
      "level": "World Record",
      "range": "",
      "targetTime": 565.66,
      "pcts": [30.2, 8.5, 17.8, 43.5]
    },
    {
      "level": "World Class (9:30-9:50)",
      "range": "",
      "targetTime": 580,
      "pcts": [30.1, 8.5, 17.8, 43.6]
    },
    {
      "level": "Elite (9:50-10:15)",
      "range": "",
      "targetTime": 607.5,
      "pcts": [30.0, 8.6, 17.9, 43.5]
    },
    {
      "level": "Sub-Elite (10:15-10:50)",
      "range": "",
      "targetTime": 637.5,
      "pcts": [29.9, 8.6, 17.9, 43.6]
    },
    {
      "level": "Collegiate (10:50-11:30)",
      "range": "",
      "targetTime": 670,
      "pcts": [29.8, 8.7, 18.0, 43.5]
    },
    {
      "level": "HS Varsity (11:30-13:00)",
      "range": "",
      "targetTime": 735,
      "pcts": [29.7, 8.8, 18.0, 43.5]
    },
    {
      "level": "HS JV (13:00-15:00)",
      "range": "",
      "targetTime": 840,
      "pcts": [29.5, 8.9, 18.1, 43.5]
    }
  ],
  "female": [
    {
      "level": "World Record",
      "range": "",
      "targetTime": 638.30,
      "pcts": [30.2, 8.5, 17.8, 43.5]
    },
    {
      "level": "World Class (10:45-11:05)",
      "range": "",
      "targetTime": 655,
      "pcts": [30.1, 8.5, 17.8, 43.6]
    },
    {
      "level": "Elite (11:05-11:30)",
      "range": "",
      "targetTime": 682.5,
      "pcts": [30.0, 8.6, 17.9, 43.5]
    },
    {
      "level": "Sub-Elite (11:30-12:10)",
      "range": "",
      "targetTime": 710,
      "pcts": [29.9, 8.6, 17.9, 43.6]
    },
    {
      "level": "Collegiate (12:10-13:00)",
      "range": "",
      "targetTime": 755,
      "pcts": [29.8, 8.7, 18.0, 43.5]
    },
    {
      "level": "HS Varsity (13:00-15:00)",
      "range": "",
      "targetTime": 840,
      "pcts": [29.7, 8.8, 18.0, 43.5]
    }
  ]
};

export const menData = [];

export const womenData = [];
