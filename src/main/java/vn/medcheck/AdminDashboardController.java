package vn.medcheck;

import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/admin/dashboard")
public class AdminDashboardController {
  private final JdbcTemplate db;
  public AdminDashboardController(JdbcTemplate db){this.db=db;}
  @GetMapping("/summary") Object summary(){
    var result=new LinkedHashMap<String,Object>();
    result.put("tongTaiKhoan",count("TaiKhoan"));result.put("tongBenhNhan",count("BenhNhan"));result.put("tongLuotTraCuu",count("LichSuTraCuu"));
    result.put("thuocBiCanhBaoNhieuNhat",db.queryForList("select top 5 t.TenThuoc tenThuoc,count(c.MaChiTiet) soLan from LichSuTraCuu l join Thuoc t on t.MaThuoc=l.MaThuoc join LichSuTraCuu_ChiTiet c on c.MaLichSu=l.MaLichSu group by t.TenThuoc order by soLan desc"));
    result.put("hoatChatBiTraCuuNhieuNhat",db.queryForList("select top 5 h.TenHoatChat tenHoatChat,count(l.MaLichSu) soLan from LichSuTraCuu l join Thuoc_HoatChat th on th.MaThuoc=l.MaThuoc join HoatChat h on h.MaHoatChat=th.MaHoatChat group by h.TenHoatChat order by soLan desc"));
    var warning=db.queryForList("select MucDo mucDoCanhBao,count(*) soLuong from LichSuTraCuu_ChiTiet group by MucDo order by soLuong desc");result.put("canhBaoPhoBien",warning);result.put("canhBaoTheoMucDo",warning);
    var days=new TreeMap<LocalDate,Integer>();for(var row:db.queryForList("select ThoiGian from LichSuTraCuu")){Object v=row.values().iterator().next();LocalDate d=v instanceof Timestamp t?t.toLocalDateTime().toLocalDate():v instanceof LocalDateTime l?l.toLocalDate():LocalDate.now();days.merge(d,1,Integer::sum);}
    result.put("luotTraCuuTheoNgay",days.entrySet().stream().map(e->Map.of("ngay",e.getKey().toString(),"soLuot",e.getValue())).toList());return result;
  }
  private int count(String table){return db.queryForObject("select count(*) from "+table,Integer.class);}
}
