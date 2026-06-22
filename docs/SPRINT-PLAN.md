# Sprint Planning

## Sprint CR-1 — 10 ngày

Mục tiêu: hoàn tất autocomplete, Google auth và nền tảng AI kiểm duyệt.

| Ngày | Hạng mục | Đầu ra |
|---|---|---|
| 1–2 | Schema/migration | Google fields, `GoiYAI`, `NhatKyAI`, index |
| 3 | Autocomplete API/UI | Debounce, ranking, không dấu |
| 4–5 | Google Authentication | Xác minh token, tạo/liên kết tài khoản |
| 6–7 | AI guardrails/logging | Generate giới hạn, audit đầy đủ |
| 8 | Review workflow | Pending/approve/reject UI + API |
| 9 | Integration/security test | Auth, RBAC, negative cases |
| 10 | UAT và tài liệu | Demo, ERD, API, test report |

Rủi ro: Google credentials chưa cấp; LocalDB không hỗ trợ trực tiếp qua Microsoft JDBC dynamic pipe. Giảm thiểu: cấu hình môi trường, dùng SQL Server TCP cho runtime và tiện ích migration riêng cho LocalDB.

