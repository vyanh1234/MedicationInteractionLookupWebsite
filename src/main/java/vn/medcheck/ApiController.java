package vn.medcheck;

import java.util.*;
import java.text.Normalizer;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api")
public class ApiController {
  private final JdbcTemplate db; private final AuthService auth;
  public ApiController(JdbcTemplate db,AuthService auth){this.db=db;this.auth=auth;}
  private AuthService.User user(String h){return auth.authenticate(h);}
  private long patient(long account){return db.queryForObject("select MaBenhNhan from BenhNhan where MaTaiKhoan=?",Long.class,account);}
  private void staff(AuthService.User u){if(!Set.of("DUOC_SI","BAC_SI","ADMIN").contains(u.role()))throw new SecurityException("Bạn không có quyền thực hiện thao tác này");}
  private List<Map<String,Object>> list(String sql,Object...args){return db.queryForList(sql,args);}

  @GetMapping("/drugs") Object drugs(@RequestParam(defaultValue="") String keyword){
    return list("select t.MaThuoc id, t.TenThuoc, t.TenQuocTe, t.SoDangKy, t.LoaiThuoc, t.DangBaoChe, t.DuongDung, t.HamLuong, t.NhaSanXuat, t.MoTa, t.HuongDanSuDung, t.LieuDungThamKhao, t.TacDungPhu, t.CanKeDon, STUFF((SELECT ', ' + h.TenHoatChat FROM Thuoc_HoatChat th JOIN HoatChat h ON h.MaHoatChat = th.MaHoatChat WHERE th.MaThuoc = t.MaThuoc FOR XML PATH('')), 1, 2, '') as HoatChat from Thuoc t where t.TrangThai=1 and lower(t.TenThuoc) like lower(?) order by t.TenThuoc", "%"+keyword+"%");
  }
  @GetMapping("/drugs/{id}") Object drug(@PathVariable long id){
    var x=list("select * from Thuoc where MaThuoc=?", id);
    if(x.isEmpty()) throw new IllegalArgumentException("Không tìm thấy thuốc"); 
    return x.getFirst();
  }
  @GetMapping("/drugs/autocomplete") Object autocomplete(@RequestParam String keyword){
    String key=fold(keyword==null?"":keyword.trim()); if(key.length()<2)return Map.of("items",List.of());
    var rows=list("select t.MaThuoc id,t.MaThuoc maThuoc,t.TenThuoc tenThuoc,t.TenQuocTe tenQuocTe,t.DangBaoChe dangBaoChe,t.DuongDung duongDung,t.CanKeDon canKeDon, STUFF((SELECT ', ' + hc.TenHoatChat FROM Thuoc_HoatChat th JOIN HoatChat hc ON hc.MaHoatChat=th.MaHoatChat WHERE th.MaThuoc=t.MaThuoc FOR XML PATH('')), 1, 2, '') as hoatChat, STUFF((SELECT ', ' + tk.TenKhac FROM Thuoc_TenKhac tk WHERE tk.MaThuoc=t.MaThuoc FOR XML PATH('')), 1, 2, '') as tenKhac from Thuoc t where t.TrangThai=1");
    var items=rows.stream().map(r->new AbstractMap.SimpleEntry<>(matchRank(r,key),r)).filter(e->e.getKey()<99).sorted(Comparator.<Map.Entry<Integer,Map<String,Object>>>comparingInt(Map.Entry::getKey).thenComparing(e->String.valueOf(e.getValue().get("tenThuoc")))).limit(10).map(Map.Entry::getValue).toList();
    return Map.of("items",items);
  }
  private int matchRank(Map<String,Object> r,String key){String name=fold(String.valueOf(r.get("tenThuoc"))),alias=fold(String.valueOf(r.get("tenKhac"))),ingredient=fold(String.valueOf(r.get("hoatChat"))),international=fold(String.valueOf(r.get("tenQuocTe")));if(name.startsWith(key))return 0;if(name.contains(key)||international.contains(key))return 1;if(alias.contains(key))return 2;if(ingredient.contains(key))return 3;return 99;}
  private String fold(String value){return Normalizer.normalize(value==null?"":value,Normalizer.Form.NFD).replaceAll("\\p{M}","").replace('đ','d').replace('Đ','D').toLowerCase(Locale.ROOT);}
  @GetMapping("/diseases") Object diseases(@RequestParam(defaultValue="") String keyword){
    return list("select MaBenhNen id, TenBenh name, TenThongDung commonName, NhomBenh category, MaICD icd, MoTa description from BenhNen where TrangThai=1 and (lower(TenBenh) like lower(?) or lower(TenThongDung) like lower(?)) order by TenBenh", "%"+keyword+"%", "%"+keyword+"%");
  }
  @GetMapping("/allergies") Object allergies(@RequestParam(defaultValue="") String keyword){
    return list("select MaDiUng id, TenDiUng name, MoTa description from DiUng where TrangThai=1 and lower(TenDiUng) like lower(?) order by TenDiUng", "%"+keyword+"%");
  }

  @GetMapping("/ingredients") Object ingredients(@RequestParam(defaultValue="") String keyword){
    return list("select MaHoatChat id, TenHoatChat name, MoTa description from HoatChat where TrangThai=1 and lower(TenHoatChat) like lower(?) order by TenHoatChat", "%"+keyword+"%");
  }
  @GetMapping("/patient/profile") Object profile(@RequestHeader("Authorization") String h){var u=user(h);return list("select b.* from BenhNhan b where b.MaTaiKhoan=?",u.id()).getFirst();}
  @PutMapping("/patient/profile") Object profileUpdate(@RequestHeader("Authorization") String h,@RequestBody Map<String,Object> b){
    var u=user(h);
    db.update("update BenhNhan set HoTen=?,NgaySinh=?,GioiTinh=?,ChieuCao=?,CanNang=?,NhomMau=?,DiaChi=?,GhiChu=? where MaTaiKhoan=?",b.get("fullName"),b.get("birthDate"),b.get("gender"),b.get("height"),b.get("weight"),b.get("bloodType"),b.get("address"),b.get("note"),u.id());
    db.update("update TaiKhoan set HoTen=? where MaTaiKhoan=?", b.get("fullName"), u.id());
    return Map.of("message","Đã cập nhật hồ sơ");
  }
  @GetMapping("/patient/background-diseases") Object patientDiseases(@RequestHeader("Authorization") String h){return list("select b.MaBenhNen id,b.TenBenh name,b.MaICD icd,b.NhomBenh category,x.GhiChu note from BenhNhan_BenhNen x join BenhNen b on b.MaBenhNen=x.MaBenhNen where x.MaBenhNhan=?",patient(user(h).id()));}
  @PostMapping("/patient/background-diseases") Object addDisease(@RequestHeader("Authorization") String h,@RequestBody Map<String,Object>b){db.update("insert into BenhNhan_BenhNen values(?,?,?)",patient(user(h).id()),b.get("id"),b.get("note"));return Map.of("message","Đã thêm bệnh nền");}
  @DeleteMapping("/patient/background-diseases/{id}") Object deleteDisease(@RequestHeader("Authorization") String h,@PathVariable long id){db.update("delete from BenhNhan_BenhNen where MaBenhNhan=? and MaBenhNen=?",patient(user(h).id()),id);return Map.of("message","Đã xóa");}
  @GetMapping("/patient/allergies") Object patientAllergies(@RequestHeader("Authorization") String h){return list("select d.MaDiUng id,d.TenDiUng name,x.MucDo severity from BenhNhan_DiUng x join DiUng d on d.MaDiUng=x.MaDiUng where x.MaBenhNhan=?",patient(user(h).id()));}
  @PostMapping("/patient/allergies") Object addAllergy(@RequestHeader("Authorization") String h,@RequestBody Map<String,Object>b){db.update("insert into BenhNhan_DiUng values(?,?,?)",patient(user(h).id()),b.get("id"),b.getOrDefault("severity","Cao"));return Map.of("message","Đã thêm dị ứng");}
  @DeleteMapping("/patient/allergies/{id}") Object deleteAllergy(@RequestHeader("Authorization") String h,@PathVariable long id){db.update("delete from BenhNhan_DiUng where MaBenhNhan=? and MaDiUng=?",patient(user(h).id()),id);return Map.of("message","Đã xóa");}
  @GetMapping("/patient/current-drugs") Object currentDrugs(@RequestHeader("Authorization") String h){return list("select x.MaSuDung id,t.MaThuoc drugId,t.TenThuoc name,x.LieuDung dose,x.TanSuat frequency from BenhNhan_ThuocDangDung x join Thuoc t on t.MaThuoc=x.MaThuoc where x.MaBenhNhan=?",patient(user(h).id()));}
  @PostMapping("/patient/current-drugs") Object addCurrent(@RequestHeader("Authorization") String h,@RequestBody Map<String,Object>b){db.update("insert into BenhNhan_ThuocDangDung(MaBenhNhan,MaThuoc,LieuDung,TanSuat) values(?,?,?,?)",patient(user(h).id()),b.get("drugId"),b.get("dose"),b.get("frequency"));return Map.of("message","Đã thêm thuốc đang dùng");}
  @DeleteMapping("/patient/current-drugs/{id}") Object deleteCurrent(@RequestHeader("Authorization") String h,@PathVariable long id){db.update("delete from BenhNhan_ThuocDangDung where MaSuDung=? and MaBenhNhan=?",id,patient(user(h).id()));return Map.of("message","Đã xóa");}

  @PostMapping("/lookup/drug") Object lookup(@RequestHeader("Authorization") String h,@RequestBody Map<String,Object>b){
    var u=user(h);long p=patient(u.id());long drug=((Number)b.get("drugId")).longValue();
    var info=list("select MaThuoc id,TenThuoc name,DangBaoChe dosageForm,HamLuong strength from Thuoc where MaThuoc=?",drug); if(info.isEmpty())throw new IllegalArgumentException("Không tìm thấy thuốc");
    var ingredients=list("select hc.MaHoatChat id,hc.TenHoatChat name,th.HamLuong strength from Thuoc_HoatChat th join HoatChat hc on hc.MaHoatChat=th.MaHoatChat where th.MaThuoc=?",drug);
    var warnings=list("select N'Bệnh nền' type,q.MucDo severity,b.TenBenh subject,q.NoiDung content,q.KhuyenNghi recommendation,q.Nguon source from Thuoc_HoatChat th join QuyTacCanhBao q on q.MaHoatChat=th.MaHoatChat and q.TrangThai='DaDuyet' join BenhNhan_BenhNen pb on pb.MaBenhNen=q.MaBenhNen join BenhNen b on b.MaBenhNen=q.MaBenhNen where th.MaThuoc=? and pb.MaBenhNhan=?",drug,p);
    warnings.addAll(list("select N'Dị ứng' type,c.MucDo severity,d.TenDiUng subject,c.NoiDung content,N'Ngừng dùng và liên hệ nhân viên y tế nếu có dấu hiệu phản ứng.' recommendation,null source from Thuoc_HoatChat th join CanhBaoDiUng_HoatChat c on c.MaHoatChat=th.MaHoatChat join BenhNhan_DiUng pa on pa.MaDiUng=c.MaDiUng join DiUng d on d.MaDiUng=c.MaDiUng where th.MaThuoc=? and pa.MaBenhNhan=?",drug,p));
    warnings.addAll(list("select N'Tương tác' type,x.MucDo severity,t.TenThuoc subject,x.HauQua content,x.KhuyenNghi recommendation,null source from Thuoc_HoatChat n join BenhNhan_ThuocDangDung pd on pd.MaBenhNhan=? join Thuoc t on t.MaThuoc=pd.MaThuoc join Thuoc_HoatChat old on old.MaThuoc=pd.MaThuoc join TuongTacHoatChat x on (x.MaHoatChat1=n.MaHoatChat and x.MaHoatChat2=old.MaHoatChat) or (x.MaHoatChat2=n.MaHoatChat and x.MaHoatChat1=old.MaHoatChat) where n.MaThuoc=?",p,drug));
    String highest=warnings.stream().map(x->String.valueOf(x.get("severity"))).min(Comparator.comparingInt(this::rank)).orElse("ChuaDuDuLieu");
    db.update("insert into LichSuTraCuu(MaBenhNhan,MaThuoc,MucDoCaoNhat) values(?,?,?)",p,drug,highest);long history=db.queryForObject("select max(MaLichSu) from LichSuTraCuu where MaBenhNhan=?",Long.class,p);
    warnings.forEach(w->db.update("insert into LichSuTraCuu_ChiTiet(MaLichSu,LoaiCanhBao,MucDo,NoiDung) values(?,?,?,?)",history,w.get("type"),w.get("severity"),w.get("content")));
    return Map.of("drug",info.getFirst(),"ingredients",ingredients,"warnings",warnings,"highestSeverity",highest,"historyId",history,"disclaimer","Thông tin chỉ mang tính tham khảo, không thay thế tư vấn của bác sĩ hoặc dược sĩ.");
  }
  private int rank(String s){return switch(s){case "Cao"->0;case "TrungBinh"->1;case "Thap"->2;default->3;};}
  @GetMapping("/lookup/history") Object history(@RequestHeader("Authorization") String h){return list("select l.MaLichSu id,t.TenThuoc drug,l.ThoiGian time,l.MucDoCaoNhat severity,(select count(*) from LichSuTraCuu_ChiTiet c where c.MaLichSu=l.MaLichSu) warningCount from LichSuTraCuu l join Thuoc t on t.MaThuoc=l.MaThuoc where l.MaBenhNhan=? order by l.ThoiGian desc",patient(user(h).id()));}

  @PostMapping("/drugs") Object createDrug(@RequestHeader("Authorization") String h,@RequestBody Map<String,Object>b){
    var u=user(h); staff(u);
    db.update("insert into Thuoc(TenThuoc, TenQuocTe, SoDangKy, LoaiThuoc, DangBaoChe, DuongDung, HamLuong, NhaSanXuat, MoTa, HuongDanSuDung, TacDungPhu, CanKeDon) values(?,?,?,?,?,?,?,?,?,?,?,?)",
        b.get("TenThuoc"), b.get("TenQuocTe"), b.get("SoDangKy"), b.get("LoaiThuoc"), b.get("DangBaoChe"), b.get("DuongDung"), b.get("HamLuong"), b.get("NhaSanXuat"), b.get("MoTa"), b.get("HuongDanSuDung"), b.get("TacDungPhu"), b.get("CanKeDon"));
    audit(u,"Thêm","Thuoc",String.valueOf(b.get("TenThuoc"))); 
    return Map.of("message","Đã thêm thuốc");
  }
  @PutMapping("/drugs/{id}") Object updateDrug(@RequestHeader("Authorization") String h,@PathVariable long id,@RequestBody Map<String,Object>b){
    var u=user(h); staff(u);
    db.update("update Thuoc set TenThuoc=?, TenQuocTe=?, SoDangKy=?, LoaiThuoc=?, DangBaoChe=?, DuongDung=?, HamLuong=?, NhaSanXuat=?, MoTa=?, HuongDanSuDung=?, TacDungPhu=?, CanKeDon=? where MaThuoc=?",
        b.get("TenThuoc"), b.get("TenQuocTe"), b.get("SoDangKy"), b.get("LoaiThuoc"), b.get("DangBaoChe"), b.get("DuongDung"), b.get("HamLuong"), b.get("NhaSanXuat"), b.get("MoTa"), b.get("HuongDanSuDung"), b.get("TacDungPhu"), b.get("CanKeDon"), id);
    audit(u,"Sửa","Thuoc","Mã "+id); 
    return Map.of("message","Đã cập nhật thuốc");
  }

  @DeleteMapping("/drugs/{id}") Object disableDrug(@RequestHeader("Authorization") String h,@PathVariable long id){
    var u=user(h); staff(u);
    db.update("update Thuoc set TrangThai=0 where MaThuoc=?",id);
    audit(u,"Ngưng hoạt động","Thuoc","Mã "+id); 
    return Map.of("message","Đã ngưng hoạt động thuốc");
  }
  @GetMapping("/drug-interactions") Object getInteractions(@RequestHeader("Authorization") String h, @RequestParam(defaultValue="") String keyword) {
    staff(user(h));
    return list("select t.MaTuongTac id, h1.TenHoatChat ingredient1, h2.TenHoatChat ingredient2, t.MucDo severity, t.HauQua description from TuongTacHoatChat t join HoatChat h1 on t.MaHoatChat1 = h1.MaHoatChat join HoatChat h2 on t.MaHoatChat2 = h2.MaHoatChat where lower(h1.TenHoatChat) like lower(?) or lower(h2.TenHoatChat) like lower(?) order by t.MaTuongTac desc", "%"+keyword+"%", "%"+keyword+"%");
  }

  @PostMapping("/drug-interactions") Object createInteraction(@RequestHeader("Authorization") String h, @RequestBody Map<String,Object> b) {
    var u = user(h); staff(u);
    // Hỗ trợ cả 2 định dạng gửi lên từ Frontend
    long hc1 = ((Number) (b.get("MaHoatChat1") != null ? b.get("MaHoatChat1") : b.get("ingredient1Id"))).longValue();
    long hc2 = ((Number) (b.get("MaHoatChat2") != null ? b.get("MaHoatChat2") : b.get("ingredient2Id"))).longValue();
    String mucDo = (String) (b.get("MucDo") != null ? b.get("MucDo") : b.get("severity"));
    String hauQua = (String) (b.get("HauQua") != null ? b.get("HauQua") : b.get("description"));
    String khuyenNghi = (String) (b.get("KhuyenNghi") != null ? b.get("KhuyenNghi") : b.get("recommendation"));

    db.update("insert into TuongTacHoatChat(MaHoatChat1, MaHoatChat2, MucDo, HauQua, KhuyenNghi) values(?,?,?,?,?)", hc1, hc2, mucDo, hauQua, khuyenNghi);
    audit(u, "Thêm", "TuongTacHoatChat", hc1 + " tương tác " + hc2);
    return Map.of("message", "Đã thêm tương tác thuốc");
  }

  @DeleteMapping("/drug-interactions/{id}") Object disableInteraction(@RequestHeader("Authorization") String h, @PathVariable long id) {
    var u = user(h); staff(u);
    db.update("delete from TuongTacHoatChat where MaTuongTac=?", id);
    audit(u, "Xóa", "TuongTacHoatChat", "Mã " + id);
    return Map.of("message", "Đã xóa tương tác");
  }

  // --- 1. BỔ SUNG CÁC API LẤY CHI TIẾT ĐỂ NÚT "SỬA" HOẠT ĐỘNG ---
  @GetMapping("/ingredients/{id}") Object getIngredient(@PathVariable long id){
    var x=list("select MaHoatChat id, TenHoatChat name, MoTa description from HoatChat where MaHoatChat=?",id);
    if(x.isEmpty()) throw new IllegalArgumentException("Không tìm thấy hoạt chất"); return x.getFirst();
  }

  @GetMapping("/diseases/{id}") Object getDisease(@PathVariable long id){
    var x=list("select MaBenhNen id, TenBenh name, TenThongDung commonName, NhomBenh category, MaICD icd, MoTa description from BenhNen where MaBenhNen=?",id);
    if(x.isEmpty()) throw new IllegalArgumentException("Không tìm thấy bệnh nền"); return x.getFirst();
  }

  @GetMapping("/allergies/{id}") Object getAllergy(@PathVariable long id){
    var x=list("select MaDiUng id, TenDiUng name, MoTa description from DiUng where MaDiUng=?",id);
    if(x.isEmpty()) throw new IllegalArgumentException("Không tìm thấy dị ứng"); return x.getFirst();
  }

  // --- 2. GHI ĐÈ LẠI 2 API CỦA BỆNH NỀN ĐỂ LƯU THÊM MÃ ICD VÀ NHÓM BỆNH ---
  @PostMapping("/diseases") Object createDisease(@RequestHeader("Authorization") String h,@RequestBody Map<String,Object>b){
    var u=user(h);staff(u);
    db.update("insert into BenhNen(TenBenh,TenThongDung,NhomBenh,MaICD,MoTa) values(?,?,?,?,?)", b.get("name"),b.get("commonName"),b.get("category"),b.get("icd"),b.get("description"));
    audit(u,"Thêm","BenhNen",String.valueOf(b.get("name"))); return Map.of("message","Đã thêm bệnh nền");
  }

  @PutMapping("/diseases/{id}") Object updateDisease(@RequestHeader("Authorization") String h,@PathVariable long id,@RequestBody Map<String,Object>b){
    var u=user(h);staff(u);
    db.update("update BenhNen set TenBenh=?,TenThongDung=?,NhomBenh=?,MaICD=?,MoTa=? where MaBenhNen=?", b.get("name"),b.get("commonName"),b.get("category"),b.get("icd"),b.get("description"),id);
    audit(u,"Sửa","BenhNen","Mã "+id); return Map.of("message","Đã cập nhật bệnh nền");
  }
  @PostMapping("/ingredients") Object createIngredient(@RequestHeader("Authorization") String h,@RequestBody Map<String,Object>b){var u=user(h);staff(u);db.update("insert into HoatChat(TenHoatChat,MoTa) values(?,?)",b.get("name"),b.get("description"));audit(u,"Thêm","HoatChat",String.valueOf(b.get("name")));return Map.of("message","Đã thêm hoạt chất");}
  @PutMapping("/ingredients/{id}") Object updateIngredient(@RequestHeader("Authorization") String h,@PathVariable long id,@RequestBody Map<String,Object>b){var u=user(h);staff(u);db.update("update HoatChat set TenHoatChat=?,MoTa=? where MaHoatChat=?",b.get("name"),b.get("description"),id);audit(u,"Sửa","HoatChat","Mã "+id);return Map.of("message","Đã cập nhật hoạt chất");}
  @DeleteMapping("/ingredients/{id}") Object disableIngredient(@RequestHeader("Authorization") String h,@PathVariable long id){var u=user(h);staff(u);db.update("update HoatChat set TrangThai=0 where MaHoatChat=?",id);audit(u,"Ngưng hoạt động","HoatChat","Mã "+id);return Map.of("message","Đã ngưng hoạt động");}
  @DeleteMapping("/diseases/{id}") Object disableDisease(@RequestHeader("Authorization") String h,@PathVariable long id){var u=user(h);staff(u);db.update("update BenhNen set TrangThai=0 where MaBenhNen=?",id);audit(u,"Ngưng hoạt động","BenhNen","Mã "+id);return Map.of("message","Đã ngưng hoạt động");}
  @PostMapping("/allergies") Object createAllergy(@RequestHeader("Authorization") String h,@RequestBody Map<String,Object>b){var u=user(h);staff(u);db.update("insert into DiUng(TenDiUng,MoTa) values(?,?)",b.get("name"),b.get("description"));audit(u,"Thêm","DiUng",String.valueOf(b.get("name")));return Map.of("message","Đã thêm dị ứng");}
  @PutMapping("/allergies/{id}") Object updateAllergy(@RequestHeader("Authorization") String h,@PathVariable long id,@RequestBody Map<String,Object>b){var u=user(h);staff(u);db.update("update DiUng set TenDiUng=?,MoTa=? where MaDiUng=?",b.get("name"),b.get("description"),id);audit(u,"Sửa","DiUng","Mã "+id);return Map.of("message","Đã cập nhật dị ứng");}
  @DeleteMapping("/allergies/{id}") Object disableAllergy(@RequestHeader("Authorization") String h,@PathVariable long id){var u=user(h);staff(u);db.update("update DiUng set TrangThai=0 where MaDiUng=?",id);audit(u,"Ngưng hoạt động","DiUng","Mã "+id);return Map.of("message","Đã ngưng hoạt động");}
  @PostMapping("/warning-rules") Object createRule(@RequestHeader("Authorization") String h,@RequestBody Map<String,Object>b){var u=user(h);staff(u);db.update("insert into QuyTacCanhBao(MaHoatChat,MaBenhNen,MucDo,NoiDung,KhuyenNghi,Nguon,TrangThai) values(?,?,?,?,?,?,'ChoDuyet')",b.get("ingredientId"),b.get("diseaseId"),b.get("severity"),b.get("content"),b.get("recommendation"),b.get("source"));audit(u,"Thêm","QuyTacCanhBao","Chờ duyệt");return Map.of("message","Đã tạo quy tắc chờ duyệt");}
  @PutMapping("/warning-rules/{id}") Object updateRule(@RequestHeader("Authorization") String h,@PathVariable long id,@RequestBody Map<String,Object>b){var u=user(h);staff(u);db.update("update QuyTacCanhBao set MaHoatChat=?,MaBenhNen=?,MucDo=?,NoiDung=?,KhuyenNghi=?,Nguon=?,TrangThai='ChoDuyet' where MaQuyTac=?",b.get("ingredientId"),b.get("diseaseId"),b.get("severity"),b.get("content"),b.get("recommendation"),b.get("source"),id);audit(u,"Sửa","QuyTacCanhBao","Mã "+id);return Map.of("message","Đã cập nhật và chuyển về chờ duyệt");}
  @PostMapping("/warning-rules/{id}/reject") Object reject(@RequestHeader("Authorization") String h,@PathVariable long id){var u=user(h);staff(u);db.update("update QuyTacCanhBao set TrangThai='TuChoi' where MaQuyTac=?",id);audit(u,"Từ chối","QuyTacCanhBao","Mã "+id);return Map.of("message","Đã từ chối quy tắc");}
  @DeleteMapping("/warning-rules/{id}") Object disableRule(@RequestHeader("Authorization") String h,@PathVariable long id){var u=user(h);staff(u);db.update("update QuyTacCanhBao set TrangThai='NgungHoatDong' where MaQuyTac=?",id);audit(u,"Ngưng hoạt động","QuyTacCanhBao","Mã "+id);return Map.of("message","Đã ngưng hoạt động");}
  private void audit(AuthService.User u,String action,String object,String detail){db.update("insert into AuditLog(MaTaiKhoan,HanhDong,DoiTuong,ChiTiet) values(?,?,?,?)",u.id(),action,object,detail);}

  @GetMapping("/admin/statistics") Object statistics(@RequestHeader("Authorization") String h){var u=user(h);staff(u);return Map.of("users",db.queryForObject("select count(*) from TaiKhoan",Integer.class),"drugs",db.queryForObject("select count(*) from Thuoc",Integer.class),"diseases",db.queryForObject("select count(*) from BenhNen",Integer.class),"lookups",db.queryForObject("select count(*) from LichSuTraCuu",Integer.class));}
  @GetMapping("/warning-rules") Object rules(@RequestHeader("Authorization") String h){staff(user(h));return list("select q.MaQuyTac id,h.TenHoatChat ingredient,b.TenBenh disease,q.MucDo severity,q.NoiDung content,q.TrangThai status from QuyTacCanhBao q join HoatChat h on h.MaHoatChat=q.MaHoatChat join BenhNen b on b.MaBenhNen=q.MaBenhNen order by q.MaQuyTac desc");}
  @GetMapping("/warning-rules/{id}") Object getRule(@RequestHeader("Authorization") String h,@PathVariable long id){
    staff(user(h));
    var x = list("select MaQuyTac id, MaHoatChat ingredientId, MaBenhNen diseaseId, MucDo severity, NoiDung content, KhuyenNghi recommendation, Nguon source from QuyTacCanhBao where MaQuyTac=?", id);
    if(x.isEmpty()) throw new IllegalArgumentException("Không tìm thấy quy tắc");
    return x.getFirst();
  }
  @PostMapping("/warning-rules/{id}/approve") Object approve(@RequestHeader("Authorization") String h,@PathVariable long id){var u=user(h);staff(u);db.update("update QuyTacCanhBao set TrangThai='DaDuyet' where MaQuyTac=?",id);db.update("insert into AuditLog(MaTaiKhoan,HanhDong,DoiTuong,ChiTiet) values(?,?,?,?)",u.id(),"Duyệt","QuyTacCanhBao","Mã "+id);return Map.of("message","Đã duyệt quy tắc");}
  @GetMapping("/admin/users") Object users(@RequestHeader("Authorization") String h){var u=user(h);if(!"ADMIN".equals(u.role()))throw new SecurityException("Chỉ quản trị viên được xem tài khoản");return list("select MaTaiKhoan id,TenDangNhap username,HoTen fullName,VaiTro role,TrangThai active,NgayTao createdAt from TaiKhoan order by NgayTao desc");}
  @PutMapping("/admin/users/{id}/lock") Object lock(@RequestHeader("Authorization") String h,@PathVariable long id){var u=user(h);if(!"ADMIN".equals(u.role()))throw new SecurityException("Chỉ quản trị viên được khóa tài khoản");if(id==u.id())throw new IllegalArgumentException("Không thể tự khóa tài khoản đang dùng");db.update("update TaiKhoan set TrangThai=0 where MaTaiKhoan=?",id);audit(u,"Khóa","TaiKhoan","Mã "+id);return Map.of("message","Đã khóa tài khoản");}
  @PutMapping("/admin/users/{id}/unlock") Object unlock(@RequestHeader("Authorization") String h,@PathVariable long id){var u=user(h);if(!"ADMIN".equals(u.role()))throw new SecurityException("Chỉ quản trị viên được mở khóa tài khoản");db.update("update TaiKhoan set TrangThai=1 where MaTaiKhoan=?",id);audit(u,"Mở khóa","TaiKhoan","Mã "+id);return Map.of("message","Đã mở khóa tài khoản");}
  @PutMapping("/admin/users/{id}/role") Object role(@RequestHeader("Authorization") String h,@PathVariable long id,@RequestBody Map<String,Object>b){var u=user(h);if(!"ADMIN".equals(u.role()))throw new ForbiddenException("Chỉ quản trị viên được phân quyền");String role=String.valueOf(b.get("role"));if(!Set.of("BENH_NHAN","DUOC_SI","BAC_SI","ADMIN").contains(role))throw new IllegalArgumentException("Vai trò không hợp lệ");db.update("update TaiKhoan set VaiTro=? where MaTaiKhoan=?",role,id);audit(u,"Phân quyền","TaiKhoan","Mã "+id+" → "+role);return Map.of("message","Đã cập nhật vai trò");}
  @GetMapping("/admin/audit-logs") Object auditLogs(@RequestHeader("Authorization") String h){var u=user(h);if(!"ADMIN".equals(u.role()))throw new SecurityException("Chỉ quản trị viên được xem nhật ký");return list("select a.MaAudit id,t.TenDangNhap username,a.HanhDong action,a.DoiTuong object,a.ChiTiet detail,a.ThoiGian time from AuditLog a left join TaiKhoan t on t.MaTaiKhoan=a.MaTaiKhoan order by a.ThoiGian desc");}
  @GetMapping("/admin/ai-logs") Object aiLogs(@RequestHeader("Authorization") String h){var u=user(h);if(!"ADMIN".equals(u.role()))throw new SecurityException("Chỉ quản trị viên được xem nhật ký AI");return list("select n.MaNhatKy id,t.TenDangNhap username,n.CauHoi question,n.CauTraLoi answer,n.LoaiTacVu taskType,n.NguonDuLieuSuDung dataSources,n.MucDoTinCay confidence,n.CanhBaoAnToan safetyWarning,n.NgayTao createdAt from NhatKyAI n left join TaiKhoan t on t.MaTaiKhoan=n.MaTaiKhoan order by n.NgayTao desc");}
  @GetMapping("/admin/ai-logs/{id}") Object aiLog(@RequestHeader("Authorization") String h,@PathVariable long id){var u=user(h);if(!"ADMIN".equals(u.role()))throw new ForbiddenException("Chỉ quản trị viên được xem nhật ký AI");var x=list("select * from NhatKyAI where MaNhatKy=?",id);if(x.isEmpty())throw new IllegalArgumentException("Không tìm thấy nhật ký AI");return x.getFirst();}
}
