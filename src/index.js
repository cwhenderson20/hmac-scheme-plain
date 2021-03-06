const url = require("url");
const debug = require("debug")("hmac-scheme-plain");

const hmacSchemePlain = {
	buildCanonicalRequest(request, signedHeaders, hash) {
		debug("Building canonical request");

		const method = request.method.toUpperCase();
		const urlParts = url.parse(request.url);
		const normalizedHeaders = Object.keys(
			request.headers
		).reduce((acc, header) => {
			acc[header.toLowerCase()] = request.headers[header];
			return acc;
		}, {});
		const headers = {};

		signedHeaders.forEach(header => {
			if (normalizedHeaders[header]) {
				headers[header] = normalizedHeaders[header];
			}
		});

		const canonicalHeaders = Object.keys(headers).reduce((acc, header) => {
			acc += `${header}:${headers[header].trim()}\n`;
			return acc;
		}, "");

		const path = urlParts.pathname;
		const query = urlParts.query || "";
		let body =
			request.data === undefined || request.data === null ? "" : request.data;

		if (isObject(body)) {
			body = JSON.stringify(body);
		} else if (typeof body !== "string") {
			throw new Error("request.data must be a string or plain object");
		}

		const canonicalRequest = `${method}\n${path}\n${query}\n${canonicalHeaders}\n${Object.keys(
			headers
		).join(";")}\n${hash(body)}`;

		debug("Canonical request:\n", canonicalRequest);

		return canonicalRequest;
	},

	sign({ request, signedHeaders, schemeConfig, hash, hmac }) {
		debug("Signing request");

		if (!schemeConfig.publicKey || !schemeConfig.privateKey) {
			throw new Error("publicKey and privateKey are required");
		}

		if (!signedHeaders) {
			throw new Error("signedHeaders are required");
		}

		const canonicalRequest = this.buildCanonicalRequest(
			request,
			signedHeaders,
			hash
		);
		const signature = hmac(canonicalRequest, schemeConfig.privateKey);

		debug("Signature:", signature);

		request.headers.authorization = `HMAC ${schemeConfig.publicKey}:${signature}`;
		request.headers["x-auth-signedheaders"] = signedHeaders.join(";");
	},
};

function isObject(value) {
	return Object.prototype.toString.call(value) === "[object Object]";
}

module.exports = hmacSchemePlain;
