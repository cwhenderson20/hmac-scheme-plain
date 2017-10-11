# hmac-scheme-plain
[![Build Status](https://travis-ci.org/cwhenderson20/hmac-scheme-plain.svg?branch=master)](https://travis-ci.org/cwhenderson20/hmac-scheme-plain)

Plain scheme plugin for [axios-adapter-hmac](https://github.com/cwhenderson20/axios-adapter-hmac). Follows the "plain" scheme spec from  [cmawhorter/hmmac](https://github.com/cmawhorter/hmmac).

## Config

This scheme requires two values in the `schemeConfig` object:

```javascript
{
    publicKey: "<publicKey>",
    privateKey: "<privateKey>",
}
```

## Usage

See the readme for [axios-adapter-hmac](https://github.com/cwhenderson20/axios-adapter-hmac) for adapter-specific usage instructions.

This module is not inherently coupled to the axios adapter — its purpose is simply to transform a request-ish object.

To use this module outside of the axios request adapter, simply require it and pass options to the `sign` function:

```javascript
const hmacSchemePlain = require("hmac-scheme-plain");

function hash(data) {
    // generate a hash digest
}

function hmac(data) {
    // generate an hmac digest
}

const signedHeaders = ["content-type", "date", "host"];
const schemeConfig = {
    publicKey: "publicKey",
    privateKey: "privateKey",
};
const request = {
    method: "get",
    url: "https://google.com",
    headers: {
        "content-type": "application/json",
        date: "2017-10-11T20:00:00.000Z",
        host: "google.com",
    },
    data: {
        key: "value",
    }
    // ...other request keys
}

hmacSchemePlain.sign({ request, signedHeaders, schemeConfig, hash, hmac });

console.log(request)
/* {
    method: "get",
    url: "https://google.com",
    headers: {
        "content-type": "application/json",
        date: "2017-10-11T20:00:00.000Z",
        host: "google.com",
        // new headers
        "x-auth-signedheaders": "content-type;date;host",
        authorization: "HMAC <publicKey>:<hash>",
    },
    data: {
        key: "value",
    }
    ...other request keys
} */
```

The request object is required to have the following properties:

```
method: string,
url: string,
headers: {
    [string]: string
},
data?: {
    [string]: string
},
```

The `hash` and `hmac` functions must generate digests as strings. An example using the `crypto` module:

```javascript
const crypto = require("crypto");

function hash(data) {
    return crypto
        .generateHash("sha256")
        .update(data)
        .digest("hex");
}
```

`signedHeaders` must be an array, though it can be empty.
