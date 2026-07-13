# Báo Cáo Chương 3, 4, 5 - Ngô Minh Đức

Phần dưới đây mô tả chi tiết nội dung, các bước thực hiện và luồng dữ liệu của Phân hệ Giao dịch & Thanh toán trong hệ thống TicketBox. *(Ghi chú: Các hình ảnh Sơ đồ Usecase, Sơ đồ tuần tự và Sơ đồ hoạt động tương ứng sẽ được chèn trực tiếp vào bản in/bản word của báo cáo).*

## 1. Sơ đồ hoạt động - Quy trình Mua vé và thanh toán cơ bản

Trong quy trình mua vé và thanh toán cơ bản, hệ thống xử lý qua các bước tuần tự và chặt chẽ giữa Sinh viên, Hệ thống TicketBox và Cổng thanh toán VNPay:

- **Khởi tạo thanh toán:** Sau khi đăng nhập và chọn sự kiện (ChonSuKien), sinh viên vào giao diện thanh toán và bấm chọn "Thanh toán bằng VNPay" (phương thức tự thanh toán cá nhân).
- **Yêu cầu tạo URL:** Frontend (Next.js) gọi API `GET /api/payment/create-url` truyền lên ID đơn hàng cho `PaymentController` (Backend).
- **Xử lý tại Backend:** `PaymentController` chuyển tiếp yêu cầu đến `VNPayService`. Dịch vụ này truy vấn CSDL MySQL để lấy thông tin đơn hàng (`Order Entity` với tổng tiền tương ứng).
- **Tạo chữ ký bảo mật:** `VNPayService` khởi tạo các tham số cần thiết và băm dữ liệu với thuật toán `HMAC SHA512` để đảm bảo tính toàn vẹn của URL thanh toán.
- **Thực hiện giao dịch:** Backend trả liên kết thanh toán dạng JSON về cho Frontend, sau đó Frontend tự động chuyển hướng (RedirectToBank) sinh viên sang giao diện của cổng VNPay. Tại đây, sinh viên nhập thông tin thẻ, OTP hoặc dùng App Bank để xác nhận giao dịch.
- **Xử lý ngoại lệ ở bước thanh toán:** Nếu sinh viên hủy thanh toán hoặc tài khoản không đủ số dư (Hủy thanh toán / Lỗi số dư), luồng sẽ chuyển sang nhánh báo lỗi (TransError), đưa người dùng trở lại màn hình đơn hàng để thử lại luồng thanh toán.

## 2. Sơ đồ hoạt động - Quy trình Thanh toán chia nhóm (Split Payment)

Tính năng thanh toán nhóm/chia hóa đơn (Split Payment) cho phép một nhóm mua vé chung nhưng mỗi thành viên có thể tự thanh toán phần của mình một cách độc lập:

- **Khởi tạo đơn nhóm:** Trưởng nhóm đặt đơn vé tổng và chọn phương thức "Thanh toán nhóm".
- **Chia đều hóa đơn:** Frontend gửi yêu cầu chia hóa đơn `POST /api/orders/split` với thông tin `orderId` và số lượng người (`splitCount`). Backend truy xuất đơn hàng gốc từ MySQL DB và tiến hành chia hóa đơn thành các phần tiền nhỏ bằng nhau (CreateSubLinks).
- **Tạo SubPayment:** Hệ thống tự động tạo ra các đơn thanh toán phụ (SubPayment) với trạng thái `PENDING`, mỗi đơn có một `linkCode` riêng biệt và được `INSERT` vào CSDL. Đơn hàng gốc được cập nhật đánh dấu `is_split_payment = true`.
- **Phân phối link:** Backend trả về danh sách các link thanh toán nhanh. Frontend hiển thị dưới dạng liên kết hoặc mã QR để trưởng nhóm sao chép và phân phối (DistributeLinks) cho các bạn bè cùng nhóm.
- **Thành viên thanh toán:** Từng thành viên truy cập vào link thanh toán phụ của mình (`GET /api/payment/sub-pay?linkCode=...`). Backend truy vấn CSDL bằng `linkCode`, lấy ra thông tin SubPayment tương ứng và điều hướng thành viên sang cổng VNPay để thanh toán phần tiền của cá nhân.

## 3. Sơ đồ hoạt động - Luồng xử lý Webhook và Xử lý ngoại lệ

Sau khi người dùng (hoặc thành viên nhóm) thực hiện giao dịch, VNPay sẽ gọi Webhook (IPN Callback) trả kết quả về cho hệ thống. Luồng xử lý và đối soát (WebhookResult) diễn ra nghiêm ngặt như sau:

- **Nhận Webhook (IPN Callback):** VNPay gọi API `/api/payment/vnpay-return` mang theo các tham số kết quả giao dịch và mã băm `vnp_SecureHash`.
- **Xác thực chữ ký số:** `PaymentController` tính toán lại chữ ký HMAC SHA512 để đối soát:
  - **Trường hợp chữ ký giả mạo (Invalid Checksum):** Nhánh `SecurityBlock` được kích hoạt, hệ thống ghi log cảnh báo bảo mật (LogFraud), khóa đơn hàng và trả về mã lỗi `97` cho phía VNPay.
- **Kiểm tra trạng thái đơn hàng (Sử dụng Lock tránh Race Condition):**
  - Hệ thống sử dụng lệnh `SELECT ... FOR UPDATE` để khóa row của đơn hàng, ngăn chặn việc xử lý đồng thời gây sai lệch dữ liệu.
  - Nếu đơn hàng đã ở trạng thái `PAID`: Hệ thống nhận diện đây là Callback trùng lặp (Already Processed) và trả về mã `02` ("Order already confirmed").
  - Nếu số tiền trả về không khớp với CSDL: Trả về lỗi `04` ("Invalid Amount").
- **Cập nhật thành công (Process Success):** Nếu chữ ký hợp lệ và mã phản hồi `vnp_ResponseCode == 00` (Giao dịch thành công):
  - **Đối với thanh toán cá nhân:** Hệ thống đổi trạng thái đơn hàng thành ĐÃ THANH TOÁN (`PAID`), lưu mã tham chiếu giao dịch. Tiến hành trừ phí hoa hồng, cộng doanh thu vào ví BTC (DeductRevenue & PostAccountingLedger), cấp phát vé điện tử và trả lời `00` ("Confirm Success") cho VNPay.
  - **Đối với thanh toán nhóm:** Cập nhật trạng thái `PAID` cho SubPayment hiện tại. Sau đó hệ thống `SELECT COUNT(*)` số lượng SubPayment còn lại của đơn gốc có trạng thái khác `PAID`:
    - Nếu `COUNT > 0` (vẫn còn người chưa đóng tiền): Trạng thái đơn hàng tổng vẫn giữ là `PENDING`.
    - Nếu `COUNT == 0` (tất cả mọi người đã đóng đủ tiền): Cập nhật đơn hàng chính chuyển thành `PAID`, kích hoạt cấp phát toàn bộ vé điện tử cho nhóm và thông báo hoàn tất thanh toán nhóm. Cuối cùng trả về kết quả thành công cho VNPay.
