# ERD cập nhật

```mermaid
erDiagram
  TaiKhoan ||--o| BenhNhan : owns
  TaiKhoan ||--o{ GoiYAI : requests
  TaiKhoan ||--o{ NhatKyAI : creates
  BenhNhan ||--o{ BenhNhan_BenhNen : has
  BenhNhan ||--o{ BenhNhan_DiUng : has
  BenhNhan ||--o{ BenhNhan_ThuocDangDung : uses
  BenhNhan ||--o{ LichSuTraCuu : searches
  Thuoc ||--o{ Thuoc_TenKhac : aliases
  Thuoc ||--o{ Thuoc_HoatChat : contains
  HoatChat ||--o{ Thuoc_HoatChat : belongs
  HoatChat ||--o{ QuyTacCanhBao : governed_by
  BenhNen ||--o{ QuyTacCanhBao : applies_to
  LichSuTraCuu ||--o{ LichSuTraCuu_ChiTiet : details
  LichSuTraCuu_ChiTiet ||--o{ GoiYAI : explained_by
```

Thay đổi v2:

- `TaiKhoan`: `Email`, `GoogleId`, `AnhDaiDien`, `LoaiDangNhap`.
- `Thuoc`: `TenQuocTe`, `CanKeDon`; bổ sung `Thuoc_TenKhac` cho schema demo.
- `GoiYAI`: nội dung AI và trạng thái kiểm duyệt.
- `NhatKyAI`: audit đầy đủ, giữ tối thiểu 90 ngày theo chính sách vận hành.

Migration idempotent: `src/main/resources/migration-v2.sql`.

