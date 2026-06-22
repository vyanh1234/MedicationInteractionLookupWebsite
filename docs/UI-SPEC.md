# UI/Figma Specification v2

## Components

- `DrugAutocomplete`: input cao 48px, dropdown tối đa 10 dòng, mỗi dòng gồm tên thuốc, nhãn kê đơn, hoạt chất.
- Trạng thái: idle, typing `<2`, loading, results, empty, error; debounce 350ms.
- `GoogleAuthButton`: nền trắng, viền trung tính, xuất hiện ở cả đăng nhập và đăng ký.
- `AiExplainButton`: đặt trong từng thẻ cảnh báo; sau khi gửi hiển thị thông báo “đang chờ duyệt”.
- `AiReviewCard`: nội dung gốc, diễn giải, nguồn, nút Duyệt/Từ chối.

## Screens

1. Auth local + Google.
2. Hồ sơ cá nhân/bệnh nền/dị ứng/thuốc đang dùng.
3. Tra cứu autocomplete → kết quả cảnh báo → yêu cầu giải thích.
4. Lịch sử và thông báo.
5. Dashboard chuyên môn: quy tắc, hàng chờ AI.
6. Dashboard admin: tài khoản, audit, AI log, thống kê.

Breakpoint: desktop ≥1024, tablet 768–1023, mobile <768. Focus ring và điều hướng bàn phím phải nhìn thấy; màu không là tín hiệu duy nhất cho mức cảnh báo.

