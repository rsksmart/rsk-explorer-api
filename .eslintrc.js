module.exports = {
    "extends": "standard",
    "env": {
        "node": true,
        "mocha": true
    },
    // Web-standard globals that the pinned Node runtime provides but this eslint's
    // "node" environment predates
    "globals": {
        "fetch": "readonly",
        "AbortSignal": "readonly"
    }
};
