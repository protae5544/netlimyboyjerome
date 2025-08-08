package com.example.docs;

import com.example.docs.security.TokenValidator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;

@RestController
public class DocumentController {

  private static final Logger log = LoggerFactory.getLogger(DocumentController.class);

  @Value("${app.storage-root:./storage/pdf}")
  private String storageRoot;

  @GetMapping("/api/pdf")
  public ResponseEntity<?> getPdf(
      @RequestParam("id") String id,
      @RequestParam(value = "token", required = false) String token,
      @RequestHeader(value = "If-None-Match", required = false) String ifNoneMatch
  ) throws IOException {

    if (id == null || id.isBlank()) {
      return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Missing id");
    }

    // Optional token validation for future enhancement
    if (token != null && !TokenValidator.isValid(token, id)) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid token");
    }

    String safeId = id.replaceAll("[^a-zA-Z0-9._-]", "");
    if (safeId.isBlank()) {
      return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid id");
    }

    Path rootPath = Paths.get(storageRoot).toAbsolutePath().normalize();
    Path pdfPath = rootPath.resolve(safeId + ".pdf").normalize();

    if (!pdfPath.startsWith(rootPath)) {
      log.warn("Path traversal blocked for id={}", id);
      return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Forbidden");
    }

    if (!Files.exists(pdfPath) || !Files.isRegularFile(pdfPath)) {
      return ResponseEntity.status(HttpStatus.NOT_FOUND).body("File not found");
    }

    long size = Files.size(pdfPath);
    long lastModified = Files.getLastModifiedTime(pdfPath).toMillis();
    String etag = "\"" + size + "-" + lastModified + "\"";

    if (etag.equals(ifNoneMatch)) {
      return ResponseEntity.status(HttpStatus.NOT_MODIFIED)
          .eTag(etag)
          .build();
    }

    InputStream is = Files.newInputStream(pdfPath, StandardOpenOption.READ);
    InputStreamResource body = new InputStreamResource(is);

    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_PDF);
    headers.setContentDisposition(ContentDisposition.inline().filename(safeId + ".pdf").build());
    headers.setCacheControl(CacheControl.noCache().mustRevalidate());
    headers.setETag(etag);
    headers.setLastModified(lastModified);
    // ประกาศรองรับ range (optional - ยังไม่ได้ทำ partial responses)
    headers.add("Accept-Ranges", "bytes");

    log.info("Serving PDF id='{}' path='{}' size={}B", id, pdfPath, size);

    return ResponseEntity.ok()
        .headers(headers)
        .contentLength(size)
        .body(body);
  }
}
