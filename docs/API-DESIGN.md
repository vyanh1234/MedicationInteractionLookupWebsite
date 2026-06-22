# API Design v2

Tất cả API riêng tư dùng `Authorization: Bearer <token>`. Lỗi trả `{ "message": "..." }`.

## Autocomplete

`GET /api/drugs/autocomplete?keyword=para`

```json
{"items":[{"id":1,"tenThuoc":"Paracetamol 500mg","hoatChat":"Paracetamol","canKeDon":false}]}
```

- Từ khóa dưới 2 ký tự trả danh sách rỗng.
- Xếp hạng: tên thuốc, tên quốc tế, tên khác, hoạt chất; tối đa 10.
- Chuẩn hóa Unicode để tìm được tiếng Việt không dấu.

## Google Authentication

- `POST /api/auth/google`: trả `enabled`, `clientId` công khai.
- `POST /api/auth/google/callback`: body `{ "credential": "Google ID token" }`.
- Backend xác minh chữ ký, issuer, audience và hạn token trước khi tạo/liên kết tài khoản.

## AI có kiểm duyệt

- `POST /api/ai/generate`: bệnh nhân yêu cầu diễn giải cảnh báo DB.
- `GET /api/ai/pending`: nhân viên chuyên môn xem hàng chờ.
- `POST /api/ai/approve`: body `{ "id": 1 }`.
- `POST /api/ai/reject`: body `{ "id": 1 }`.
- `GET /api/ai/approved`: người dùng xem nội dung đã duyệt của mình.
- `GET /api/admin/ai-logs`: admin truy vết hoạt động AI.

AI chỉ chấp nhận nguồn `QuyTacCanhBao`, `CanhBaoDiUng_HoatChat`, `TuongTacHoatChat` và tác vụ `EXPLAIN_WARNING`.

