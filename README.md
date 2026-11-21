# Thiệp mời tốt nghiệp Trương Thiên Phú — Vercel + Google Sheets

## Luồng hoạt động
Người xem gửi lời chúc trên website -> `POST /api/wishes` (Vercel) -> Google Apps Script Web App -> trang `Wishes` của Google Sheets. Không đưa URL Apps Script hoặc mã bí mật vào `index.html`.

## 1. Tạo bảng Google Sheets
1. Mở https://sheets.google.com, tạo bảng **Lời chúc tốt nghiệp - Trương Thiên Phú**.
2. Chọn **Extensions > Apps Script**.
3. Xóa mã mặc định, dán toàn bộ file `google-apps-script/Code.gs`, rồi lưu.
4. (Tùy chọn) Chạy hàm `setupWishesSheet` bằng nút Run, đồng ý cấp quyền. Hàm sẽ tạo tab `Wishes` với các cột **Thời gian | Người gửi | Lời chúc**.

## 2. Cấu hình mã bí mật trong Apps Script
1. Tạo một chuỗi ngẫu nhiên dài (ví dụ chạy `openssl rand -hex 32` trên máy cá nhân). **Không dùng chuỗi ví dụ**.
2. Apps Script > **Project Settings** (biểu tượng bánh răng) > **Script properties** > Add script property:
   - Property: `WISHES_SHARED_SECRET`
   - Value: chuỗi bí mật vừa tạo.
3. Save script properties.

## 3. Deploy Google Apps Script
1. Nhấn **Deploy > New deployment** > biểu tượng bánh răng > **Web app**.
2. **Execute as: Me** (chạy dưới tài khoản của bạn).
3. **Who has access: Anyone** (để backend Vercel gọi không cần người xem đăng nhập Google).
4. Nhấn Deploy; cấp quyền truy cập Google Sheets nếu được hỏi. Sao chép URL **Web app** kết thúc bằng `/exec`.
5. Nếu sửa code Apps Script sau này: **Deploy > Manage deployments > Edit > New version > Deploy** để mã đang chạy được cập nhật.

## 4. Deploy website lên Vercel
1. Upload project này lên GitHub và chọn **Add New > Project > Import repository** trong https://vercel.com. Hoặc mở terminal tại thư mục dự án và chạy `npx vercel --prod` (đăng nhập theo hướng dẫn).
2. **Framework Preset: Other**, **Root Directory** là thư mục chứa `index.html` và `api/`.
3. Trong **Project > Settings > Environment Variables**, thêm 2 biến cho môi trường **Production**:
   - `GOOGLE_SCRIPT_URL` = URL Apps Script `/exec` ở bước 3
   - `WISHES_SHARED_SECRET` = chuỗi bí mật ở bước 2
4. **Redeploy** production nếu bạn thêm biến môi trường sau lần deploy đầu.

## 5. Kiểm tra
1. Mở URL của website Vercel, mở thiệp, kéo xuống phần gửi lời chúc.
2. Gửi một lời chúc thử nghiệm. Website chỉ thông báo thành công nếu Apps Script trả `{ "ok": true }`.
3. Mở Google Sheets và kiểm tra có dòng tương ứng trong tab `Wishes`.
4. Để tải Excel: **Google Sheets > File > Download > Microsoft Excel (.xlsx)**.

## Lưu ý
- Không chia sẻ `WISHES_SHARED_SECRET` hoặc URL `/exec` công khai; không commit file `.env` chứa giá trị thực lên GitHub. Dùng Vercel Environment Variables.
- Google Apps Script deployed `Anyone` có thể nhận yêu cầu từ internet. Mã bí mật phía server bảo vệ chống gửi trực tiếp không có token, nhưng website public vẫn có thể bị spam. Honeypot chỉ chống bot sơ bộ; nên thêm rate limit/CAPTCHA nếu lượng truy cập lớn.
- Không sửa sheet giữa lúc có lượt ghi; file Sheets để private hoặc chỉ chia sẻ với người bạn muốn.
- Dữ liệu bạn nhập vào trang được gửi tới Google Sheets do bạn sở hữu; tuân thủ quyền riêng tư của người gửi.
- Apps Script có hạn mức thực thi, không phù hợp lượng truy cập cực lớn.
