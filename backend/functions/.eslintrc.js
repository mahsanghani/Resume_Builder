module.exports = {
    env: {
        browser: false,
        commonjs: true,
        es6: true,
        node: true,
    },
    parserOptions: {
        ecmaVersion: 2018,
        sourceType: "module",
    },
    extends: [
        "eslint:recommended",
        "google",
    ],
    rules: {
        "no-restricted-globals": ["error", "name", "length"],
        "prefer-arrow-callback": "error",
        "quotes": ["error", "single", { "allowTemplateLiterals": true }],
        "max-len": ["error", { "code": 120 }],
        "indent": ["error", 2],
        "comma-dangle": ["error", "never"],
        "object-curly-spacing": ["error", "always"],
        "require-jsdoc": "off",
        "valid-jsdoc": "off"
    },
    overrides: [
        {
            files: ["**/*.spec.*"],
            env: {
                mocha: true,
            },
            rules: {},
        },
    ],
    globals: {},
};
