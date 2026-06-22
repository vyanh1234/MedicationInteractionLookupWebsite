# Website hỗ trợ bệnh nhân tra cứu thuốc nên tránh khi đang có bệnh nền

## 1. Mục tiêu

Xây dựng website cho phép bệnh nhân tra cứu thuốc và nhận cảnh báo nếu thuốc đó không phù hợp với bệnh nền, dị ứng hoặc thuốc đang dùng.

Hệ thống chỉ hỗ trợ tham khảo, không thay thế tư vấn của bác sĩ/dược sĩ.

## 2. Công nghệ

- Backend: Java
- Database: SQL Server
- Frontend: HTML/CSS/JS hoặc framework phù hợp
- Quản lý source: Git/GitHub
- Quản lý dự án: Jira
- Thiết kế giao diện: Figma

## 3. Database hiện có

Database: `HTTraCuuThuoc_AI`

Các bảng chính cần dùng:

- `TaiKhoan`: tài khoản người dùng
- `BenhNhan`: hồ sơ bệnh nhân
- `BenhNhan_BenhNen`: bệnh nền của bệnh nhân
- `BenhNhan_DiUng`: dị ứng của bệnh nhân
- `BenhNhan_ThuocDangDung`: thuốc bệnh nhân đang dùng
- `Thuoc`: thông tin thuốc
- `HoatChat`: thông tin hoạt chất
- `Thuoc_HoatChat`: liên kết thuốc và hoạt chất
- `BenhNen`: danh mục bệnh nền
- `DiUng`: danh mục dị ứng
- `QuyTacCanhBao`: quy tắc cảnh báo thuốc theo bệnh nền
- `CanhBaoDiUng_HoatChat`: cảnh báo dị ứng theo hoạt chất
- `TuongTacHoatChat`: tương tác giữa các hoạt chất
- `LichSuTraCuu`: lịch sử tra cứu
- `LichSuTraCuu_ChiTiet`: chi tiết lịch sử tra cứu
- `ThongBao`: thông báo người dùng
- `AuditLog`: nhật ký thay đổi dữ liệu
- `NhatKyAI`: nhật ký câu hỏi/trả lời AI nếu có

## 4. Vai trò người dùng

### Bệnh nhân
- Đăng ký, đăng nhập
- Cập nhật hồ sơ cá nhân
- Khai báo bệnh nền
- Khai báo dị ứng
- Khai báo thuốc đang dùng
- Tra cứu thuốc
- Xem cảnh báo
- Xem lịch sử tra cứu

### Dược sĩ/Bác sĩ
- Quản lý thuốc
- Quản lý hoạt chất
- Quản lý bệnh nền
- Quản lý dị ứng
- Tạo và duyệt quy tắc cảnh báo
- Quản lý tương tác thuốc
- Quản lý nguồn tham khảo

### Quản trị viên
- Quản lý tài khoản
- Phân quyền
- Khóa/mở khóa tài khoản
- Xem thống kê
- Xem audit log
- Quản lý toàn bộ dữ liệu hệ thống

## 5. Chức năng cần lập trình

## 5.1. Đăng ký, đăng nhập, phân quyền

Cần làm:

- API đăng ký tài khoản
- API đăng nhập
- API đăng xuất
- API lấy thông tin người dùng hiện tại
- Hash mật khẩu
- Phân quyền theo `VaiTro`
- Chặn tài khoản bị khóa

API đề xuất:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

## 5.2. Quản lý hồ sơ bệnh nhân

Cần làm:

- Xem hồ sơ bệnh nhân
- Cập nhật ngày sinh, giới tính, chiều cao, cân nặng, nhóm máu, địa chỉ, ghi chú sức khỏe
- Thêm/xóa bệnh nền
- Thêm/xóa dị ứng
- Thêm/sửa/xóa thuốc đang dùng

API đề xuất:

- `GET /api/patient/profile`
- `PUT /api/patient/profile`
- `GET /api/patient/background-diseases`
- `POST /api/patient/background-diseases`
- `DELETE /api/patient/background-diseases/{id}`
- `GET /api/patient/allergies`
- `POST /api/patient/allergies`
- `DELETE /api/patient/allergies/{id}`
- `GET /api/patient/current-drugs`
- `POST /api/patient/current-drugs`
- `PUT /api/patient/current-drugs/{id}`
- `DELETE /api/patient/current-drugs/{id}`

## 5.3. Quản lý thuốc

Cần làm:

- Thêm thuốc
- Sửa thuốc
- Xóa/ngưng hoạt động thuốc
- Xem danh sách thuốc
- Tìm kiếm thuốc theo tên
- Xem chi tiết thuốc
- Gắn hoạt chất vào thuốc

Dữ liệu lấy từ bảng:

- `Thuoc`
- `HoatChat`
- `Thuoc_HoatChat`
- `Thuoc_TenKhac`
- `v_Thuoc_DayDu`

API đề xuất:

- `GET /api/drugs`
- `GET /api/drugs/{id}`
- `POST /api/drugs`
- `PUT /api/drugs/{id}`
- `DELETE /api/drugs/{id}`
- `GET /api/drugs/search?keyword=...`

## 5.4. Quản lý hoạt chất

Cần làm:

- Thêm hoạt chất
- Sửa hoạt chất
- Xóa/ngưng hoạt động hoạt chất
- Tìm kiếm hoạt chất
- Xem thuốc nào chứa hoạt chất đó

API đề xuất:

- `GET /api/ingredients`
- `GET /api/ingredients/{id}`
- `POST /api/ingredients`
- `PUT /api/ingredients/{id}`
- `DELETE /api/ingredients/{id}`

## 5.5. Quản lý bệnh nền

Cần làm:

- Thêm bệnh nền
- Sửa bệnh nền
- Xóa/ngưng hoạt động bệnh nền
- Tìm kiếm bệnh nền theo tên chính hoặc tên thông dụng
- Quản lý tên khác của bệnh nền

Dữ liệu lấy từ:

- `BenhNen`
- `BenhNen_TenKhac`

API đề xuất:

- `GET /api/diseases`
- `GET /api/diseases/{id}`
- `POST /api/diseases`
- `PUT /api/diseases/{id}`
- `DELETE /api/diseases/{id}`

## 5.6. Quản lý dị ứng

Cần làm:

- Thêm dị ứng
- Sửa dị ứng
- Xóa/ngưng hoạt động dị ứng
- Quản lý cảnh báo dị ứng theo hoạt chất

Dữ liệu lấy từ:

- `DiUng`
- `DiUng_TenKhac`
- `CanhBaoDiUng_HoatChat`

API đề xuất:

- `GET /api/allergies`
- `POST /api/allergies`
- `PUT /api/allergies/{id}`
- `DELETE /api/allergies/{id}`

## 5.7. Quản lý quy tắc cảnh báo thuốc theo bệnh nền

Đây là chức năng lõi.

Cần làm:

- Thêm quy tắc cảnh báo
- Sửa quy tắc cảnh báo
- Xóa/ngưng hoạt động quy tắc
- Duyệt quy tắc cảnh báo
- Chỉ quy tắc `DaDuyet` mới được hiển thị cho bệnh nhân
- Mỗi quy tắc liên kết 1 hoạt chất với 1 bệnh nền

Dữ liệu lấy từ:

- `QuyTacCanhBao`
- `v_QuyTacCanhBao_DayDu`
- `QuyTac_NguonThamKhao`
- `NguonThamKhao`

API đề xuất:

- `GET /api/warning-rules`
- `GET /api/warning-rules/{id}`
- `POST /api/warning-rules`
- `PUT /api/warning-rules/{id}`
- `POST /api/warning-rules/{id}/approve`
- `POST /api/warning-rules/{id}/reject`
- `DELETE /api/warning-rules/{id}`

## 5.8. Tra cứu thuốc theo bệnh nền

Đây là chức năng quan trọng nhất.

Luồng xử lý:

1. Người dùng nhập tên thuốc.
2. Hệ thống tìm thuốc trong bảng `Thuoc`.
3. Lấy hoạt chất của thuốc từ `Thuoc_HoatChat`.
4. Lấy bệnh nền của bệnh nhân từ `BenhNhan_BenhNen`.
5. So sánh hoạt chất với bệnh nền trong bảng `QuyTacCanhBao`.
6. Chỉ lấy quy tắc có trạng thái `DaDuyet`.
7. Hiển thị cảnh báo theo mức độ:
   - `Cao`
   - `TrungBinh`
   - `Thap`
   - `ChuaDuDuLieu`
8. Hiển thị khuyến nghị cho bệnh nhân.
9. Lưu kết quả vào `LichSuTraCuu` và `LichSuTraCuu_ChiTiet`.

API đề xuất:

- `POST /api/lookup/drug`
- `POST /api/lookup/check-by-disease`

Kết quả trả về cần có:

- Tên thuốc
- Danh sách hoạt chất
- Bệnh nền liên quan
- Loại cảnh báo
- Mức độ cảnh báo
- Nội dung cảnh báo cho bệnh nhân
- Khuyến nghị
- Nguồn tham khảo nếu có

## 5.9. Kiểm tra dị ứng thuốc

Luồng xử lý:

1. Người dùng tra cứu thuốc.
2. Hệ thống lấy hoạt chất của thuốc.
3. Lấy dị ứng của bệnh nhân từ `BenhNhan_DiUng`.
4. So sánh với bảng `CanhBaoDiUng_HoatChat`.
5. Nếu trùng, hiển thị cảnh báo dị ứng.

API đề xuất:

- `POST /api/lookup/check-allergy`

## 5.10. Kiểm tra tương tác thuốc

Luồng xử lý:

1. Người dùng chọn thuốc muốn kiểm tra.
2. Hệ thống lấy hoạt chất của thuốc mới.
3. Lấy danh sách thuốc đang dùng từ `BenhNhan_ThuocDangDung`.
4. Lấy hoạt chất của các thuốc đang dùng.
5. So sánh từng cặp hoạt chất với bảng `TuongTacHoatChat`.
6. Nếu có tương tác, hiển thị mức độ nguy hiểm, hậu quả và khuyến nghị.

API đề xuất:

- `POST /api/lookup/check-interaction`

## 5.11. Lịch sử tra cứu

Cần làm:

- Lưu mỗi lần tra cứu
- Lưu chi tiết cảnh báo
- Cho bệnh nhân xem lại lịch sử
- Cho admin thống kê số lượt tra cứu

API đề xuất:

- `GET /api/lookup/history`
- `GET /api/lookup/history/{id}`

## 5.12. Thống kê và quản trị

Cần làm:

- Thống kê số lượng người dùng
- Thống kê số thuốc
- Thống kê số bệnh nền
- Thống kê số lượt tra cứu
- Thống kê cảnh báo theo mức độ
- Xem audit log
- Xem nhật ký AI nếu có

API đề xuất:

- `GET /api/admin/statistics`
- `GET /api/admin/users`
- `PUT /api/admin/users/{id}/lock`
- `PUT /api/admin/users/{id}/unlock`
- `GET /api/admin/audit-logs`
- `GET /api/admin/ai-logs`

## 6. Giao diện cần có

### Giao diện chung
- Trang chủ
- Trang đăng nhập
- Trang đăng ký
- Trang tìm kiếm thuốc
- Trang chi tiết thuốc

### Giao diện bệnh nhân
- Dashboard bệnh nhân
- Hồ sơ cá nhân
- Quản lý bệnh nền
- Quản lý dị ứng
- Quản lý thuốc đang dùng
- Tra cứu thuốc
- Kết quả cảnh báo
- Lịch sử tra cứu

### Giao diện dược sĩ/bác sĩ
- Quản lý thuốc
- Quản lý hoạt chất
- Quản lý bệnh nền
- Quản lý dị ứng
- Quản lý quy tắc cảnh báo
- Quản lý tương tác thuốc
- Duyệt quy tắc cảnh báo

### Giao diện admin
- Dashboard admin
- Quản lý tài khoản
- Quản lý phân quyền
- Thống kê hệ thống
- Audit log
- Nhật ký AI
- Đánh giá người dùng

## 7. Quy tắc bảo mật

- Mật khẩu phải được hash.
- Không lưu mật khẩu dạng text thường.
- API cần kiểm tra token đăng nhập.
- Phân quyền theo vai trò.
- Bệnh nhân chỉ xem được hồ sơ của chính mình.
- Admin có quyền quản lý toàn hệ thống.
- Dược sĩ/bác sĩ chỉ quản lý dữ liệu chuyên môn.
- Thao tác thêm/sửa/xóa dữ liệu quan trọng phải ghi vào `AuditLog`.

## 8. Lưu ý quan trọng

- Không đổi tên bảng hoặc tên cột trong database.
- Không hard-code cảnh báo trong code.
- Cảnh báo phải lấy từ database.
- Tra cứu phải ưu tiên dữ liệu đã duyệt.
- Sau mỗi lần tra cứu phải lưu lịch sử.
- Website phải luôn hiển thị cảnh báo:
  “Thông tin chỉ mang tính tham khảo, không thay thế tư vấn của bác sĩ hoặc dược sĩ.”
- Nếu có dùng AI, AI chỉ được giải thích lại dữ liệu có sẵn, không tự chẩn đoán hoặc kê đơn thuốc.

## 9. Chức năng ưu tiên làm trước

Thứ tự nên lập trình:

1. Kết nối database SQL Server.
2. Đăng nhập/đăng ký/phân quyền.
3. CRUD thuốc.
4. CRUD hoạt chất.
5. CRUD bệnh nền.
6. CRUD hồ sơ bệnh nhân.
7. Khai báo bệnh nền, dị ứng, thuốc đang dùng.
8. Tra cứu thuốc theo bệnh nền.
9. Kiểm tra dị ứng.
10. Kiểm tra tương tác thuốc.
11. Lưu lịch sử tra cứu.
12. Admin dashboard và thống kê.
13. Audit log.
14. Hoàn thiện giao diện.
15. Kiểm thử và sửa lỗi.

## 10. Mục tiêu demo

Khi demo, hệ thống phải làm được tối thiểu:

1. Đăng nhập bằng tài khoản bệnh nhân.
2. Bệnh nhân khai báo bệnh nền, ví dụ: tăng huyết áp, suy gan, suy thận.
3. Bệnh nhân tìm kiếm thuốc, ví dụ: Paracetamol, Ibuprofen, Aspirin.
4. Hệ thống hiển thị cảnh báo thuốc theo bệnh nền.
5. Hệ thống kiểm tra dị ứng nếu bệnh nhân có khai báo.
6. Hệ thống kiểm tra tương tác với thuốc đang dùng.
7. Hệ thống lưu lịch sử tra cứu.
8. Admin/dược sĩ quản lý thuốc, hoạt chất, bệnh nền và quy tắc cảnh báo.