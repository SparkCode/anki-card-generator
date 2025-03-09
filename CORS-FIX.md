# CORS Fix for AnkiConnect

This document explains how to fix the CORS (Cross-Origin Resource Sharing) issue between the React application and AnkiConnect.

## The Problem

The application encounters a CORS error when trying to communicate with AnkiConnect:

```
Access to fetch at 'http://127.0.0.1:8765/' from origin 'http://localhost:3000' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: The 'Access-Control-Allow-Origin' header has a value 'http://localhost' that is not equal to the supplied origin.
```

This happens because AnkiConnect is configured to allow requests from `http://localhost` but our React app is running on `http://localhost:3000`.

## The Solution

We've implemented a proxy server to act as a middleman between the React app and AnkiConnect. This proxy handles the CORS headers properly.

## How to Use

### 1. Install Dependencies

First, install the required dependencies:

```bash
npm install
```

This will install the newly added dependencies including `express`, `cors`, and `http-proxy-middleware`, along with `concurrently` as a dev dependency.

### 2. Run the Application

You can now run both the React app and the proxy server together:

```bash
npm run dev
```

This command starts:
- The React app on `http://localhost:3000`
- The proxy server on `http://localhost:8766`

### 3. How It Works

- The React app (through AnkiService.js) now sends requests to `http://localhost:8766/anki` instead of directly to AnkiConnect.
- The proxy server forwards these requests to AnkiConnect at `http://127.0.0.1:8765` and adds the proper CORS headers to the response.
- This allows the React app to communicate with AnkiConnect without CORS errors.

### 4. Running Separately (if needed)

You can also run the proxy server separately:

```bash
npm run proxy
```

And in another terminal, run the React app:

```bash
npm start
```

## Configuring AnkiConnect (Optional)

For additional security, you can configure AnkiConnect to only accept requests from the proxy server. In Anki, go to:

1. Tools → Add-ons → AnkiConnect → Config
2. Update the `webCorsOriginList` to include only `http://localhost:8766`:

```json
{
  "webCorsOriginList": ["http://localhost:8766"]
}
```

3. Restart Anki for the changes to take effect.

## Troubleshooting

If you still experience CORS issues:

1. Make sure Anki is running with AnkiConnect installed
2. Ensure both the React app and proxy server are running
3. Check the browser console for errors
4. Verify that AnkiConnect is properly configured
