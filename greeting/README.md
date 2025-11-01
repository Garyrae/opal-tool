# Sample TypeScript Tools Service

This is a sample tools service for Opal using the TypeScript SDK. It provides two tools:

1. **Greeting Tool**: Greets a person in a random language (English, Spanish, or French)
2. **Today's Date Tool**: Returns today's date in the specified format

## Running the Service

### Local Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Or build and run
npm run build
npm start
```

### Docker

```bash
# Build the Docker image
docker build -t opal-sample-tools-typescript .

# Run the container
docker run -p 3000:3000 opal-sample-tools-typescript
```

## Testing the Service

Once the service is running, you can access:

- Discovery endpoint: http://localhost:3000/discovery
- Tools endpoints:
  - Greeting tool: http://localhost:3000/tools/greeting
  - Today's date tool: http://localhost:3000/tools/todays-date

## Example Requests

### Greeting Tool

```bash
curl -X POST http://localhost:3000/tools/greeting \
  -H "Content-Type: application/json" \
  -d '{"name":"John"}'
```

Response:
```json
{
  "greeting": "Hello, John! How are you?",
  "language": "english"
}
```

### Today's Date Tool

```bash
curl -X POST http://localhost:3000/tools/todays-date \
  -H "Content-Type: application/json" \
  -d '{"format":"%B %d, %Y"}'
```

Response:
```json
{
  "date": "March 18, 2023",
  "format": "%B %d, %Y",
  "timestamp": 1679145600.0
}
```
