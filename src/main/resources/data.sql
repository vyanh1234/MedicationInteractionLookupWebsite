insert into BenhNen(TenBenh,TenThongDung,MoTa) values
('Tăng huyết áp','Cao huyết áp','Huyết áp động mạch tăng kéo dài'),('Suy gan','Chức năng gan suy giảm','Khả năng chuyển hóa và thải độc của gan suy giảm'),('Suy thận','Chức năng thận suy giảm','Thận giảm khả năng lọc và bài tiết'),('Hen phế quản','Hen suyễn','Bệnh viêm mạn tính đường thở');
insert into DiUng(TenDiUng,MoTa) values ('Dị ứng NSAID','Phản ứng với nhóm thuốc kháng viêm không steroid'),('Dị ứng Paracetamol','Phản ứng quá mẫn với paracetamol'),('Dị ứng Penicillin','Phản ứng với kháng sinh beta-lactam');
insert into HoatChat(TenHoatChat,MoTa) values ('Paracetamol','Giảm đau, hạ sốt'),('Ibuprofen','Kháng viêm không steroid'),('Acetylsalicylic acid','Aspirin - kháng viêm và chống kết tập tiểu cầu'),('Amlodipine','Chẹn kênh canxi điều trị tăng huyết áp');
insert into Thuoc(TenThuoc,TenQuocTe,DangBaoChe,HamLuong,NhaSanXuat,MoTa,CanKeDon) values
('Paracetamol 500mg','Paracetamol','Viên nén','500 mg','Dược Hậu Giang','Thuốc giảm đau và hạ sốt',0),('Ibuprofen 400mg','Ibuprofen','Viên nén','400 mg','Stada','Thuốc giảm đau kháng viêm NSAID',0),('Aspirin 81mg','Acetylsalicylic acid','Viên bao tan trong ruột','81 mg','Traphaco','Thuốc chống kết tập tiểu cầu',1),('Amlodipine 5mg','Amlodipine','Viên nén','5 mg','Domesco','Thuốc điều trị tăng huyết áp',1);
insert into Thuoc_TenKhac(MaThuoc,TenKhac) values (1,'Panadol'),(1,'Panadol Extra'),(2,'Advil'),(3,'ASA'),(4,'Norvasc');
insert into Thuoc_HoatChat values (1,1,'500 mg'),(2,2,'400 mg'),(3,3,'81 mg'),(4,4,'5 mg');
insert into QuyTacCanhBao(MaHoatChat,MaBenhNen,MucDo,NoiDung,KhuyenNghi,Nguon,TrangThai) values
(1,2,'Cao','Paracetamol có thể làm tăng gánh nặng chuyển hóa ở gan.','Không tự dùng liều cao; cần được bác sĩ đánh giá chức năng gan.','Tờ hướng dẫn sử dụng Paracetamol','DaDuyet'),
(2,1,'TrungBinh','Ibuprofen có thể làm tăng huyết áp và giảm hiệu quả một số thuốc hạ áp.','Theo dõi huyết áp và hỏi bác sĩ trước khi sử dụng.','Hướng dẫn sử dụng NSAID','DaDuyet'),
(2,3,'Cao','Ibuprofen có thể làm giảm tưới máu thận và khiến chức năng thận xấu đi.','Tránh tự sử dụng; trao đổi ngay với bác sĩ/dược sĩ.','Hướng dẫn sử dụng NSAID','DaDuyet'),
(3,4,'Cao','Aspirin có thể khởi phát co thắt phế quản ở người nhạy cảm.','Không tự sử dụng khi từng có phản ứng với aspirin/NSAID.','Hướng dẫn sử dụng Aspirin','DaDuyet');
insert into CanhBaoDiUng_HoatChat values (1,2,'Cao','Hoạt chất Ibuprofen thuộc nhóm NSAID đã khai báo dị ứng.'),(1,3,'Cao','Aspirin có thể gây phản ứng chéo ở người dị ứng NSAID.'),(2,1,'Cao','Thuốc chứa Paracetamol trùng với dị ứng đã khai báo.');
insert into TuongTacHoatChat(MaHoatChat1,MaHoatChat2,MucDo,HauQua,KhuyenNghi) values (2,4,'TrungBinh','Ibuprofen có thể làm giảm tác dụng hạ huyết áp.','Theo dõi huyết áp; hỏi bác sĩ về thuốc giảm đau thay thế.'),(2,3,'Cao','Tăng nguy cơ kích ứng và xuất huyết tiêu hóa.','Không phối hợp nếu chưa có chỉ định chuyên môn.');
