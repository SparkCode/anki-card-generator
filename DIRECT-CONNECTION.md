# Direct Connection to AnkiConnect

This document explains how to configure AnkiConnect to allow direct connections from the React application without a proxy server.

## Background

The Anki Card Generator application communicates directly with AnkiConnect. Since the application runs in a web browser, it needs proper CORS (Cross-Origin Resource Sharing) configuration to connect to AnkiConnect.

## Configuration Steps

### 1. Configure AnkiConnect

You need to update the AnkiConnect configuration to allow requests from the React application's origin:

1. Open Anki
2. Go to **Tools → Add-ons → AnkiConnect → Config**
3. Update the `webCorsOriginList` to include the origins where your React app runs:

```json
{
  "webCorsOriginList": [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://your-deployed-site.com"  // If you deploy your app
  ]
}
```

4. Click **Save**
5. Restart Anki

### 2. Running the Application

With AnkiConnect properly configured, you can now run the React app without the proxy server:

```bash
npm start
```

The application will connect directly to AnkiConnect at http://127.0.0.1:8765.

## Troubleshooting

### CORS Errors

If you see CORS errors in your browser console, such as:

```
Access to fetch at 'http://127.0.0.1:8765/' from origin 'http://localhost:3000' has been blocked by CORS policy
```

This means AnkiConnect is not properly configured to allow requests from your application's origin. Double-check that:

1. You've updated the `webCorsOriginList` in AnkiConnect's config
2. You've included the exact origin of your application (including http/https and port)
3. You've restarted Anki after updating the configuration

### Connection Errors

If you see connection errors:

1. Make sure Anki is running
2. Make sure AnkiConnect add-on is installed (add-on code: 2055492159)
3. Check that no firewalls or security software are blocking the connection
4. Ensure AnkiConnect is listening on the default port (8765)
