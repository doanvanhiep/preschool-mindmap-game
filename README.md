# Cô giáo của con

Trò chơi sơ đồ tư duy tiếng Việt cho trẻ mầm non, chủ đề **Cô giáo và trường lớp**. Bé tự do điền 7 ô tranh về hoạt động của cô, thái độ của cô và tình cảm của bé.

HTML/CSS/JavaScript thuần. Không framework, API, tài khoản người chơi, backend, database, bundler hay bước build. Tất cả hình ảnh và âm thanh đều nằm trong repository.

## Chạy trò chơi

Mở `index.html` bằng trình duyệt hiện đại (Chrome, Edge, Firefox hoặc Safari). Trò chơi dùng script thường nên không cần máy chủ để tải dữ liệu.

Để kiểm tra trên một địa chỉ HTTP ổn định, tại thư mục dự án chạy:

```sh
python -m http.server 5173 --bind 127.0.0.1
```

Mở `http://127.0.0.1:5173/`. Python chỉ phục vụ tệp khi phát triển, không phải backend của trò chơi. Nếu Windows chỉ có Python theo đường dẫn cài đặt, dùng đường dẫn đầy đủ đến `python.exe`.

Tiến độ lưu trên chính trình duyệt và địa chỉ đang dùng, với khóa `preschool_mindmap_game_v1`. Bản local và bản GitHub Pages có tiến độ riêng. Hành vi LocalStorage của địa chỉ `file://` phụ thuộc trình duyệt; dùng HTTP hoặc GitHub Pages nếu cần lưu ổn định. Khi không lưu được, trang báo và vẫn cho chơi trong bộ nhớ.

## Cách chơi

- Chạm bất kỳ ô trống nào. Không cần điền trung tâm trước.
- Ô trung tâm có 3 tranh, một tranh đúng.
- Mỗi nhánh có 3 tranh, hai tranh đúng. Ô nào được điền trước cũng có 3 lựa chọn; ô còn lại có 2 lựa chọn. Tranh đúng đã dùng không được chọn lại.
- Từ trung tâm nối đến 3 nhánh; mỗi nhánh tách thành 2 mũi tên hướng vào 2 ô tranh, tổng cộng 6 đầu mũi tên.
- Chọn sai không mất tiến độ hoặc loại đáp án. Chọn đúng sẽ điền tranh và khóa ô.
- Tải lại trang để tiếp tục, kể cả khi đang mở hộp chọn tranh.
- Hoàn thành 7 ô để nhận lời chúc mừng. Đóng lời chúc mừng để xem sơ đồ; dùng nút trái tim ở đầu trang để chơi lại.
- Các hộp thoại dùng được bằng bàn phím, hỗ trợ Escape, giữ focus và trả focus khi đóng. Hiệu ứng tôn trọng cài đặt giảm chuyển động của thiết bị.

## Cấu trúc

```text
index.html
css/style.css
js/game-data.js          # Cấu hình nội dung và hình ảnh
js/storage.js            # Kiểm tra và lưu/khôi phục trạng thái
js/game.js               # Luật chơi thuần và tương tác giao diện
assets/images/central/
assets/images/emotion/
assets/images/action/
assets/images/attitude/
assets/images/flower.svg
assets/sounds/correct.mp3
assets/sounds/wrong.mp3
assets/sounds/complete.mp3
tests/game.test.cjs
scripts/generate-assets.py
.nojekyll
```

## Thay ảnh hoặc nội dung

Sửa cấu hình trong `js/game-data.js`. Mỗi ảnh có `id`, `src`, `description`, `isCorrect`. Mỗi nhóm có `id`, `title`, `question`, `slots`, `options`; ba nhánh có thêm thông tin trình bày. Nội dung cấu hình được đưa lên giao diện bằng `textContent`.

Giữ ID ảnh duy nhất, ID ô ổn định, 3 lựa chọn/nhóm, một đáp án đúng ở trung tâm và hai đáp án đúng ở mỗi nhánh. Dùng đường dẫn tương đối, chẳng hạn `assets/images/emotion/tcct1d.jpg`, không dùng `/assets/...`. Ảnh dọc và ngang đều hiển thị đầy đủ bằng `object-fit: contain`.

| Nhóm | Đáp án đúng | Đáp án sai |
|---|---|---|
| Trung tâm | `ttd.jpg` | `tt1s.png`, `tt2s.png` |
| Hoạt động của cô | `hdcc1d.jpg`, `hdcc2d.jpg` | `hdccs.jpg` |
| Thái độ của cô | `tdcc1d.jpg`, `tdcc2d.jpg` | `tdccs.jpg` |
| Tình cảm của bé | `tcct1d.jpg`, `tcct2d.jpg` | `tccts.jpg` |

Bộ ảnh JPG/PNG hiện tại do người dùng cung cấp, được sao chép nguyên vẹn vào dự án. Hậu tố d là đáp án đúng, s là đáp án sai. Nhóm tình cảm sử dụng tcct1d.jpg, tcct2d.jpg và tccts.jpg (tương ứng nhóm tccb trong yêu cầu). Ba âm báo được tạo riêng cho dự án, không cần dịch vụ bên ngoài. Script sau chỉ tạo lại các SVG mẫu cũ, không thay thế bộ ảnh JPG/PNG hiện tại. Để tạo lại SVG mẫu, chạy `python scripts/generate-assets.py`. Để tạo lại MP3, cài **công cụ tác giả tùy chọn** `lameenc` trong môi trường Python riêng rồi chạy `python scripts/generate-assets.py --audio`. Người chơi và website không cần Python hoặc thư viện này.

Bộ tranh hiện tại có contentVersion = 2; tiến độ của bộ tranh cũ sẽ bắt đầu lại để tránh hiển thị nhầm đáp án. Nếu thay đổi ý nghĩa hoặc ID dữ liệu, tăng contentVersion trong js/game-data.js hoặc tăng phiên bản trạng thái và khóa lưu trong `js/storage.js`, hoặc xóa khóa cũ trên trình duyệt thử nghiệm. Dữ liệu không hợp lệ sẽ được bỏ qua an toàn.

## Kiểm thử

Node.js chỉ cần để chạy kiểm thử khi phát triển, không cần để chơi:

```sh
node --test tests/game.test.cjs
node --check js/game-data.js
node --check js/storage.js
node --check js/game.js
```

Kiểm thử tự động bao gồm thứ tự điền trái/phải, thứ tự dùng hai đáp án đúng, tính độc lập của nhánh, chống dùng lại ảnh, hoàn thành, khôi phục hộp chọn ảnh, JSON hỏng, dữ liệu mâu thuẫn và LocalStorage bị chặn/đầy.

Kiểm tra thực tế trên trình duyệt: âm thanh đúng/sai/hoàn thành, nhấp nhanh, đóng bằng X/Escape, hủy và xác nhận chơi lại; reload giữa chừng/khi chọn ảnh/sau hoàn thành; desktop, tablet và mobile 360 px không tràn ngang. Kiểm tra thêm đường dẫn ảnh/âm thanh sau khi xuất bản.

### Kết quả kiểm tra MVP — 14/11/2026

- 43/43 kiểm thử Node đạt; bao gồm ánh xạ đáp án của bộ ảnh người dùng và loại bỏ tiến độ của bộ tranh cũ. Ba tệp JavaScript qua kiểm tra cú pháp.
- Bộ ảnh mới: 12/12 tệp trùng khớp từng byte với bản gốc. Sáu mũi tên trỏ đúng vào hai ô của mỗi nhánh; chơi đủ bảy ảnh và reload hộp chọn ảnh thành công.
- Chrome: hoàn thành toàn bộ 7 ô, chọn sai tại cả bốn nhóm, chọn ô phải trước, chống chọn lặp, reload giữ đúng lựa chọn/hộp thoại, đóng lời chúc mừng không mở lại, hủy/xác nhận chơi lại và Escape trả focus đúng ô.
- Chrome ở kích thước 1280 px, 768 px và 360 px không tràn ngang; thẻ chọn ảnh mobile lớn hơn 44 px, hộp thoại nằm trong màn hình. Chế độ giảm chuyển động tắt hiệu ứng.
- Cả ba MP3 tải và giải mã thành công. Mô phỏng từ chối phát âm thanh không tạo lỗi Promise chưa xử lý.
- Trình duyệt vẫn chơi được khi LocalStorage bị chặn/đầy; JSON hỏng khôi phục an toàn và lưu được sau đó.
- Mở trực tiếp qua `file://` trong Chrome: chơi, tải ảnh và giữ tiến độ sau reload thành công. Vẫn nên dùng HTTP để tránh khác biệt lưu trữ giữa trình duyệt.
- Chưa xác minh trên Safari/Firefox hoặc thiết bị cảm ứng thật. Công cụ chụp màn hình của phiên làm việc bị timeout; kiểm tra bố cục dùng kích thước phần tử thực tế trong trình duyệt.

## Xuất bản GitHub Pages

Repository đích: `https://github.com/doanvanhiep/preschool-mindmap-game`.

Nếu tạo mới, đăng nhập GitHub CLI với tài khoản `doanvanhiep`, khởi tạo Git, commit rồi tạo repository công khai:

```sh
gh auth login --hostname github.com --git-protocol https --web
git init -b main
git add .
git commit -m "Build preschool mind map game"
gh repo create doanvanhiep/preschool-mindmap-game --public --source=. --remote=origin --push
```

Nếu repository đã tồn tại, kiểm tra chủ sở hữu và nội dung trước khi thêm remote hoặc push; không ghi đè lịch sử bằng force push.

Trong **Settings → Pages**, chọn **Deploy from a branch**, nhánh **main**, thư mục **/(root)** rồi Save. Tệp `.nojekyll` cho phép phục vụ nội dung tĩnh trực tiếp. Không cần workflow build riêng hoặc dịch vụ Sites.

Địa chỉ dự kiến sau khi GitHub triển khai thành công: `https://doanvanhiep.github.io/preschool-mindmap-game/`.

Cập nhật sau này: commit và push lên `main`, đợi Pages triển khai, rồi kiểm tra ảnh, MP3, chơi và reload trên URL công khai. Theo dõi trạng thái triển khai tại tab **Actions** hoặc **Settings → Pages**; việc có mã nguồn local không đồng nghĩa website đã được xuất bản.
