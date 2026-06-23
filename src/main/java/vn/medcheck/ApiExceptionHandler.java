package vn.medcheck;

import java.util.Map;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestControllerAdvice
public class ApiExceptionHandler {
  @ExceptionHandler(SecurityException.class) ResponseEntity<?> security(SecurityException e){ return ResponseEntity.status(401).body(Map.of("message",e.getMessage())); }
  @ExceptionHandler(ForbiddenException.class) ResponseEntity<?> forbidden(ForbiddenException e){ return ResponseEntity.status(403).body(Map.of("message",e.getMessage())); }
  @ExceptionHandler({IllegalArgumentException.class, org.springframework.dao.DataIntegrityViolationException.class}) ResponseEntity<?> bad(Exception e){ return ResponseEntity.badRequest().body(Map.of("message",e.getMessage())); }
  @ExceptionHandler(Exception.class) ResponseEntity<?> other(Exception e){ e.printStackTrace(); return ResponseEntity.status(500).body(Map.of("message","Có lỗi xảy ra, vui lòng thử lại")); }
}
