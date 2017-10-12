jest.mock("debug", () => () => () => {});
jest.mock("url", () => ({
	parse: jest.fn().mockImplementation(url => {
		if (url === "https://example.com") {
			return {
				pathname: "/",
				query: undefined,
			};
		}
	}),
}));

const scheme = require("../index");

const noop = () => {};
const hash = jest.fn().mockImplementation(data => {
	if (data === "") {
		return "12345";
	}
	return "56789";
});
const hmac = jest.fn().mockReturnValue("hash");
const signedHeaders = ["content-type", "date", "host"];
const schemeConfig = {
	publicKey: "publicKey",
	privateKey: "privateKey",
};
const requestTemplate = {
	method: "get",
	url: "https://example.com",
	headers: {
		"content-type": "application/json",
		date: "2017-10-11T20:00:00.000Z",
		host: "example.com",
	},
	data: undefined,
};

it("requires a publicKey and privateKey in the schemeConfig", () => {
	expect(() =>
		scheme.sign({
			request: {},
			signedHeaders,
			schemeConfig: {},
			hash: noop,
			hmac: noop,
		})
	).toThrow();

	expect(() =>
		scheme.sign({
			request: {},
			signedHeaders,
			schemeConfig: { publicKey: "publicKey" },
			hash: noop,
			hmac: noop,
		})
	).toThrow();

	expect(() =>
		scheme.sign({
			request: {},
			signedHeaders,
			schemeConfig: { privateKey: "privateKey" },
			hash: noop,
			hmac: noop,
		})
	).toThrow();
});

it("requires signedHeaders", () => {
	expect(() =>
		scheme.sign({ request: {}, schemeConfig, hash: noop, hmac: noop })
	).toThrow();
});

it("generates a canonical request", () => {
	const request = Object.assign({}, requestTemplate);
	const canonicalRequest = scheme.buildCanonicalRequest(
		request,
		signedHeaders,
		hash
	);

	expect(canonicalRequest).toBe(`GET
/

content-type:application/json
date:2017-10-11T20:00:00.000Z
host:example.com

content-type;date;host
12345`);
});

it("generates a canonical request when there's a body", () => {
	const data = { key: "value" };
	const request = Object.assign({}, requestTemplate, { data });
	const canonicalRequest = scheme.buildCanonicalRequest(
		request,
		signedHeaders,
		hash
	);

	expect(canonicalRequest).toBe(`GET
/

content-type:application/json
date:2017-10-11T20:00:00.000Z
host:example.com

content-type;date;host
56789`);
});

it("ensures the body is either a string or an object", () => {
	const data = Buffer.from("");
	const bufferRequest = Object.assign({}, requestTemplate, { data });
	const stringRequest = Object.assign({}, requestTemplate, { data: "" });
	const objectRequest = Object.assign({}, requestTemplate, {
		data: { key: "value" },
	});

	expect(() =>
		scheme.buildCanonicalRequest(bufferRequest, signedHeaders, hash)
	).toThrow();

	expect(() =>
		scheme.buildCanonicalRequest(stringRequest, signedHeaders, hash)
	).not.toThrow();

	expect(() =>
		scheme.buildCanonicalRequest(objectRequest, signedHeaders, hash)
	).not.toThrow();
});

it("stringifies the body if it is an object", () => {
	const data = { key: "value" };
	const request = Object.assign({}, requestTemplate, data);

	scheme.buildCanonicalRequest(request, signedHeaders, hash);

	expect(hash).toHaveBeenCalledWith(JSON.stringify(data));
});

it("generates a canonical request when there are missing headers", () => {
	const request = Object.assign({}, requestTemplate);

	delete request.headers.date;

	const canonicalRequest = scheme.buildCanonicalRequest(
		request,
		signedHeaders,
		hash
	);

	expect(canonicalRequest).toBe(`GET
/

content-type:application/json
host:example.com

content-type;host
12345`);
});

it("signs the canonical request", () => {
	const request = Object.assign({}, requestTemplate);

	scheme.sign({ request, signedHeaders, schemeConfig, hash, hmac });

	expect(request.headers["x-auth-signedheaders"]).toBe(
		"content-type;date;host"
	);
	expect(request.headers.authorization).toBe("HMAC publicKey:hash");
});
