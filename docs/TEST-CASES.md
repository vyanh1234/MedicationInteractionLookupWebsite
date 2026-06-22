# Test Cases v2

| ID | Kịch bản | Kết quả mong đợi |
|---|---|---|
| AC-01 | Nhập 1 ký tự | Không gọi autocomplete |
| AC-02 | Nhập `pa`, chờ 350ms | Tối đa 10 gợi ý |
| AC-03 | Nhập `thuoc` tìm tên có dấu tương ứng | Trả kết quả không phân biệt dấu |
| AC-04 | Tìm tên khác/hoạt chất | Đúng thứ tự ưu tiên |
| AC-05 | Thuốc `TrangThai=0` | Không xuất hiện |
| GA-01 | Google token hợp lệ, email mới | Tạo 1 tài khoản và hồ sơ bệnh nhân |
| GA-02 | Google token cùng email local | Liên kết, không tạo trùng |
| GA-03 | Token sai audience/hết hạn | HTTP 401 |
| GA-04 | Tài khoản bị khóa | Không đăng nhập được |
| AI-01 | Generate từ cảnh báo DB | Lưu `CHO_DUYET` và `NhatKyAI` |
| AI-02 | Bệnh nhân gọi pending/approve | HTTP 401/không có quyền |
| AI-03 | Dược sĩ duyệt | Trạng thái `DA_DUYET`, có người/ngày duyệt |
| AI-04 | Nội dung chưa duyệt | Không xuất hiện trong API approved |
| AI-05 | Kiểm tra log | Đủ nguồn, confidence, safety warning |
| SEC-01 | API hồ sơ không token | HTTP 401 |
| SEC-02 | Bệnh nhân đọc hồ sơ người khác | Không có endpoint nhận patient ID |

Kiểm thử hiệu năng autocomplete: warm-up 10 lần, đo 100 request đồng thời ở dữ liệu mục tiêu; p95 phải dưới 300ms.

