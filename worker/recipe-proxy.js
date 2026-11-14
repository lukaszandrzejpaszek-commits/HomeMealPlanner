const MAX_REQUEST_BYTES = 4096;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 15000;
const MAX_REDIRECTS = 5;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

class ProxyError extends Error {
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}

function parseList(value) {
    return (value || '').split(',').map(item => item.trim()).filter(Boolean);
}

function getAllowedOrigins(env) {
    return parseList(env.ALLOWED_ORIGINS);
}

function getAllowedRecipeHosts(env) {
    return parseList(env.ALLOWED_RECIPE_HOSTS)
        .map(host => host.toLowerCase().replace(/\.$/, ''))
        .filter(host => host.length <= 253 && host.split('.').length > 1 &&
            host.split('.').every(label =>
                label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)
            ));
}

function createCorsHeaders(origin) {
    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
        'Vary': 'Origin'
    };
}

function jsonResponse(body, status, corsHeaders = {}) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
            ...corsHeaders
        }
    });
}

function validateRecipeUrl(value, allowedHosts) {
    let url;
    try {
        url = new URL(value);
    } catch (error) {
        throw new ProxyError('Enter a valid recipe URL.', 400);
    }

    const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
    if (url.protocol !== 'https:' || (url.port && url.port !== '443') || url.username || url.password) {
        throw new ProxyError('Recipe pages must use HTTPS and cannot include credentials or a nonstandard port.', 400);
    }
    if (!hostname.includes('.') || hostname.includes(':') ||
        hostname === 'localhost' || hostname.endsWith('.localhost') ||
        hostname.endsWith('.local') || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) {
        throw new ProxyError('This host is not allowed.', 403);
    }
    if (!allowedHosts.some(host => hostname === host || hostname.endsWith(`.${host}`))) {
        throw new ProxyError('This recipe domain is not configured in the proxy allowlist.', 403);
    }

    url.hash = '';
    return url;
}

async function readLimitedBody(response) {
    const contentLength = Number(response.headers.get('Content-Length'));
    if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
        throw new ProxyError('The recipe page is larger than the allowed size.', 413);
    }
    if (!response.body) {
        throw new ProxyError('The recipe website returned an empty page.', 502);
    }

    const reader = response.body.getReader();
    const chunks = [];
    let byteLength = 0;
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        byteLength += value.byteLength;
        if (byteLength > MAX_RESPONSE_BYTES) {
            await reader.cancel();
            throw new ProxyError('The recipe page is larger than the allowed size.', 413);
        }
        chunks.push(value);
    }

    const bytes = new Uint8Array(byteLength);
    let offset = 0;
    chunks.forEach(chunk => {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
    });
    return new TextDecoder().decode(bytes);
}

async function fetchRecipePage(startUrl, allowedHosts, signal) {
    let currentUrl = validateRecipeUrl(startUrl, allowedHosts);

    for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
        const response = await fetch(currentUrl.href, {
            method: 'GET',
            redirect: 'manual',
            headers: { Accept: 'text/html,application/xhtml+xml' },
            signal
        });

        if (REDIRECT_STATUSES.has(response.status)) {
            if (redirectCount === MAX_REDIRECTS) {
                throw new ProxyError('The recipe page redirected too many times.', 502);
            }
            const location = response.headers.get('Location');
            if (!location) {
                throw new ProxyError('The recipe website returned an invalid redirect.', 502);
            }
            if (response.body) await response.body.cancel();
            currentUrl = validateRecipeUrl(new URL(location, currentUrl).href, allowedHosts);
            continue;
        }

        if (!response.ok) {
            throw new ProxyError(`The recipe website returned ${response.status}.`, 502);
        }
        const contentType = response.headers.get('Content-Type') || '';
        if (!/^text\/html\b|^application\/xhtml\+xml\b/i.test(contentType)) {
            throw new ProxyError('The linked page did not return HTML.', 415);
        }

        return {
            html: await readLimitedBody(response),
            finalUrl: currentUrl.href
        };
    }

    throw new ProxyError('Could not load the recipe page.', 502);
}

export default {
    async fetch(request, env) {
        const origin = request.headers.get('Origin') || '';
        const allowedOrigins = getAllowedOrigins(env);
        if (!origin || !allowedOrigins.includes(origin)) {
            return jsonResponse({ error: 'This app origin is not allowed by the recipe proxy.' }, 403);
        }
        const corsHeaders = createCorsHeaders(origin);

        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: corsHeaders });
        }
        if (request.method !== 'POST') {
            return jsonResponse({ error: 'Use POST to request a recipe page.' }, 405, corsHeaders);
        }

        const contentType = request.headers.get('Content-Type') || '';
        if (!/^application\/json\b/i.test(contentType)) {
            return jsonResponse({ error: 'Send the recipe URL as JSON.' }, 415, corsHeaders);
        }
        const declaredLength = Number(request.headers.get('Content-Length'));
        if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
            return jsonResponse({ error: 'The request is too large.' }, 413, corsHeaders);
        }

        let body;
        try {
            const bytes = await request.arrayBuffer();
            if (bytes.byteLength > MAX_REQUEST_BYTES) {
                return jsonResponse({ error: 'The request is too large.' }, 413, corsHeaders);
            }
            body = JSON.parse(new TextDecoder().decode(bytes));
        } catch (error) {
            return jsonResponse({ error: 'Send a valid JSON object containing a recipe URL.' }, 400, corsHeaders);
        }

        if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.url !== 'string') {
            return jsonResponse({ error: 'A recipe URL is required.' }, 400, corsHeaders);
        }
        const allowedHosts = getAllowedRecipeHosts(env);
        if (!allowedHosts.length) {
            return jsonResponse({ error: 'The recipe proxy has no allowed recipe domains configured.' }, 503, corsHeaders);
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        try {
            const result = await fetchRecipePage(body.url, allowedHosts, controller.signal);
            return jsonResponse(result, 200, corsHeaders);
        } catch (error) {
            if (error.name === 'AbortError') {
                return jsonResponse({ error: 'The recipe website took too long to respond.' }, 504, corsHeaders);
            }
            const status = error instanceof ProxyError ? error.status : 502;
            const message = error instanceof ProxyError ? error.message : 'The recipe website could not be fetched.';
            return jsonResponse({ error: message }, status, corsHeaders);
        } finally {
            clearTimeout(timeout);
        }
    }
};
