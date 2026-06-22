# Product Backlog và User Story — CR v2

| ID | User story | Ưu tiên | Story points | Acceptance chính |
|---|---|---:|---:|---|
| US-01 | Là bệnh nhân, tôi muốn nhận gợi ý thuốc khi nhập để tránh sai tên. | Must | 5 | Từ 2 ký tự; debounce 350ms; tối đa 10; <300ms; không dấu; bỏ thuốc vô hiệu |
| US-02 | Là người dùng, tôi muốn đăng nhập/đăng ký Google để vào hệ thống nhanh. | Must | 8 | Xác minh Google ID token; không trùng email; lấy tên/avatar; ≤5 giây |
| US-03 | Là người có tài khoản local, tôi muốn liên kết Google cùng email. | Must | 5 | Giữ nguyên hồ sơ; cập nhật `GoogleId`; vẫn đăng nhập local được |
| US-04 | Là bệnh nhân, tôi muốn AI giải thích cảnh báo bằng lời dễ hiểu. | Should | 5 | Chỉ dùng dữ liệu DB; không chẩn đoán/kê đơn; luôn có cảnh báo an toàn |
| US-05 | Là dược sĩ/bác sĩ, tôi muốn duyệt nội dung AI trước khi công bố. | Must | 5 | `CHO_DUYET → DA_DUYET/TU_CHOI`; nội dung chờ duyệt không hiển thị như kết luận |
| US-06 | Là admin, tôi muốn xem toàn bộ nhật ký AI để truy vết. | Must | 3 | Có tài khoản, input/output, nguồn, độ tin cậy, cảnh báo, thời gian |
| US-07 | Là admin, tôi muốn thống kê lượt tra cứu và mức cảnh báo. | Should | 5 | Bộ lọc thời gian; tổng lượt; phân nhóm mức độ |

Definition of Done: review code, API test đạt, không lộ bí mật OAuth, migration chạy lặp lại an toàn, disclaimer hiển thị, tài liệu cập nhật.

