package vn.medcheck;

import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/ai")
public class AiController {
  private static final String SAFETY="Thông tin chỉ mang tính tham khảo, không thay thế tư vấn của bác sĩ hoặc dược sĩ.";
  private final JdbcTemplate db; private final AuthService auth;
  public AiController(JdbcTemplate db,AuthService auth){this.db=db;this.auth=auth;}
  public record GenerateRequest(String question,String input,String source,Long historyDetailId){}
  public record Decision(Long id,String reason){}
  private AuthService.User user(String h){return auth.authenticate(h);}
  private void staff(AuthService.User u){if(!Set.of("DUOC_SI","BAC_SI","ADMIN").contains(u.role()))throw new SecurityException("Bạn không có quyền duyệt nội dung AI");}

  @PostMapping("/generate") Object generate(@RequestHeader("Authorization") String h,@RequestBody GenerateRequest r){
    var u=user(h);if(r.input()==null||r.input().isBlank())throw new IllegalArgumentException("Cần cung cấp cảnh báo từ database để giải thích");
    String source=Set.of("QuyTacCanhBao","CanhBaoDiUng_HoatChat","TuongTacHoatChat").contains(r.source())?r.source():"QuyTacCanhBao";
    String answer="Diễn giải dễ hiểu: "+r.input().trim()+" Bạn không nên tự thay đổi thuốc hoặc liều dùng; hãy trao đổi với bác sĩ/dược sĩ nếu cần quyết định điều trị.";
    db.update("insert into GoiYAI(MaTaiKhoan,MaChiTietLichSu,NoiDungGoc,NoiDungAI,LoaiTacVu,NguonDuLieu,TrangThai) values(?,?,?,?,?,?,'ChoDuyet')",u.id(),r.historyDetailId(),r.input(),answer,"EXPLAIN_WARNING",source);
    db.update("insert into NhatKyAI(MaTaiKhoan,CauHoi,CauTraLoi,LoaiTacVu,DuLieuDauVao,NguonDuLieuSuDung,MucDoTinCay,CanhBaoAnToan) values(?,?,?,?,?,?,?,?)",u.id(),r.question(),answer,"EXPLAIN_WARNING",r.input(),source,85,SAFETY);
    long id=db.queryForObject("select max(MaGoiY) from GoiYAI where MaTaiKhoan=?",Long.class,u.id());
    return Map.of("id",id,"status","ChoDuyet","message","Nội dung đã được tạo và đang chờ nhân viên chuyên môn duyệt","safety",SAFETY);
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
