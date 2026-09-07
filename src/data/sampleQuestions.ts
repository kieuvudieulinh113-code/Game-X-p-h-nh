import { QuestionBank } from '../types';

export const DEFAULT_QUESTION_BANKS: QuestionBank[] = [
  {
    id: 'bank_lop3_coban',
    title: 'Tin học Lớp 3 - Khám phá máy tính & thao tác cơ bản',
    grade: 'lop3',
    description: 'Bộ câu hỏi chuẩn kiến thức lớp 3 về các bộ phận máy tính, chuột, bàn phím và quy tắc an toàn.',
    isDefault: true,
    createdAt: Date.now() - 100000,
    questions: [
      {
        id: 'q3_1',
        text: 'Máy tính để bàn gồm có mấy bộ phận cơ bản nhất?',
        options: ['2 bộ phận', '3 bộ phận', '4 bộ phận (Màn hình, Thân máy, Bàn phím, Chuột)', '5 bộ phận'],
        correctOptionIndex: 2,
        explanation: 'Máy tính để bàn gồm 4 bộ phận cơ bản: Màn hình, thân máy, bàn phím và chuột máy tính.',
      },
      {
        id: 'q3_2',
        text: 'Bộ phận nào của máy tính được ví như "bộ não" điều khiển mọi hoạt động của máy tính?',
        options: ['Màn hình', 'Thân máy (có chứa CPU)', 'Chuột máy tính', 'Bàn phím'],
        correctOptionIndex: 1,
        explanation: 'Thân máy chứa bộ vi xử lý (CPU), được coi là bộ não chỉ huy mọi hoạt động của máy tính.',
      },
      {
        id: 'q3_3',
        text: 'Thao tác nhấn nhanh nút chuột trái hai lần liên tiếp rồi thả tay ra được gọi là gì?',
        options: ['Nháy chuột', 'Nháy đúp chuột', 'Nháy nút phải chuột', 'Kéo thả chuột'],
        correctOptionIndex: 1,
        explanation: 'Nháy đúp chuột là thao tác nhấn nhanh nút trái chuột 2 lần liên tiếp.',
      },
      {
        id: 'q3_4',
        text: 'Hàng phím cơ sở trên bàn phím có hai phím có gờ để đặt hai ngón trỏ là phím nào?',
        options: ['Phím A và phím L', 'Phím F và phím J', 'Phím G và phím H', 'Phím Space và phím Enter'],
        correctOptionIndex: 1,
        explanation: 'Phím F (ngón trỏ trái) và phím J (ngón trỏ phải) là hai phím có gờ trên hàng phím cơ sở.',
      },
      {
        id: 'q3_5',
        text: 'Phím dài nhất trên bàn phím máy tính dùng để tạo khoảng trắng giữa các từ có tên là gì?',
        options: ['Phím Enter', 'Phím Shift', 'Phím Cách (Spacebar)', 'Phím Caps Lock'],
        correctOptionIndex: 2,
        explanation: 'Phím Cách (Spacebar) nằm ở hàng phím dưới cùng, dùng để gõ khoảng cách giữa các chữ.',
      },
      {
        id: 'q3_6',
        text: 'Khi ngồi sử dụng máy tính, tư thế nào sau đây là đúng và bảo vệ sức khỏe?',
        options: [
          'Ngồi gù lưng, mắt nhìn thật sát màn hình',
          'Lưng thẳng, mắt ngang tầm màn hình cách khoảng 50 - 80 cm',
          'Nằm ra bàn vừa xem vừa gõ',
          'Ngồi vẹo sang một bên để bấm chuột'
        ],
        correctOptionIndex: 1,
        explanation: 'Ngồi thẳng lưng, hai bàn chân đặt phẳng trên sàn, mắt cách màn hình từ 50-80cm giúp bảo vệ mắt và cột sống.',
      },
      {
        id: 'q3_7',
        text: 'Thông tin có thể ở những dạng cơ bản nào mà em đã học?',
        options: ['Dạng chữ viết, dạng hình ảnh, dạng âm thanh', 'Chỉ có dạng văn bản chữ viết', 'Chỉ có dạng video clip', 'Dạng số và dạng bảng'],
        correctOptionIndex: 0,
        explanation: 'Ba dạng thông tin cơ bản quen thuộc là: Dạng chữ viết (văn bản), dạng hình ảnh và dạng âm thanh.',
      },
      {
        id: 'q3_8',
        text: 'Để tắt máy tính đúng quy trình và an toàn, em nên làm thế nào?',
        options: [
          'Rút thẳng phích cắm điện của máy tính',
          'Bấm nút nguồn trên thân máy',
          'Vào Start chọn nút Nguồn rồi chọn Shut down',
          'Tắt công tắc ổ điện ngay'
        ],
        correctOptionIndex: 2,
        explanation: 'Cần vào Start -> Nguồn (Power) -> Shut down để hệ điều hành lưu dữ liệu và tắt an toàn.',
      },
      {
        id: 'q3_9',
        text: 'Trên chuột máy tính thông thường có những nút nào?',
        options: [
          'Nút trái, nút phải và nút cuộn ở giữa',
          'Chỉ có 1 nút bấm ở giữa',
          'Có 4 nút bấm xung quanh',
          'Nút nguồn và nút âm lượng'
        ],
        correctOptionIndex: 0,
        explanation: 'Chuột máy tính thông dụng có nút chuột trái, nút chuột phải và bánh xe cuộn ở giữa.',
      },
      {
        id: 'q3_10',
        text: 'Khi đang dùng máy tính trong phòng thực hành, nếu phát hiện dây điện bị hở hoặc có mùi khét, em cần làm gì?',
        options: [
          'Tự lấy kéo hoặc băng dính ra sửa',
          'Báo ngay cho thầy cô giáo phụ trách',
          'Rủ bạn lại gần sờ vào xem sao',
          'Tiếp tục ngồi chơi không quan tâm'
        ],
        correctOptionIndex: 1,
        explanation: 'Phải thông báo ngay lập tức cho thầy cô giáo hoặc người lớn để xử lý an toàn.',
      }
    ]
  },
  {
    id: 'bank_lop4_nangcao',
    title: 'Tin học Lớp 4 - Tệp, Thư mục & Internet An Toàn',
    grade: 'lop4',
    description: 'Bộ câu hỏi lớp 4 về quản lý tệp tin, thư mục, sử dụng Internet thông thái và soạn thảo văn bản.',
    isDefault: true,
    createdAt: Date.now() - 50000,
    questions: [
      {
        id: 'q4_1',
        text: 'Biểu tượng của Thư mục (Folder) trong hệ điều hành Windows thường có màu gì đặc trưng?',
        options: ['Màu đỏ', 'Màu xanh lá cây', 'Màu vàng (hình chiếc kẹp tài liệu)', 'Màu tím'],
        correctOptionIndex: 2,
        explanation: 'Thư mục thường có biểu tượng chiếc cặp tài liệu màu vàng quen thuộc.',
      },
      {
        id: 'q4_2',
        text: 'Việc tổ chức các tệp tin trong thư mục ngăn nắp giống như việc gì trong đời sống?',
        options: [
          'Vứt đồ chơi lung tung ra sàn nhà',
          'Sắp xếp sách vở gọn gàng vào từng ngăn cặp',
          'Bỏ tất cả quần áo lẫn lộn vào một túi',
          'Xé vụn giấy tờ'
        ],
        correctOptionIndex: 1,
        explanation: 'Thư mục giúp phân loại và lưu trữ tài liệu ngăn nắp, dễ dàng tìm kiếm khi cần.',
      },
      {
        id: 'q4_3',
        text: 'Khi tham gia Internet, thông tin cá nhân nào sau đây TUYỆT ĐỐI KHÔNG chia sẻ cho người lạ?',
        options: [
          'Món ăn em yêu thích',
          'Địa chỉ nhà, số điện thoại, mật khẩu tài khoản và tên trường lớp',
          'Tên một nhân vật hoạt hình em thích',
          'Bài hát thiếu nhi em nghe'
        ],
        correctOptionIndex: 1,
        explanation: 'Không được cung cấp thông tin cá nhân như địa chỉ nhà, số điện thoại, mật khẩu cho người lạ trên mạng.',
      },
      {
        id: 'q4_4',
        text: 'Trong phần mềm soạn thảo văn bản Word, muốn gõ chữ in hoa em giữ phím nào kết hợp với chữ cái?',
        options: ['Phím Ctrl', 'Phím Shift (hoặc bật Caps Lock)', 'Phím Alt', 'Phím Tab'],
        correctOptionIndex: 1,
        explanation: 'Giữ phím Shift kết hợp chữ cái để gõ chữ hoa, hoặc bật đèn phím Caps Lock.',
      },
      {
        id: 'q4_5',
        text: 'Tổ hợp phím tắt nào dùng để LƯU (Save) văn bản một cách nhanh nhất?',
        options: ['Ctrl + C', 'Ctrl + V', 'Ctrl + S', 'Ctrl + Z'],
        correctOptionIndex: 2,
        explanation: 'Ctrl + S (Save) là phím tắt lưu lại văn bản đang soạn thảo.',
      },
      {
        id: 'q4_6',
        text: 'Trong phần mềm Scratch, chú Mèo di chuyển được là nhờ điều gì?',
        options: [
          'Chú mèo tự nghĩ ra và chạy',
          'Nhờ các khối lệnh lập trình được ghép nối theo thứ tự',
          'Nhờ bàn phím tự bấm',
          'Do màn hình rung chuyển'
        ],
        correctOptionIndex: 1,
        explanation: 'Các nhân vật chuyển động và biểu diễn dựa trên các khối lệnh lập trình logic do người dùng ghép lại.',
      },
      {
        id: 'q4_7',
        text: 'Để tìm kiếm thông tin về "Địa đạo Củ Chi" trên công cụ tìm kiếm Google, em nên gõ từ khóa thế nào?',
        options: [
          'Gõ nguyên một câu dài: "Hãy cho tôi biết hết mọi thứ về địa danh đó"',
          'Gõ từ khóa ngắn gọn, chính xác: "Địa đạo Củ Chi"',
          'Chỉ gõ dấu chấm hỏi (?)',
          'Gõ linh tinh không có nghĩa'
        ],
        correctOptionIndex: 1,
        explanation: 'Từ khóa tìm kiếm cần ngắn gọn, rõ ràng, đúng trọng tâm điều cần tra cứu.',
      },
      {
        id: 'q4_8',
        text: 'Một tệp tin thông thường gồm có hai phần ngăn cách bởi dấu chấm (.), đó là:',
        options: [
          'Tên tệp và Phần mở rộng (Đuôi tệp)',
          'Tên tác giả và Tên trường',
          'Ngày tạo và Giờ tạo',
          'Màu sắc và Kích thước'
        ],
        correctOptionIndex: 0,
        explanation: 'Tệp tin gồm Phần Tên và Phần Mở rộng (ví dụ: BaiHoc.docx, AnhDep.png).',
      },
      {
        id: 'q4_9',
        text: 'Em cần làm gì khi gặp một trang web có nội dung bạo lực hoặc yêu cầu nạp tiền lạ?',
        options: [
          'Tiếp tục bấm xem và làm theo hướng dẫn',
          'Đóng ngay trang web đó và báo cho cha mẹ hoặc thầy cô giáo',
          'Chia sẻ liên kết đó cho tất cả bạn bè trong lớp',
          'Lấy tiền của bố mẹ nạp vào'
        ],
        correctOptionIndex: 1,
        explanation: 'Cần đóng ngay trang web độc hại và báo ngay cho người lớn đáng tin cậy hỗ trợ.',
      },
      {
        id: 'q4_10',
        text: 'Trong bài soạn thảo văn bản, để chèn một hình ảnh minh họa từ máy tính, em chọn thẻ nào trên thanh bảng chọn?',
        options: ['Thẻ Home', 'Thẻ Insert (Chèn)', 'Thẻ View', 'Thẻ Review'],
        correctOptionIndex: 1,
        explanation: 'Vào thẻ Insert -> Chọn Pictures để chèn tranh ảnh vào văn bản.',
      }
    ]
  },
  {
    id: 'bank_lop3_banphim',
    title: 'Tin học Lớp 3 - Bàn phím & Luyện gõ 10 ngón',
    grade: 'lop3',
    description: 'Rèn luyện kiến thức về các hàng phím, khu vực bàn phím chính, phím đặc biệt và quy tắc gõ 10 ngón.',
    isDefault: true,
    createdAt: Date.now() - 80000,
    questions: [
      {
        id: 'q3_b1',
        text: 'Hàng phím quan trọng nhất trên bàn phím là điểm xuất phát của 10 ngón tay được gọi là gì?',
        options: ['Hàng phím số', 'Hàng phím trên', 'Hàng phím cơ sở', 'Hàng phím dưới'],
        correctOptionIndex: 2,
        explanation: 'Hàng phím cơ sở là hàng phím quan trọng nhất, nơi 10 ngón tay luôn đặt ở vị trí xuất phát.',
      },
      {
        id: 'q3_b2',
        text: 'Trên hàng phím cơ sở, ngón trỏ của bàn tay trái đặt lên phím nào?',
        options: ['Phím A', 'Phím S', 'Phím D', 'Phím F'],
        correctOptionIndex: 3,
        explanation: 'Ngón trỏ tay trái luôn đặt lên phím F (phím có gờ nổi để nhận biết).',
      },
      {
        id: 'q3_b3',
        text: 'Trên hàng phím cơ sở, ngón trỏ của bàn tay phải đặt lên phím nào?',
        options: ['Phím H', 'Phím J', 'Phím K', 'Phím L'],
        correctOptionIndex: 1,
        explanation: 'Ngón trỏ tay phải luôn đặt lên phím J (phím có gờ nổi).',
      },
      {
        id: 'q3_b4',
        text: 'Hai ngón tay cái của chúng ta có nhiệm vụ gõ phím nào trên bàn phím?',
        options: ['Phím Shift', 'Phím Enter', 'Phím Cách (Space)', 'Phím Backspace'],
        correctOptionIndex: 2,
        explanation: 'Hai ngón cái luôn phụ trách việc bấm phím Cách (Spacebar) để tạo khoảng cách.',
      },
      {
        id: 'q3_b5',
        text: 'Khi gõ sai một chữ, để xóa ký tự ở bên TRÁI con trỏ soạn thảo, em dùng phím nào?',
        options: ['Phím Delete', 'Phím Backspace (phím lùi)', 'Phím Esc', 'Phím Enter'],
        correctOptionIndex: 1,
        explanation: 'Phím Backspace (có hình mũi tên trỏ sang trái) dùng để xóa ký tự bên trái con trỏ.',
      },
      {
        id: 'q3_b6',
        text: 'Để xóa ký tự ở bên PHẢI con trỏ soạn thảo, em sử dụng phím nào?',
        options: ['Phím Delete (Del)', 'Phím Backspace', 'Phím Space', 'Phím Tab'],
        correctOptionIndex: 0,
        explanation: 'Phím Delete (Del) dùng để xóa ký tự nằm ở ngay bên phải con trỏ.',
      },
      {
        id: 'q3_b7',
        text: 'Để xuống một dòng mới khi đang soạn thảo văn bản, em bấm phím nào?',
        options: ['Phím Caps Lock', 'Phím Shift', 'Phím Enter', 'Phím Ctrl'],
        correctOptionIndex: 2,
        explanation: 'Phím Enter dùng để kết thúc đoạn văn hoặc chuyển con trỏ xuống dòng tiếp theo.',
      },
      {
        id: 'q3_b8',
        text: 'Muốn bật chế độ viết hoa toàn bộ các chữ cái liên tục, em nhấn phím nào?',
        options: ['Phím Caps Lock', 'Phím Alt', 'Phím Windows', 'Phím Tab'],
        correctOptionIndex: 0,
        explanation: 'Phím Caps Lock khi bật (có đèn sáng) sẽ giúp gõ các chữ cái thành chữ hoa liên tục.',
      }
    ]
  },
  {
    id: 'bank_lop4_trinhchieu',
    title: 'Tin học Lớp 4 - Trình chiếu đa phương tiện (PowerPoint)',
    grade: 'lop4',
    description: 'Khám phá bài trình chiếu, tạo trang chiếu mới, chèn hình ảnh, tạo hiệu ứng chuyển động sinh động.',
    isDefault: true,
    createdAt: Date.now() - 30000,
    questions: [
      {
        id: 'q4_p1',
        text: 'Mỗi trang trong một tệp bài trình chiếu PowerPoint được gọi là gì?',
        options: ['Trang sách', 'Trang chiếu (Slide)', 'Trang web', 'Trang bảng tính'],
        correctOptionIndex: 1,
        explanation: 'Mỗi trang trình bày trong bài trình chiếu được gọi là một Slide (Trang chiếu).',
      },
      {
        id: 'q4_p2',
        text: 'Để tạo một trang chiếu (Slide) mới vào bài trình chiếu, em chọn lệnh nào?',
        options: ['New Slide (trong thẻ Home)', 'Delete Slide', 'Save Slide', 'Print Slide'],
        correctOptionIndex: 0,
        explanation: 'Vào thẻ Home -> chọn New Slide (hoặc bấm tổ hợp phím Ctrl + M) để thêm slide mới.',
      },
      {
        id: 'q4_p3',
        text: 'Phím tắt nào trên bàn phím dùng để BẮT ĐẦU trình chiếu toàn màn hình từ trang đầu tiên?',
        options: ['Phím F1', 'Phím F5', 'Phím F10', 'Phím F12'],
        correctOptionIndex: 1,
        explanation: 'Phím F5 dùng để khởi chạy bài thuyết trình toàn màn hình bắt đầu từ slide đầu tiên.',
      },
      {
        id: 'q4_p4',
        text: 'Khi đang trình chiếu toàn màn hình, muốn dừng chiếu và quay lại màn hình soạn thảo, em nhấn phím nào?',
        options: ['Phím Enter', 'Phím Space', 'Phím Esc (Escape)', 'Phím Ctrl'],
        correctOptionIndex: 2,
        explanation: 'Phím Esc (nằm ở góc trên cùng bên trái bàn phím) dùng để thoát chế độ trình chiếu.',
      },
      {
        id: 'q4_p5',
        text: 'Để tạo hiệu ứng xuất hiện hoặc chuyển động cho văn bản, hình ảnh trên trang chiếu, em dùng thẻ nào?',
        options: ['Thẻ File', 'Thẻ Animations (Hiệu ứng đối tượng)', 'Thẻ Review', 'Thẻ View'],
        correctOptionIndex: 1,
        explanation: 'Thẻ Animations chứa các hiệu ứng chuyển động phong phú cho hình ảnh và chữ viết.',
      },
      {
        id: 'q4_p6',
        text: 'Để bài trình chiếu hấp dẫn và người nghe dễ theo dõi, em nên thiết kế thế nào?',
        options: [
          'Chép toàn bộ cuốn sách chữ chi chít lên màn hình',
          'Chữ ngắn gọn, cô đọng, kèm hình ảnh minh họa rõ nét, màu sắc hài hòa',
          'Dùng màu chữ trùng với màu nền cho tàng hình',
          'Cho quá nhiều hiệu ứng quay cuồng làm hoa mắt'
        ],
        correctOptionIndex: 1,
        explanation: 'Bài trình chiếu cần súc tích, hình ảnh rõ ràng, màu sắc tương phản giúp học sinh dễ đọc.',
      },
      {
        id: 'q4_p7',
        text: 'Để chèn một đoạn video hoặc tệp âm thanh vào trang chiếu, em chọn thẻ nào?',
        options: ['Thẻ Home', 'Thẻ Insert -> Audio / Video', 'Thẻ Design', 'Thẻ Help'],
        correctOptionIndex: 1,
        explanation: 'Vào thẻ Insert -> chọn Video hoặc Audio để chèn đa phương tiện vào bài trình chiếu.',
      },
      {
        id: 'q4_p8',
        text: 'Đuôi mở rộng mặc định của tệp trình chiếu PowerPoint phiên bản mới thường là gì?',
        options: ['.docx', '.xlsx', '.pptx', '.mp3'],
        correctOptionIndex: 2,
        explanation: 'Tệp bài trình chiếu PowerPoint có phần mở rộng mặc định là .pptx (hoặc .ppt).',
      }
    ]
  }
];
