import {
    ParameterType,
    tool,
    ToolsService,
} from '@optimizely-opal/opal-tools-sdk';
import express from 'express';

// Create Express app
const app = express();
app.use(express.json());

// Create Tools Service
const toolsService = new ToolsService(app);

async function speed_heuristics_checker(parameters: { url: string }) {
    const { url } = parameters;

    // Fetch the page HTML
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
    const html = await res.text();

    // Extract <script ...>...</script>
    const scriptMatches = [
        ...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi),
    ];

    let totalScripts = 0;
    let blockingScripts = 0; // scripts without defer/async
    let inlineBytes = 0;

    for (const match of scriptMatches) {
        totalScripts++;

        const attrs = match[1] || '';
        const body = match[2] || '';

        const hasDefer = /\bdefer\b/i.test(attrs);
        const hasAsync = /\basync\b/i.test(attrs);
        const hasSrc = /\bsrc\s*=\s*["'][^"']+["']/i.test(attrs);

        // blocking if it's external <script src="..."> with no defer/async,
        // or inline script in <head> (we can't perfectly detect "in head" without DOM,
        // so we simplify: any script without defer/async counts as potentially blocking).
        if (!hasDefer && !hasAsync) {
            blockingScripts++;
        }

        // inline weight: only count inline JS (no src)
        if (!hasSrc) {
            inlineBytes += Buffer.byteLength(body, 'utf8');
        }
    }

    // Extract <img ...> tags
    const imgMatches = [...html.matchAll(/<img\b([^>]*?)>/gi)];
    let totalImages = 0;
    let noLazy = 0;
    let suspectedLarge = 0;
    for (const m of imgMatches) {
        totalImages++;
        const attrs = m[1] || '';

        // lazy?
        const hasLazy = /\bloading\s*=\s*["']lazy["']/i.test(attrs);
        if (!hasLazy) {
            noLazy++;
        }

        // "suspected large" heuristic:
        // if src ends with .png or .jpg and width/height hints look big
        // We'll just detect .png/.jpg/.jpeg and presence of big-ish width number.
        const srcMatch = attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
        const widthMatch = attrs.match(/\bwidth\s*=\s*["'](\d+)["']/i);
        const heightMatch = attrs.match(/\bheight\s*=\s*["'](\d+)["']/i);
        const srcVal = srcMatch ? srcMatch[1].toLowerCase() : '';
        const widthVal = widthMatch ? parseInt(widthMatch[1], 10) : null;
        const heightVal = heightMatch ? parseInt(heightMatch[1], 10) : null;

        // naive: if it's a big raster and width or height > 1000, treat as "large"
        if (
            (srcVal.endsWith('.png') ||
                srcVal.endsWith('.jpg') ||
                srcVal.endsWith('.jpeg')) &&
            ((widthVal && widthVal > 1000) || (heightVal && heightVal > 1000))
        ) {
            suspectedLarge++;
        }
    }

    // Performance smell score: start from 100, subtract penalties
    let perfScore = 100;
    // too many scripts
    if (totalScripts > 10) perfScore -= (totalScripts - 10) * 2;
    // too many blocking
    if (blockingScripts > 5) perfScore -= (blockingScripts - 5) * 4;
    // heavy inline JS
    if (inlineBytes > 50_000) perfScore -= 15; // >50KB inline
    if (inlineBytes > 150_000) perfScore -= 20; // >150KB inline (extra hit)
    // missing lazy loading
    if (noLazy > 0 && totalImages > 0) {
        const ratioNoLazy = noLazy / totalImages;
        if (ratioNoLazy > 0.5) perfScore -= 10;
    }
    // suspected big images
    if (suspectedLarge > 0) perfScore -= suspectedLarge * 5;
    if (perfScore < 0) perfScore = 0;

    const notes = [];
    notes.push(`${totalScripts} <script> tags detected.`);
    if (blockingScripts > 0) {
        notes.push(
            `${blockingScripts} script(s) without async/defer (possible render-blockers).`,
        );
    } else {
        notes.push('Most scripts appear async/defer ✅');
    }

    if (inlineBytes > 0) {
        notes.push(`Inline JS total ~${Math.round(inlineBytes / 1024)}KB.`);
    }

    if (totalImages > 0) {
        notes.push(`${noLazy}/${totalImages} images missing loading="lazy".`);
    } else {
        notes.push('No <img> tags detected.');
    }

    if (suspectedLarge > 0) {
        notes.push(
            `${suspectedLarge} image(s) look very large ( >1000px dimension hints ).`,
        );
    }

    return {
        url,
        totalScripts,
        blockingScripts,
        inlineScriptKB: Math.round(inlineBytes / 1024),
        totalImages,
        imagesMissingLazyLoad: noLazy,
        suspectedLargeImages: suspectedLarge,
        performanceSmellScore: perfScore,
        notes,
    };
}

// Register tools
tool({
    name: 'speed_heuristics_checker',
    description: 'Analyses a web page for speed heuristics',
    parameters: [
        {
            name: 'url',
            type: ParameterType.String,
            description: 'URL to analyse',
            required: true,
        },
    ],
})(speed_heuristics_checker);

// API endpoint for the speed checker
app.get('/tools/speed_heuristics_checker', async (req, res) => {
    try {
        const { url } = req.query;
        if (!url || typeof url !== 'string') {
            return res.status(400).json({ error: 'Missing or invalid url' });
        }
        const result = await speed_heuristics_checker({ url });
        res.json(result);
    } catch (error) {
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Analysis failed',
        });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Discovery endpoint: http://localhost:${PORT}/discovery`);
});
