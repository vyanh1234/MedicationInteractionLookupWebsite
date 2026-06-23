package vn.medcheck;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
  public record User(long id, String username, String email, String fullName, String role, String avatar, String loginType) {}
  private record AuthRow(long id,String username,String email,String hash,String name,String role,boolean active,String googleId,String avatar,String loginType){}
  private record Session(User user, Instant expires) {}
  private final JdbcTemplate db;
  private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
  private final Map<String, Session> sessions = new ConcurrentHashMap<>();

  public AuthService(JdbcTemplate db) { this.db = db; seedUsers(); }
  
  private void seedUsers() {
    if (count("patient") == 0) register("patient", "123456", "Nguyễn An", "BENH_NHAN");
    if (count("doctor") == 0) register("doctor", "123456", "DS. Minh Anh", "DUOC_SI");
    if (count("admin") == 0) register("admin", "123456", "Quản trị viên", "ADMIN");
  }
  
  private int count(String u) { return db.queryForObject("select count(*) from TaiKhoan where TenDangNhap=?", Integer.class, u); }
  
  public User register(String username, String password, String name, String role) {
    // Đã sửa đổi: Nới lỏng Regex thêm @ và -, tăng độ dài lên 100, đổi câu thông báo chuẩn xác
    if (username == null || !username.matches("[A-Za-z0-9_.@-]{4,100}")) throw new IllegalArgumentException("Email hoặc tên đăng nhập không hợp lệ (từ 4-100 ký tự, không chứa khoảng trắng)");
    if (password == null || password.length() < 6) throw new IllegalArgumentException("Mật khẩu cần ít nhất 6 ký tự");
    if (count(username) > 0) throw new IllegalArgumentException("Tên đăng nhập hoặc Email này đã tồn tại");
    
    db.update("insert into TaiKhoan(TenDangNhap,Email,MatKhauHash,HoTen,VaiTro,TrangThai,LoaiDangNhap) values(?,?,?,?,?,1,'LOCAL')", username, username.contains("@")?username:null, encoder.encode(password), name, role);
    long id = db.queryForObject("select MaTaiKhoan from TaiKhoan where TenDangNhap=?", Long.class, username);
    if ("BENH_NHAN".equals(role)) db.update("insert into BenhNhan(MaTaiKhoan,HoTen) values(?,?)", id, name);
    return new User(id, username, username.contains("@")?username:null, name, role, null, "LOCAL");
  }
  
  public Map<String,Object> login(String username, String password) {
    var rows=find("where TenDangNhap=?",username);
    if (rows.isEmpty() || rows.getFirst().hash()==null || !encoder.matches(password,rows.getFirst().hash())) throw new SecurityException("Sai tên đăng nhập hoặc mật khẩu");
    return createSession(rows.getFirst());
  }
  
  public synchronized Map<String,Object> googleLogin(String googleId,String email,String name,String avatar){
    if(googleId==null||email==null)throw new SecurityException("Google không cung cấp đủ thông tin tài khoản");
    var rows=find("where GoogleId=? or lower(Email)=lower(?) or lower(TenDangNhap)=lower(?)",googleId,email,email);
    AuthRow row;
    if(rows.isEmpty()){
      db.update("insert into TaiKhoan(TenDangNhap,Email,HoTen,VaiTro,TrangThai,GoogleId,AnhDaiDien,LoaiDangNhap) values(?,?,?,?,1,?,?,'GOOGLE')",email,email,name,"BENH_NHAN",googleId,avatar);
      long id=db.queryForObject("select MaTaiKhoan from TaiKhoan where GoogleId=?",Long.class,googleId);
      db.update("insert into BenhNhan(MaTaiKhoan,HoTen) values(?,?)",id,name);
      row=find("where MaTaiKhoan=?",id).getFirst();
    }else{
      row=rows.getFirst();
      if(!row.active())throw new SecurityException("Tài khoản đã bị khóa");
      db.update("update TaiKhoan set GoogleId=?,Email=coalesce(Email,?),AnhDaiDien=?,LoaiDangNhap=case when MatKhauHash is null then 'GOOGLE' else 'LOCAL_GOOGLE' end where MaTaiKhoan=?",googleId,email,avatar,row.id());
      row=find("where MaTaiKhoan=?",row.id()).getFirst();
    }
    return createSession(row);
  }
  
  private List<AuthRow> find(String where,Object...args){return db.query("select * from TaiKhoan "+where,(rs,n)->new AuthRow(rs.getLong("MaTaiKhoan"),rs.getString("TenDangNhap"),rs.getString("Email"),rs.getString("MatKhauHash"),rs.getString("HoTen"),rs.getString("VaiTro"),rs.getBoolean("TrangThai"),rs.getString("GoogleId"),rs.getString("AnhDaiDien"),rs.getString("LoaiDangNhap")),args);}
  
  private Map<String,Object> createSession(AuthRow r){if(!r.active())throw new SecurityException("Tài khoản đã bị khóa");var user=new User(r.id(),r.username(),r.email(),r.name(),r.role(),r.avatar(),r.loginType());String token=UUID.randomUUID()+"."+UUID.randomUUID();sessions.put(token,new Session(user,Instant.now().plusSeconds(28800)));return Map.of("token",token,"user",user);}
  
  public User authenticate(String header) {
    if (header==null || !header.startsWith("Bearer ")) throw new SecurityException("Vui lòng đăng nhập");
    var s=sessions.get(header.substring(7));
    if(s==null || s.expires().isBefore(Instant.now())) throw new SecurityException("Phiên đăng nhập đã hết hạn");
    return s.user();
  }
  
  public void logout(String header) { if(header!=null && header.startsWith("Bearer ")) sessions.remove(header.substring(7)); }
}