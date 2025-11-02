"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const opal_tools_sdk_1 = require("@optimizely-opal/opal-tools-sdk");
// Create Express app
const app = (0, express_1.default)();
app.use(express_1.default.json());
// Create Tools Service
const toolsService = new opal_tools_sdk_1.ToolsService(app);
/**
 * Greeting Tool: Greets a person in a random language
 */
// Apply tool decorator after function definition
async function sgcgreeting(parameters) {
    const { name, language } = parameters;
    // If language not specified, choose randomly
    const selectedLanguage = language ||
        ['english', 'spanish', 'french'][Math.floor(Math.random() * 3)];
    // Generate greeting based on language
    let greeting;
    if (selectedLanguage.toLowerCase() === 'spanish') {
        greeting = `¡Hola, ${name}! ¿Cómo estás?`;
    }
    else if (selectedLanguage.toLowerCase() === 'french') {
        greeting = `Bonjour, ${name}! Comment ça va?`;
    }
    else { // Default to English
        greeting = `Hello, ${name}! How are you?`;
    }
    return {
        greeting,
        language: selectedLanguage
    };
}
/**
 * Today's Date Tool: Returns today's date in the specified format
 */
// Apply tool decorator after function definition
async function sgctodaysDate(parameters) {
    const format = parameters.format || '%Y-%m-%d';
    // Get today's date
    const today = new Date();
    // Format the date (simplified implementation)
    let formattedDate;
    if (format === '%Y-%m-%d') {
        formattedDate = today.toISOString().split('T')[0];
    }
    else if (format === '%B %d, %Y') {
        formattedDate = today.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    else if (format === '%d/%m/%Y') {
        formattedDate = today.toLocaleDateString('en-GB');
    }
    else {
        // Default to ISO format
        formattedDate = today.toISOString().split('T')[0];
    }
    return {
        date: formattedDate,
        format: format,
        timestamp: today.getTime() / 1000
    };
}

/**
 * Content Density: Analyses a web page for content density
 */
async function contentdensityevaluator(parameters) {
  const { url } = parameters;
  const res = await fetch(url);
  const html = await res.text();
  const $ = cheerio.load(html);

  const paragraphs = $("p")
    .map((_, el) => $(el).text().trim().replace(/\s+/g, " "))
    .get()
    .filter(Boolean);

  const words = paragraphs.join(" ").split(/\s+/).filter(Boolean).length;
  const images = $("img").length;
  const headings = $("h1, h2, h3, h4, h5, h6").length;
  const avgParagraph = paragraphs.length
    ? paragraphs.reduce((a, p) => a + p.split(/\s+/).length, 0) / paragraphs.length
    : 0;

  const scanability =
    100 -
    (avgParagraph > 100 ? 20 : 0) -
    (images === 0 ? 20 : 0) -
    (headings === 0 ? 20 : 0);

  return {
    url,
    wordCount: words,
    imageCount: images,
    headingCount: headings,
    avgParagraphLength: Math.round(avgParagraph),
    scanabilityScore: Math.max(0, scanability),
    notes: [
      avgParagraph > 80
        ? "Paragraphs are long; consider splitting them."
        : "Paragraph lengths look healthy.",
      images === 0
        ? "No images found; consider adding visuals."
        : "Has supporting images.",
      headings === 0
        ? "Missing headings; add subheads for scannability."
        : "Good heading structure.",
    ],
  };
}

// Register the tools using decorators with explicit parameter definitions
(0, opal_tools_sdk_1.tool)({
    name: 'contentdensityevaluator',
    description: 'Analyses a web page for content density',
    parameters: [
        {
            name: 'url',
            type: opal_tools_sdk_1.ParameterType.String,
            description: 'URL to analyse',
            required: true
        },
    ]
})(contentdensityevaluator);

// Register the tools using decorators with explicit parameter definitions
(0, opal_tools_sdk_1.tool)({
    name: 'sgcgreeting',
    description: 'Greets a person in a random language (English, Spanish, or French)',
    parameters: [
        {
            name: 'name',
            type: opal_tools_sdk_1.ParameterType.String,
            description: 'Name of the person to greet',
            required: true
        },
        {
            name: 'language',
            type: opal_tools_sdk_1.ParameterType.String,
            description: 'Language for greeting (defaults to random)',
            required: false
        }
    ]
})(sgcgreeting);
(0, opal_tools_sdk_1.tool)({
    name: 'sgctodays-date',
    description: 'Returns today\'s date in the specified format',
    parameters: [
        {
            name: 'format',
            type: opal_tools_sdk_1.ParameterType.String,
            description: 'Date format (defaults to ISO format)',
            required: false
        }
    ]
})(sgctodaysDate);
// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Discovery endpoint: http://localhost:${PORT}/discovery`);
});
