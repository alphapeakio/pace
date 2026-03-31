// Hurdle Shuttle Relay Split Times Database
// 4-leg shuttle hurdle relay (4×110m hurdles men / 4×100m hurdles women)

export const eventMeta = {
  "id": "shuttle-hurdle",
  "name": "Hurdle Shuttle Relay",
  "distance": 440,
  "segments": [
    { "label": "Leg 1", "distance": 110 },
    { "label": "Leg 2", "distance": 110 },
    { "label": "Leg 3", "distance": 110 },
    { "label": "Leg 4", "distance": 110 }
  ],
  "timeUnit": "seconds",
  "timeRange": { "min": 52, "max": 80 }
};

export const pacingModels = {
  "male": [
    {
      "level": "World Class",
      "range": "",
      "targetTime": 53.5,
      "pcts": [25.2, 24.9, 24.9, 25.0]
    },
    {
      "level": "Elite (54-56)",
      "range": "",
      "targetTime": 55,
      "pcts": [25.1, 24.9, 25.0, 25.0]
    },
    {
      "level": "Sub-Elite (56-59)",
      "range": "",
      "targetTime": 57.5,
      "pcts": [25.0, 25.0, 25.0, 25.0]
    },
    {
      "level": "Collegiate (59-64)",
      "range": "",
      "targetTime": 61.5,
      "pcts": [24.9, 25.0, 25.0, 25.1]
    },
    {
      "level": "HS Varsity (64-72)",
      "range": "",
      "targetTime": 68,
      "pcts": [24.8, 25.0, 25.1, 25.1]
    },
    {
      "level": "HS JV (72-80)",
      "range": "",
      "targetTime": 76,
      "pcts": [24.7, 25.0, 25.1, 25.2]
    }
  ],
  "female": [
    {
      "level": "World Class",
      "range": "",
      "targetTime": 52.5,
      "pcts": [25.2, 24.9, 24.9, 25.0]
    },
    {
      "level": "Elite (53-55)",
      "range": "",
      "targetTime": 54,
      "pcts": [25.1, 24.9, 25.0, 25.0]
    },
    {
      "level": "Sub-Elite (55-58)",
      "range": "",
      "targetTime": 56.5,
      "pcts": [25.0, 25.0, 25.0, 25.0]
    },
    {
      "level": "Collegiate (58-63)",
      "range": "",
      "targetTime": 60.5,
      "pcts": [24.9, 25.0, 25.0, 25.1]
    },
    {
      "level": "HS Varsity (63-72)",
      "range": "",
      "targetTime": 67.5,
      "pcts": [24.8, 25.0, 25.1, 25.1]
    },
    {
      "level": "HS JV (72-80)",
      "range": "",
      "targetTime": 76,
      "pcts": [24.7, 25.0, 25.1, 25.2]
    }
  ]
};

export const menData = [];

export const womenData = [];
