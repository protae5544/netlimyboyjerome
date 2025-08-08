package com.example.pdf;

import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Map;
import java.util.LinkedHashMap;
import java.util.concurrent.Executors;

/**
 * Minimal HTTP server that serves original PDF files from server storage.
 * - Endpoint: GET /api/pdf?id={docId}
 * - Storage root: env STORAGE_ROOT (default: storage/pdf)
 * - Static root: env STATIC_ROOT (default: .)
 * - Port: env PORT (default: 8080)
 * This server streams the original PDF without any conversion to preserve the source layout.
 */
public class DocumentServer {

    private static final int DEFAULT_PORT = 8080;
    private static final String DEFAULT_STORAGE_ROOT = "storage/pdf";
    private static final String DEFAULT_STATIC_ROOT = ".";
    private static final String HEADER_CONTENT_TYPE = "Content-Type";
    private static final String HEADER_CACHE_CONTROL = "Cache-Control";
    private static final String CACHE_CONTROL_NO_CACHE = "no-cache, must-revalidate";
    private static final DateTimeFormatter RFC_1123 =
            DateTimeFormatter.RFC_1123_DATE_TIME.withLocale(Locale.US).withZone(ZoneId.of("GMT"));

    public static void main(String[] args) throws Exception {
        int port = getEnvInt("PORT", DEFAULT_PORT);
        Path storageRoot = Path.of(getEnv("STORAGE_ROOT", DEFAULT_STORAGE_ROOT)).toAbsolutePath().normalize();
        if (!Files.exists(storageRoot)) {
            Files.createDirectories(storageRoot);
        }
        Path staticRoot = Path.of(getEnv("STATIC_ROOT", DEFAULT_STATIC_ROOT)).toAbsolutePath().normalize();

        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
        server.createContext("/api/pdf", new PdfStreamingHandler(storageRoot));
        server.createContext("/", new StaticFileHandler(staticRoot));
        server.setExecutor(Executors.newFixedThreadPool(Math.max(4, Runtime.getRuntime().availableProcessors())));

        System.out.println("[PDF-SERVER] Starting on port " + port);
        System.out.println("[PDF-SERVER] Storage root: " + storageRoot);
        System.out.println("[PDF-SERVER] Static root: " + staticRoot);
        System.out.println("[PDF-SERVER] Endpoint: GET /api/pdf?id={docId}");
        System.out.println("[PDF-SERVER] Static:   GET / -> index.html");
        server.start();

        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            System.out.println("[PDF-SERVER] Shutting down...");
            server.stop(0);
        }));
    }

    // -------------------- Shared utilities (pulled up) --------------------

    private static String getEnv(String key, String def) {
        String val = System.getenv(key);
        return (val == null || val.isBlank()) ? def : val;
    }

    private static int getEnvInt(String key, int def) {
        String val = System.getenv(key);
        if (val == null) return def;
        try {
            return Integer.parseInt(val.trim());
        } catch (Exception e) {
            return def;
        }
    }

    static void sendPlain(HttpExchange exchange, int status, String message) throws IOException {
        byte[] body = message.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set(HEADER_CONTENT_TYPE, "text/plain; charset=UTF-8");
        exchange.sendResponseHeaders(status, body.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(body);
        }
    }

    private static void sendErrorAndClose(HttpExchange exchange, int status, String message) {
        try {
            sendPlain(exchange, status, message);
        } catch (IOException ignore) {
            // Best-effort; fall through to close
        } finally {
            exchange.close();
        }
    }

    private static boolean isGetMethod(HttpExchange exchange) {
        return "GET".equalsIgnoreCase(exchange.getRequestMethod());
    }

    private static String normalizeRequestPath(String requestPath) {
        if (requestPath == null || requestPath.isBlank() || "/".equals(requestPath)) {
            return "/index.html";
        }
        return requestPath;
    }

    private static Path safeResolveWithinRoot(Path root, String requestPath) {
        // Basic normalization and traversal defense
        String relativeSafePath = requestPath.replace("\\", "/").replace("..", "");
        if (relativeSafePath.startsWith("/")) {
            relativeSafePath = relativeSafePath.substring(1);
        }
        return root.resolve(relativeSafePath).normalize();
    }

    private static String guessContentType(Path file) {
        String name = file.getFileName().toString().toLowerCase(Locale.ROOT);
        if (name.endsWith(".html") || name.endsWith(".htm")) return "text/html; charset=UTF-8";
        if (name.endsWith(".js")) return "application/javascript; charset=UTF-8";
        if (name.endsWith(".css")) return "text/css; charset=UTF-8";
        if (name.endsWith(".svg")) return "image/svg+xml";
        if (name.endsWith(".json")) return "application/json; charset=UTF-8";
        if (name.endsWith(".png")) return "image/png";
        if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
        if (name.endsWith(".webp")) return "image/webp";
        if (name.endsWith(".ico")) return "image/x-icon";
        if (name.endsWith(".pdf")) return "application/pdf";
        return "application/octet-stream";
    }

    static Map<String, String> parseQuery(String rawQuery) {
        Map<String, String> result = new LinkedHashMap<>();
        if (rawQuery == null || rawQuery.isBlank()) return result;
        String[] pairs = rawQuery.split("&");
        for (String pair : pairs) {
            int idx = pair.indexOf('=');
            String key = idx >= 0 ? pair.substring(0, idx) : pair;
            String val = idx >= 0 ? pair.substring(1 + idx) : "";
            // URL-decode using UTF-8
            String decodedKey = URLDecoder.decode(key, StandardCharsets.UTF_8);
            String decodedVal = URLDecoder.decode(val, StandardCharsets.UTF_8);
            result.put(decodedKey, decodedVal);
        }
        return result;
    }

    private static void sendFile(HttpExchange exchange, Path file, String contentType, Map<String, String> extraHeaders) throws IOException {
        Headers headers = exchange.getResponseHeaders();
        headers.set(HEADER_CONTENT_TYPE, contentType);
        headers.set(HEADER_CACHE_CONTROL, CACHE_CONTROL_NO_CACHE);
        if (extraHeaders != null) {
            for (Map.Entry<String, String> e : extraHeaders.entrySet()) {
                headers.set(e.getKey(), e.getValue());
            }
        }
        long size = Files.size(file);
        exchange.sendResponseHeaders(200, size);
        try (OutputStream os = exchange.getResponseBody();
             InputStream is = Files.newInputStream(file, StandardOpenOption.READ)) {
            is.transferTo(os);
        }
    }

    // -------------------- Handlers --------------------

    static class StaticFileHandler implements HttpHandler {
        private final Path staticRoot;

        StaticFileHandler(Path staticRoot) {
            this.staticRoot = staticRoot;
        }

        @Override
        public void handle(HttpExchange exchange) throws IOException {
            try {
                if (!isGetMethod(exchange)) {
                    sendPlain(exchange, 405, "Method Not Allowed");
                    return;
                }

                String requestPath = normalizeRequestPath(exchange.getRequestURI().getPath());
                Path file = safeResolveWithinRoot(staticRoot, requestPath);

                if (!file.startsWith(staticRoot) || !Files.exists(file) || Files.isDirectory(file)) {
                    sendPlain(exchange, 404, "Not Found");
                    return;
                }

                sendFile(exchange, file, guessContentType(file), null);
            } catch (Exception e) {
                sendErrorAndClose(exchange, 500, "Internal Server Error");
            } finally {
                exchange.close();
            }
        }
    }

    static class PdfStreamingHandler implements HttpHandler {
        private final Path storageRoot;

        PdfStreamingHandler(Path storageRoot) {
            this.storageRoot = storageRoot;
        }

        @Override
        public void handle(HttpExchange exchange) throws IOException {
            try {
                if (!isGetMethod(exchange)) {
                    sendPlain(exchange, 405, "Method Not Allowed");
                    return;
                }

                Map<String, String> params = parseQuery(exchange.getRequestURI().getRawQuery());
                String id = params.get("id");
                if (id == null || id.isBlank()) {
                    sendPlain(exchange, 400, "Missing required parameter: id");
                    return;
                }

                String safeId = id.replaceAll("[^a-zA-Z0-9._-]", "");
                if (safeId.isBlank()) {
                    sendPlain(exchange, 400, "Invalid id");
                    return;
                }

                Path pdfPath = storageRoot.resolve(safeId + ".pdf").normalize();
                if (!pdfPath.startsWith(storageRoot)) {
                    sendPlain(exchange, 400, "Invalid path");
                    return;
                }
                if (!Files.exists(pdfPath) || !Files.isRegularFile(pdfPath)) {
                    sendPlain(exchange, 404, "PDF not found");
                    return;
                }

                long size = Files.size(pdfPath);
                long lastModifiedMillis = Files.getLastModifiedTime(pdfPath).toMillis();
                String etag = "\"" + size + "-" + lastModifiedMillis + "\"";

                String ifNoneMatch = exchange.getRequestHeaders().getFirst("If-None-Match");
                if (etag.equals(ifNoneMatch)) {
                    Headers res = exchange.getResponseHeaders();
                    res.set("ETag", etag);
                    res.set("Last-Modified", RFC_1123.format(Instant.ofEpochMilli(lastModifiedMillis)));
                    res.set(HEADER_CACHE_CONTROL, CACHE_CONTROL_NO_CACHE);
                    exchange.sendResponseHeaders(304, -1);
                    return;
                }

                Headers resHeaders = exchange.getResponseHeaders();
                resHeaders.set("Content-Disposition", "inline; filename=\"" + safeId + ".pdf\"");
                resHeaders.set("ETag", etag);
                resHeaders.set("Last-Modified", RFC_1123.format(Instant.ofEpochMilli(lastModifiedMillis)));

                sendFile(exchange, pdfPath, "application/pdf", null);
            } catch (Exception e) {
                sendErrorAndClose(exchange, 500, "Internal Server Error");
            } finally {
                exchange.close();
            }
        }
    }
}
