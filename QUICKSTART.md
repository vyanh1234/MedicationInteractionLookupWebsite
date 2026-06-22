# Chạy MedCheck

## Chế độ demo (không cần SQL Server)

Yêu cầu JDK 21 và Maven 3.9+:

```powershell
mvn spring-boot:run
```

Mở `http://localhost:8080`. H2 chạy trong bộ nhớ và tự nạp dữ liệu demo.

Tài khoản mẫu (mật khẩu `123456`):

- `patient`: bệnh nhân
- `doctor`: dược sĩ/bác sĩ
- `admin`: quản trị viên

Để thấy đủ ba lớp cảnh báo, đăng nhập `patient`, vào **Hồ sơ sức khỏe** và khai báo bệnh nền, dị ứng, thuốc đang dùng trước khi tra cứu.

## Kết nối SQL Server

```powershell
$env:DB_URL='jdbc:sqlserver://localhost:1433;databaseName=HTTraCuuThuoc_AI;encrypt=true;trustServerCertificate=true'
$env:DB_USERNAME='sa'
$env:DB_PASSWORD='your-password'
mvn spring-boot:run -Dspring-boot.run.profiles=sqlserver
```

Profile SQL Server không tự tạo hoặc xóa bảng. Các tên cột trong database thật cần tương ứng với [schema demo](src/main/resources/schema.sql). Nếu schema hiện hữu khác tên cột, hãy tạo view tương thích hoặc điều chỉnh câu SQL trong `ApiController`.

### LocalDB trên máy hiện tại

Database đã được triển khai tại `(localdb)\MSSQLLocalDB`, tên `HTTraCuuThuoc_AI`.

```powershell
dotnet run --project tools\DbDeploy\DbDeploy.csproj
mvn spring-boot:run -Dspring-boot.run.profiles=localdb
```

Lệnh đầu kiểm tra kết nối, bảng và số dòng mà không thay đổi dữ liệu. Thêm `-- --deploy` chỉ khi muốn tạo database mới; tiện ích sẽ không ghi đè schema đã tồn tại.

Áp dụng change request v2 lên database đã tồn tại:

```powershell
dotnet run --project tools\DbDeploy\DbDeploy.csproj -- --migrate
```

## Google Sign-In

Tạo OAuth Client ID loại Web tại Google Cloud Console, thêm origin `http://localhost:8080`, rồi đặt biến môi trường trước khi chạy:

```powershell
$env:GOOGLE_CLIENT_ID='your-client-id.apps.googleusercontent.com'
mvn spring-boot:run
```

Không đưa Client Secret hoặc credential người dùng vào source. Backend xác minh Google ID token và tự liên kết tài khoản có cùng email.

## AI có kiểm duyệt

AI chỉ diễn giải cảnh báo lấy từ database. Nội dung mới luôn ở trạng thái `CHO_DUYET`; đăng nhập `doctor` hoặc `admin` để duyệt tại trang quản trị. Nhật ký được lưu trong `NhatKyAI`.

## Docker

```powershell
docker build -t medcheck .
docker run --rm -p 8080:8080 medcheck
```

## Kiểm thử

```powershell
mvn test
```
