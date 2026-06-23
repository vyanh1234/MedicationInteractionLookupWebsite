package vn.medcheck;

import java.util.*;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/ai")
public class AiController {
  private static final String SAFETY="Thông tin chỉ mang tính tham khảo, không thay thế tư vấn của bác sĩ hoặc dược sĩ.";
  private final JdbcTemplate db; private final AuthService auth;

  @Value("${app.gemini-api-key:}")
  private String geminiApiKey;

  public AiController(JdbcTemplate db,AuthService auth){this.db=db;this.auth=auth;}
  public record GenerateRequest(String question,String input,String source,Long historyDetailId){}
  public record Decision(Long id,String reason){}
  public record ChatRequest(String message, List<Map<String, Object>> history, String warningContext){}

  private AuthService.User user(String h){return auth.authenticate(h);}
  private void staff(AuthService.User u){if(!Set.of("DUOC_SI","BAC_SI","ADMIN").contains(u.role()))throw new SecurityException("Bạn không có quyền duyệt nội dung AI");}

  private String getPatientContext(long userId) {
    try {
      List<Long> patientIds = db.queryForList("select MaBenhNhan from BenhNhan where MaTaiKhoan=?", Long.class, userId);
      if (patientIds.isEmpty()) {
        return "Người dùng hiện tại là nhân viên y tế hoặc quản trị viên (không có hồ sơ bệnh lý cá nhân).";
      }
      long patientId = patientIds.getFirst();
      
      var basicList = db.queryForList("select HoTen, NgaySinh, GioiTinh, ChieuCao, CanNang from BenhNhan where MaBenhNhan=?", patientId);
      String info = "Không có thông tin cơ bản";
      if (!basicList.isEmpty()) {
        var p = basicList.getFirst();
        info = String.format("Họ tên: %s, Ngày sinh: %s, Giới tính: %s, Chiều cao: %s cm, Cân nặng: %s kg",
          p.get("HoTen") != null ? p.get("HoTen") : "Chưa rõ",
          p.get("NgaySinh") != null ? p.get("NgaySinh") : "Chưa rõ",
          p.get("GioiTinh") != null ? p.get("GioiTinh") : "Chưa rõ",
          p.get("ChieuCao") != null ? p.get("ChieuCao") : "Chưa rõ",
          p.get("CanNang") != null ? p.get("CanNang") : "Chưa rõ"
        );
      }

      List<String> diseases = db.queryForList("select b.TenBenh from BenhNhan_BenhNen x join BenhNen b on b.MaBenhNen=x.MaBenhNen where x.MaBenhNhan=?", String.class, patientId);
      String diseasesStr = diseases.isEmpty() ? "Không có" : String.join(", ", diseases);

      List<String> allergies = db.queryForList("select d.TenDiUng from BenhNhan_DiUng x join DiUng d on d.MaDiUng=x.MaDiUng where x.MaBenhNhan=?", String.class, patientId);
      String allergiesStr = allergies.isEmpty() ? "Không có" : String.join(", ", allergies);

      List<String> drugs = db.queryForList("select t.TenThuoc from BenhNhan_ThuocDangDung x join Thuoc t on t.MaThuoc=x.MaThuoc where x.MaBenhNhan=?", String.class, patientId);
      String drugsStr = drugs.isEmpty() ? "Không có" : String.join(", ", drugs);

      return String.format(
        "HỒ SƠ SỨC KHỎE CỦA BỆNH NHÂN:\n- %s\n- Bệnh nền đang mắc: %s\n- Dị ứng thuốc/hoạt chất: %s\n- Các thuốc đang dùng: %s",
        info, diseasesStr, allergiesStr, drugsStr
      );
    } catch (Exception e) {
      return "Không thể tải hồ sơ sức khỏe: " + e.getMessage();
    }
  }

  private String buildSystemPrompt(String patientContext) {
    return "Bạn là MedCheck AI - Trợ lý ảo y khoa thông minh, chuyên nghiệp, hỗ trợ tra cứu an toàn thuốc cho bệnh nhân.\n" +
           "Nhiệm vụ của bạn là giải thích các cảnh báo tương tác thuốc, dị ứng và bệnh nền một cách khoa học, rõ ràng và dễ hiểu cho người bình thường.\n" +
           "Dưới đây là thông tin y tế của người dùng hiện tại:\n" +
           patientContext + "\n\n" +
           "QUY TẮC PHẢN HỒI:\n" +
           "1. Luôn ưu tiên đưa ra lời khuyên an toàn, ngắn gọn, súc tích (khoảng 100-150 từ).\n" +
           "2. Giải thích rõ ràng cơ chế hoặc lý do tại sao có cảnh báo (ví dụ: ảnh hưởng đến thận, dạ dày, làm tăng huyết áp...).\n" +
           "3. Luôn kết thúc câu trả lời bằng lời nhắc nhở an toàn: \"" + SAFETY + "\"\n" +
           "4. Nếu người dùng hỏi các câu hỏi không liên quan đến y tế, sức khỏe hoặc thuốc, hãy từ chối lịch sự và đề nghị họ tập trung vào chủ đề sức khỏe.";
  }

  private String callGemini(String systemPrompt, List<Map<String, Object>> contents) {
    if (geminiApiKey == null || geminiApiKey.isBlank()) {
      return "[DEMO MODE] Trợ lý AI đang hoạt động ở chế độ Demo (chưa cấu hình GEMINI_API_KEY).\n\n"
           + "Dưới đây là thông tin y tế của bạn và phân tích mẫu:\n"
           + systemPrompt.replace("Bạn là MedCheck AI - Trợ lý ảo y khoa thông minh, chuyên nghiệp, hỗ trợ tra cứu an toàn thuốc cho bệnh nhân.", "")
                         .replace("Nhiệm vụ của bạn là giải thích các cảnh báo tương tác thuốc, dị ứng và bệnh nền một cách khoa học, rõ ràng và dễ hiểu cho người bình thường.", "")
                         .replace("Hãy trả lời câu hỏi của bệnh nhân một cách ngắn gọn, súc tích (dưới 150 từ), dễ hiểu cho người dân thường. Luôn thêm câu lưu ý: '" + SAFETY + "' ở cuối.", "")
                         .trim()
           + "\n\n[Trợ lý AI]: Hệ thống đã nhận diện câu hỏi của bạn. Bệnh nhân có nguy cơ gặp tương tác hoặc ảnh hưởng xấu do các bệnh lý nền sẵn có. Bạn nên tham vấn bác sĩ trực tiếp điều trị trước khi sử dụng bất kỳ loại thuốc mới nào.";
    }
    try {
      var mapper = new ObjectMapper();
      Map<String, Object> requestBody = new HashMap<>();
      requestBody.put("systemInstruction", Map.of("parts", List.of(Map.of("text", systemPrompt))));
      requestBody.put("contents", contents);
      String jsonInput = mapper.writeValueAsString(requestBody);

      var client = HttpClient.newHttpClient();
      var request = HttpRequest.newBuilder()
          .uri(URI.create("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + geminiApiKey))
          .header("Content-Type", "application/json")
          .POST(HttpRequest.BodyPublishers.ofString(jsonInput, StandardCharsets.UTF_8))
          .build();

      var response = client.send(request, HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() == 200) {
        var node = mapper.readTree(response.body());
        var text = node.path("candidates").path(0).path("content").path("parts").path(0).path("text").asText();
        if (text != null && !text.isBlank()) {
          return text.trim();
        }
      }
      return "Lỗi phản hồi AI (Status " + response.statusCode() + "): " + response.body();
    } catch (Exception e) {
      return "Lỗi kết nối AI: " + e.getMessage();
    }
  }

  @PostMapping("/generate") Object generate(@RequestHeader("Authorization") String h,@RequestBody GenerateRequest r){
    var u=user(h);if(r.input()==null||r.input().isBlank())throw new IllegalArgumentException("Cần cung cấp cảnh báo từ database để giải thích");
    String source=Set.of("QuyTacCanhBao","CanhBaoDiUng_HoatChat","TuongTacHoatChat").contains(r.source())?r.source():"QuyTacCanhBao";
    
    // Call Gemini API to generate real explanation
    String patientContext = getPatientContext(u.id());
    String systemPrompt = buildSystemPrompt(patientContext);
    String prompt = "Hãy giải thích cảnh báo y tế này một cách dễ hiểu cho người bệnh: '" + r.input().trim() + "'";
    String answer = callGemini(systemPrompt, List.of(Map.of("role", "user", "parts", List.of(Map.of("text", prompt)))));

    db.update("insert into GoiYAI(MaTaiKhoan,MaChiTietLichSu,NoiDungGoc,NoiDungAI,LoaiTacVu,NguonDuLieu,TrangThai) values(?,?,?,?,?,?,'ChoDuyet')",u.id(),r.historyDetailId(),r.input(),answer,"EXPLAIN_WARNING",source);
    db.update("insert into NhatKyAI(MaTaiKhoan,CauHoi,CauTraLoi,LoaiTacVu,DuLieuDauVao,NguonDuLieuSuDung,MucDoTinCay,CanhBaoAnToan) values(?,?,?,?,?,?,?,?)",u.id(),r.question(),answer,"EXPLAIN_WARNING",r.input(),source,85,SAFETY);
    long id=db.queryForObject("select max(MaGoiY) from GoiYAI where MaTaiKhoan=?",Long.class,u.id());
    return Map.of("id",id,"status","ChoDuyet","message","Nội dung đã được tạo và đang chờ nhân viên chuyên môn duyệt","safety",SAFETY);
  }

  @PostMapping("/chat") Object chat(@RequestHeader("Authorization") String h, @RequestBody ChatRequest r) {
    var u = user(h);
    if (r.message() == null || r.message().isBlank()) {
      throw new IllegalArgumentException("Nội dung tin nhắn không được để trống");
    }
    
    String patientContext = getPatientContext(u.id());
    String systemPrompt = buildSystemPrompt(patientContext);
    
    List<Map<String, Object>> geminiContents = new ArrayList<>();
    if (r.history() != null) {
      for (var msg : r.history()) {
        String role = String.valueOf(msg.get("role"));
        String content = String.valueOf(msg.get("content"));
        String geminiRole = "user".equalsIgnoreCase(role) ? "user" : "model";
        geminiContents.add(Map.of("role", geminiRole, "parts", List.of(Map.of("text", content))));
      }
    }
    
    String userMsg = r.message();
    if (r.warningContext() != null && !r.warningContext().isBlank()) {
      userMsg = "[Ngữ cảnh cảnh báo đang xem: " + r.warningContext() + "]\n" + userMsg;
    }
    geminiContents.add(Map.of("role", "user", "parts", List.of(Map.of("text", userMsg))));
    
    String answer = callGemini(systemPrompt, geminiContents);
    
    try {
      db.update("insert into NhatKyAI(MaTaiKhoan,CauHoi,CauTraLoi,LoaiTacVu,DuLieuDauVao,NguonDuLieuSuDung,MucDoTinCay,CanhBaoAnToan) values(?,?,?,?,?,?,?,?)",
        u.id(), r.message(), answer, "CHAT", r.warningContext() != null ? r.warningContext() : "", "GeminiAPI", 90, SAFETY);
    } catch (Exception e) {
      System.err.println("Lỗi ghi nhật ký AI: " + e.getMessage());
    }
    
    return Map.of("answer", answer, "safety", SAFETY);
  }

  @GetMapping("/pending") Object pending(@RequestHeader("Authorization") String h){staff(user(h));return pendingRows();}
  @PostMapping("/approve") Object approve(@RequestHeader("Authorization") String h,@RequestBody Decision d){return decide(h,d.id(),d.reason(),"DaDuyet");}
  @PostMapping("/reject") Object reject(@RequestHeader("Authorization") String h,@RequestBody Decision d){return decide(h,d.id(),d.reason(),"TuChoi");}
  @GetMapping("/approved") Object approved(@RequestHeader("Authorization") String h){var u=user(h);return db.queryForList("select MaGoiY id,NoiDungAI content,NguonDuLieu dataSource,NgayDuyet approvedAt from GoiYAI where MaTaiKhoan=? and TrangThai='DaDuyet' order by NgayDuyet desc",u.id());}
  @GetMapping("/suggestions/pending") Object suggestionPending(@RequestHeader("Authorization") String h){staff(user(h));return pendingRows();}
  @GetMapping("/suggestions/{id}") Object suggestion(@RequestHeader("Authorization") String h,@PathVariable long id){staff(user(h));var x=db.queryForList("select * from GoiYAI where MaGoiY=?",id);if(x.isEmpty())throw new IllegalArgumentException("Không tìm thấy gợi ý AI");return x.getFirst();}
  @PostMapping("/suggestions/{id}/approve") Object suggestionApprove(@RequestHeader("Authorization") String h,@PathVariable long id,@RequestBody(required=false) Map<String,Object>b){return decide(h,id,b==null?null:String.valueOf(b.get("reason")),"DaDuyet");}
  @PostMapping("/suggestions/{id}/reject") Object suggestionReject(@RequestHeader("Authorization") String h,@PathVariable long id,@RequestBody(required=false) Map<String,Object>b){return decide(h,id,b==null?null:String.valueOf(b.get("reason")),"TuChoi");}
  private Object pendingRows(){return db.queryForList("select g.MaGoiY id,t.HoTen requester,g.NoiDungGoc originalContent,g.NoiDungAI aiContent,g.LoaiTacVu taskType,g.NguonDuLieu dataSource,g.TrangThai status,g.NgayTao createdAt from GoiYAI g left join TaiKhoan t on t.MaTaiKhoan=g.MaTaiKhoan where g.TrangThai='ChoDuyet' order by g.NgayTao");}
  private Object decide(String h,long id,String reason,String status){var u=user(h);staff(u);int n=db.update("update GoiYAI set TrangThai=?,NguoiDuyet=?,LyDoXuLy=?,NgayDuyet=current_timestamp where MaGoiY=? and TrangThai='ChoDuyet'",status,u.id(),reason,id);if(n==0)throw new IllegalArgumentException("Gợi ý không còn ở trạng thái chờ duyệt");return Map.of("message",status.equals("DaDuyet")?"Đã duyệt nội dung AI":"Đã từ chối nội dung AI");}
}

