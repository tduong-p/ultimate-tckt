const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const state={user:null,teams:[],bootstrap:null,notifications:[],notificationUnread:0,announcedNotifications:new Set()};
const lang=localStorage.getItem('tckt-language')==='en'?'en':'vi';
const vi={
  'Overview':'Tổng quan','Activities':'Hoạt động','My tasks':'Công việc của tôi','Teams':'Tổ','People':'Thành viên','Documents':'Văn bản','Reports':'Báo cáo','Archive':'Lưu trữ','Activity Hub':'Cổng hoạt động',
  'WORK TOGETHER · REMEMBER TOGETHER':'CÙNG LÀM VIỆC · CÙNG GHI NHỚ','Every contribution.':'Mỗi đóng góp.','One shared story.':'Một câu chuyện chung.','Plan activities, coordinate teams, and preserve the work that moves our student community forward.':'Lập kế hoạch hoạt động, phối hợp các Tổ và lưu giữ những đóng góp thúc đẩy cộng đồng sinh viên.','Built for the Youth Union & Student Association':'Dành cho Đoàn Thanh niên & Hội Sinh viên',
  'WELCOME BACK':'CHÀO MỪNG TRỞ LẠI','Sign in to your workspace':'Đăng nhập vào không gian làm việc','Use your school account to continue.':'Sử dụng tài khoản trường để tiếp tục.','Sign in with Microsoft HUST':'Đăng nhập bằng tài khoản HUST','or use your local account':'hoặc sử dụng tài khoản nội bộ','Email address':'Địa chỉ email','Password':'Mật khẩu','Sign in':'Đăng nhập',
  'Active activities':'Hoạt động đang diễn ra','Open tasks':'Công việc đang mở','Overdue':'Quá hạn','Completed this month':'Hoàn thành tháng này','Upcoming activities':'Hoạt động sắp tới','View all →':'Xem tất cả →','My open tasks':'Công việc đang mở của tôi','Latest activity':'Cập nhật mới nhất','Propose activity':'Đề xuất hoạt động',
  'Activities':'Hoạt động','Plan, coordinate and follow every initiative.':'Lập kế hoạch, phối hợp và theo dõi mọi hoạt động.','Search activities…':'Tìm kiếm hoạt động…','All statuses':'Tất cả trạng thái','All types':'Tất cả loại','Team events':'Sự kiện của đơn vị','Assigned':'Được giao','No activities found':'Không tìm thấy hoạt động','Try changing your search or filters.':'Hãy thử thay đổi từ khóa hoặc bộ lọc.','Team event':'Sự kiện đơn vị','Leadership assigned':'Lãnh đạo giao',
  'Back to activities':'Quay lại hoạt động','Work plan':'Kế hoạch công việc','Add task':'Thêm công việc','Before the event':'Trước sự kiện','During the event':'Trong sự kiện','After the event':'Sau sự kiện','General':'Chung','Updates & evidence':'Cập nhật & minh chứng','Comment':'Bình luận','Progress update':'Cập nhật tiến độ','Issue':'Vấn đề','Evidence':'Minh chứng','Document URL (optional)':'Liên kết tài liệu (không bắt buộc)','Share an update with the team…':'Chia sẻ cập nhật với nhóm…','Post update':'Đăng cập nhật','No updates yet.':'Chưa có cập nhật.','View attachment ↗':'Xem tệp đính kèm ↗','Participants':'Người tham gia','Volunteer':'Đăng ký tham gia','No participants yet.':'Chưa có người tham gia.','Activity details':'Chi tiết hoạt động','Status':'Trạng thái',
  'My tasks':'Công việc của tôi','Work assigned to you and your teams.':'Công việc được giao cho bạn và các Tổ của bạn.','Open work':'Công việc đang mở','All clear':'Đã hoàn tất','You have no open tasks.':'Bạn không có công việc đang mở.','You’re all caught up':'Bạn đã hoàn thành tất cả','There are no open tasks in your queue.':'Không có công việc đang mở trong danh sách.',
  'Teams':'Tổ','The people and groups that make activities happen.':'Những con người và đơn vị cùng tạo nên các hoạt động.','New team':'Tạo Tổ','members':'thành viên','active':'đang hoạt động','No description yet.':'Chưa có mô tả.','People':'Thành viên','Recognize every member’s participation.':'Ghi nhận sự tham gia của từng thành viên.','completed tasks':'công việc đã hoàn thành',
  'Activity archive':'Kho lưu trữ hoạt động','Search the organization’s shared memory.':'Tìm kiếm kho tri thức chung của tổ chức.','Search past activities, outcomes, lessons…':'Tìm hoạt động, kết quả và bài học trước đây…','No archived activities found':'Không tìm thấy hoạt động lưu trữ','Completed activities will become part of the archive.':'Hoạt động hoàn thành sẽ được đưa vào kho lưu trữ.',
  'NEW PROPOSAL':'ĐỀ XUẤT MỚI','Propose an activity':'Đề xuất hoạt động','Start with the essentials. Tasks and participants come next.':'Bắt đầu với thông tin chính. Công việc và người tham gia sẽ được thêm sau.','Title':'Tiêu đề','Activity type':'Loại hoạt động','Team-proposed event':'Sự kiện do đơn vị đề xuất','Leadership-assigned':'Lãnh đạo giao','Responsible team':'Tổ phụ trách','Select a team':'Chọn một Tổ','Start date':'Ngày bắt đầu','Deadline':'Hạn hoàn thành','Priority':'Mức ưu tiên','Location':'Địa điểm','Optional':'Không bắt buộc','Requested by':'Người yêu cầu','For leadership-assigned work':'Dành cho công việc do lãnh đạo giao','Description':'Mô tả','What is the activity trying to achieve?':'Hoạt động hướng đến mục tiêu gì?','Create proposal':'Tạo đề xuất',
  'WORK PLAN':'KẾ HOẠCH CÔNG VIỆC','Add a task':'Thêm công việc','Assign a clear owner, stage and outcome.':'Xác định rõ người phụ trách, giai đoạn và kết quả.','Each sub-item has its own schedule, responsible team, and assignees.':'Mỗi công việc có lịch, Tổ phụ trách và người thực hiện riêng.','Task title':'Tên công việc','Stage':'Giai đoạn','Before event':'Trước sự kiện','During event':'Trong sự kiện','After event':'Sau sự kiện','Deliverable':'Sản phẩm bàn giao','What should be produced?':'Cần tạo ra sản phẩm gì?','Separate deadline':'Hạn riêng','Overall deadline':'Hạn chung','Assignees':'Người thực hiện','Involved teams':'Các Tổ tham gia','Coordinating team':'Tổ chủ trì','Hold Ctrl or Command to select multiple teams.':'Giữ Ctrl hoặc Command để chọn nhiều Tổ.','Manage members':'Quản lý thành viên','ORGANIZATION':'TỔ CHỨC','Create a team':'Tạo Tổ mới','Team name':'Tên Tổ','Team color':'Màu của Tổ','Create team':'Tạo Tổ',
  'USER MANAGEMENT':'QUẢN LÝ TÀI KHOẢN','Create an account':'Tạo tài khoản','New account':'Tạo tài khoản','Members must belong to at least one team.':'Thành viên phải thuộc ít nhất một Tổ.','Name':'Họ tên','Email':'Email','Initial password':'Mật khẩu ban đầu','Role':'Vai trò','Phone':'Điện thoại','Create account':'Tạo tài khoản','TEAM MEMBERSHIP':'THÀNH VIÊN TỔ','Add existing account':'Thêm tài khoản hiện có','Select a person':'Chọn một người','Make this person a team leader':'Đặt làm Tổ trưởng','Add to team':'Thêm vào Tổ','Every active account already belongs to this team.':'Tất cả tài khoản đang hoạt động đã thuộc Tổ này.','Start':'Bắt đầu','View only':'Chỉ xem','primary':'chủ trì','supporting':'phối hợp',
  'Files & relevant links':'Tệp & liên kết liên quan','Add':'Thêm','No files or links yet.':'Chưa có tệp hoặc liên kết.','TASK MATERIALS':'TƯ LIỆU CÔNG VIỆC','Add a relevant link, document, or photo as clarification, evidence, an issue, or a deliverable.':'Thêm liên kết, tài liệu hoặc ảnh để làm rõ, minh chứng, báo cáo vấn đề hoặc bàn giao.','Purpose':'Mục đích','Clarification':'Làm rõ','Display label':'Tên hiển thị','Short description':'Mô tả ngắn','Relevant link':'Liên kết liên quan','or upload a file':'hoặc tải tệp lên','Document or photo':'Tài liệu hoặc ảnh','Add to task':'Thêm vào công việc','clarification':'làm rõ','deliverable':'bàn giao',
  'TASK DETAIL':'CHI TIẾT CÔNG VIỆC','Start date':'Ngày bắt đầu','Assignees':'Người thực hiện','Unassigned':'Chưa phân công','Required deliverable':'Sản phẩm yêu cầu','Add material':'Thêm tư liệu','Task comments':'Trao đổi công việc','No task comments yet.':'Chưa có trao đổi.','Add a comment or progress note…':'Thêm bình luận hoặc cập nhật tiến độ…','Post comment':'Đăng bình luận','Complete this task':'Hoàn thành công việc','A comment or evidence is optional. Add context if it helps the team understand the result.':'Bình luận hoặc minh chứng là không bắt buộc. Hãy thêm thông tin nếu giúp nhóm hiểu rõ kết quả.','Completion comment (optional)':'Bình luận hoàn thành (không bắt buộc)','Evidence link (optional)':'Liên kết minh chứng (không bắt buộc)','Evidence document or photo (optional)':'Tài liệu hoặc ảnh minh chứng (không bắt buộc)','Mark task complete':'Đánh dấu hoàn thành','Completion evidence':'Minh chứng hoàn thành',
  'TEAM OVERVIEW':'TỔNG QUAN TỔ','View progress':'Xem tiến độ','Team members':'Thành viên Tổ','Current tasks & progress':'Công việc hiện tại & tiến độ','Activities':'Hoạt động','Members':'Thành viên','Open tasks':'Công việc đang mở','Progress':'Tiến độ','No members.':'Chưa có thành viên.','No current tasks.':'Không có công việc hiện tại.','No activities.':'Không có hoạt động.','No active members belong to this team.':'Không có thành viên đang hoạt động thuộc Tổ này.','Select at least one involved team.':'Chọn ít nhất một Tổ tham gia.',
  'View activities':'Xem hoạt động','Team activities':'Hoạt động của Tổ','Back to teams':'Quay lại các Tổ','Loading team members…':'Đang tải thành viên…','Select at least one assignee.':'Chọn ít nhất một người thực hiện.',
  'proposed':'đề xuất','approved':'đã duyệt','active':'đang hoạt động','completed':'hoàn thành','cancelled':'đã hủy','low':'thấp','medium':'trung bình','high':'cao','urgent':'khẩn cấp','open':'đang mở','in progress':'đang thực hiện','review':'đang duyệt','done':'hoàn thành','comment':'bình luận','progress':'tiến độ','evidence':'minh chứng','issue':'vấn đề','confirmed':'đã xác nhận','volunteered':'đã đăng ký','declined':'từ chối','admin':'Trưởng Ban','vice_admin':'Phó Ban','leader':'Tổ trưởng','vice_leader':'Tổ phó','member':'Thành viên','lecturer':'giảng viên',
  'Nothing upcoming':'Không có hoạt động sắp tới','New activities will appear here.':'Hoạt động mới sẽ xuất hiện tại đây.','Loading…':'Đang tải…','Unable to load this page':'Không thể tải trang','Change language':'Đổi ngôn ngữ','Sign out':'Đăng xuất','Mark complete':'Đánh dấu hoàn thành',
  'Edit account':'Sửa tài khoản','New account':'Tạo tài khoản','Edit':'Sửa','Delete':'Xóa','Delete activity':'Xóa hoạt động','Type the activity title to permanently delete it:':'Nhập chính xác tên hoạt động để xóa vĩnh viễn:','The activity title did not match. Nothing was deleted.':'Tên hoạt động không khớp. Không có dữ liệu nào bị xóa.','Activity permanently deleted':'Đã xóa vĩnh viễn hoạt động','ACCOUNT SETTINGS':'CÀI ĐẶT TÀI KHOẢN','Your account name and role can only be changed by an authorized manager.':'Tên và vai trò chỉ có thể được thay đổi bởi người quản lý có thẩm quyền.','Avatar color':'Màu đại diện','New password':'Mật khẩu mới','Leave blank to keep current':'Để trống để giữ nguyên','Save account':'Lưu tài khoản','Edit account':'Sửa tài khoản','Save changes':'Lưu thay đổi','TEAM SIGNATURE':'MÀU NHẬN DIỆN TỔ','Edit color':'Sửa màu','Save team':'Lưu Tổ','Add members':'Thêm thành viên','ACTIVITY PARTICIPANTS':'THÀNH VIÊN HOẠT ĐỘNG','Select active members to confirm their participation in this activity.':'Chọn thành viên đang hoạt động để xác nhận tham gia hoạt động này.','Responsibility':'Nhiệm vụ','Activity participant':'Thành viên hoạt động','Add selected members':'Thêm thành viên đã chọn','All eligible members have already joined this activity.':'Tất cả thành viên phù hợp đã tham gia hoạt động này.','ACTIVITY MANAGEMENT':'QUẢN LÝ HOẠT ĐỘNG','Edit activity':'Sửa hoạt động','Coordinating team':'Tổ chủ trì','Result summary':'Tóm tắt kết quả','Save activity':'Lưu hoạt động','The coordinating team must also be an involved team.':'Tổ chủ trì cũng phải là một Tổ tham gia.',
  'Search people…':'Tìm thành viên…','All teams':'Tất cả các Tổ','All roles':'Tất cả vai trò','No people found':'Không tìm thấy thành viên','No team':'Chưa thuộc Tổ','Team filter':'Lọc theo Tổ','No members match this team.':'Không có thành viên phù hợp với Tổ này.','Documents':'Văn bản','Shared document links issued by TCKT teams.':'Danh mục liên kết văn bản do các Tổ TCKT ban hành.','Add document':'Thêm văn bản','Search documents…':'Tìm văn bản…','All years':'Tất cả các năm','No documents found':'Không tìm thấy văn bản','Add the first document or change the filters.':'Hãy thêm văn bản đầu tiên hoặc thay đổi bộ lọc.','Applicable year':'Năm áp dụng','Issuing team':'Tổ ban hành','Open document':'Mở văn bản','DOCUMENT DIRECTORY':'DANH MỤC VĂN BẢN','Add a document':'Thêm văn bản','Document name':'Tên văn bản','Document link':'Liên kết văn bản','Document description':'Mô tả văn bản','Describe its purpose and scope.':'Mô tả mục đích và phạm vi áp dụng.','Save document':'Lưu văn bản','Document added':'Đã thêm văn bản','Complete every document field with valid information.':'Điền đầy đủ và hợp lệ tất cả thông tin văn bản.','The issuing team is unavailable.':'Tổ ban hành không khả dụng.','You may only issue documents for your teams.':'Bạn chỉ có thể đăng văn bản cho Tổ của mình.','Reports':'Báo cáo','Export activity, team task and participation data for a duration.':'Xuất dữ liệu hoạt động, công việc của Tổ và mức độ tham gia trong một khoảng thời gian.','End date':'Ngày kết thúc','Team':'Tổ','All available teams':'Tất cả các Tổ có thể xem','The Excel workbook includes an activity summary and member task/participation details for activities overlapping this duration.':'Tệp Excel gồm tổng hợp hoạt động và chi tiết công việc, tham gia của thành viên đối với các hoạt động diễn ra trong khoảng thời gian này.','Export Excel report':'Xuất báo cáo Excel','Excel report exported':'Đã xuất báo cáo Excel','Report export failed':'Không thể xuất báo cáo.','Select a coordinating team and every supporting team involved.':'Chọn Tổ chủ trì và tất cả các Tổ phối hợp tham gia.','e.g. Engineering Open Day':'ví dụ: Ngày hội Kỹ thuật','No tasks in this stage.':'Chưa có công việc trong giai đoạn này.','Not set':'Chưa thiết lập','Requested by':'Được yêu cầu bởi','Created':'Ngày tạo','Last updated':'Cập nhật gần nhất','By':'Người tạo:','Start':'Bắt đầu','Deadline':'Hạn hoàn thành','Current team':'Tổ hiện tại','Maximum 50 MB shared across this task. Supported: images, PDF, Office, text, CSV, and ZIP.':'Tối đa 50 MB dùng chung cho công việc này. Hỗ trợ ảnh, PDF, tệp Office, văn bản, CSV và ZIP.','All eligible members have already joined this activity.':'Tất cả thành viên phù hợp đã tham gia hoạt động này.',
  'Account created':'Đã tạo tài khoản','Account updated':'Đã cập nhật tài khoản','Activity proposed':'Đã gửi duyệt hoạt động','Activity updated':'Đã cập nhật hoạt động','Comment posted':'Đã đăng bình luận','Member added':'Đã thêm thành viên','Members added to activity':'Đã thêm thành viên vào hoạt động','Status updated':'Đã cập nhật trạng thái','Task added':'Đã thêm công việc','Task completed':'Đã hoàn thành công việc','Task material added':'Đã thêm tư liệu công việc','Team created':'Đã tạo Tổ','Team updated':'Đã cập nhật Tổ','Update posted':'Đã đăng cập nhật','Your interest has been recorded':'Đã ghi nhận đăng ký tham gia của bạn','Account removed from your teams':'Đã xóa tài khoản khỏi các Tổ bạn quản lý','Account deactivated to preserve history':'Đã vô hiệu hóa tài khoản để giữ lại lịch sử','Account deleted':'Đã xóa tài khoản','Delete this account? Accounts referenced by retained history will be deactivated instead.':'Xóa tài khoản này? Tài khoản có dữ liệu lịch sử liên quan sẽ được chuyển sang trạng thái vô hiệu hóa.','Select at least one member.':'Chọn ít nhất một thành viên.','Request failed':'Yêu cầu không thành công.','Upload failed':'Tải tệp lên không thành công.','Evidence upload failed':'Tải minh chứng lên không thành công.','Could not connect to the server':'Không thể kết nối đến máy chủ','Coordinates the activity':'Chủ trì hoạt động','Supports the activity':'Phối hợp hoạt động','Responsible for assigned work':'Phụ trách công việc được giao','A single file cannot exceed 50 MB.':'Mỗi tệp không được vượt quá 50 MB.','That item already exists.':'Mục này đã tồn tại.',
  'Please sign in to continue.':'Vui lòng đăng nhập để tiếp tục.','Administrator access is required.':'Cần quyền Trưởng Ban hoặc Phó Ban.','You do not have permission for this action.':'Bạn không có quyền thực hiện thao tác này.','Email or password is incorrect.':'Email hoặc mật khẩu không đúng.','A valid email and avatar color are required.':'Cần email và màu đại diện hợp lệ.','Password must contain at least 8 characters.':'Mật khẩu phải có ít nhất 8 ký tự.','Complete all required fields and select at least one team.':'Điền đầy đủ trường bắt buộc và chọn ít nhất một Tổ.','Team leaders may only propose work for teams they lead.':'Tổ trưởng và Tổ phó chỉ có thể đề xuất công việc cho Tổ mình phụ trách.','Activity not found.':'Không tìm thấy hoạt động.','You cannot manage this activity.':'Bạn không thể quản lý hoạt động này.','Only administrators can change involved teams.':'Chỉ Ban Điều Hành mới có thể thay đổi các Tổ tham gia.','Title, description and deadline cannot be empty.':'Không được để trống tiêu đề, mô tả và hạn hoàn thành.','Select involved teams and a coordinating team.':'Chọn các Tổ tham gia và một Tổ chủ trì.','One or more selected teams are unavailable.':'Một hoặc nhiều Tổ đã chọn không khả dụng.','A team with existing tasks cannot be removed. Reassign those tasks first.':'Không thể xóa Tổ đang có công việc. Hãy phân công lại các công việc đó trước.','You cannot manage participants for this activity.':'Bạn không thể quản lý người tham gia hoạt động này.','You may only add active members from teams you lead.':'Bạn chỉ có thể thêm thành viên đang hoạt động thuộc Tổ mình phụ trách.','Write an update first.':'Vui lòng nhập nội dung cập nhật.','Title, team and deadline are required.':'Cần tiêu đề, Tổ phụ trách và hạn hoàn thành.','You cannot assign work for this team.':'Bạn không thể giao việc cho Tổ này.','Every assignee must belong to the responsible team.':'Mọi người được giao việc phải thuộc Tổ phụ trách.','Task not found.':'Không tìm thấy công việc.','You cannot update this task.':'Bạn không thể cập nhật công việc này.',
  'A member must belong to at least one team.':'Thành viên phải thuộc ít nhất một Tổ.','Name, email, password and role are required.':'Cần họ tên, email, mật khẩu và vai trò.','Team leaders may create accounts only in teams they lead.':'Tổ trưởng và Tổ phó chỉ có thể tạo tài khoản trong Tổ mình phụ trách.','You cannot edit this account.':'Bạn không thể sửa tài khoản này.','Account not found.':'Không tìm thấy tài khoản.','The account must remain in at least one team you lead.':'Tài khoản phải tiếp tục thuộc ít nhất một Tổ bạn phụ trách.','Name, email and a valid avatar color are required.':'Cần họ tên, email và màu đại diện hợp lệ.','You cannot delete your own signed-in account.':'Bạn không thể xóa tài khoản đang đăng nhập của mình.','You cannot delete this account.':'Bạn không thể xóa tài khoản này.','Team name is required.':'Cần tên Tổ.','You cannot edit this team.':'Bạn không thể sửa Tổ này.','Choose a valid team color.':'Chọn màu Tổ hợp lệ.','You cannot manage this team.':'Bạn không thể quản lý Tổ này.','You cannot view this team overview.':'Bạn không thể xem tổng quan của Tổ này.','Team not found.':'Không tìm thấy Tổ.','User not found.':'Không tìm thấy người dùng.','Team leaders may only add member accounts.':'Tổ trưởng và Tổ phó chỉ có thể thêm tài khoản thành viên.','Choose a valid report date range.':'Chọn khoảng thời gian báo cáo hợp lệ.','You cannot export a report for this team.':'Bạn không thể xuất báo cáo cho Tổ này.','No reportable teams are available.':'Không có Tổ nào khả dụng để lập báo cáo.','Choose a file or provide a relevant link.':'Chọn tệp hoặc cung cấp liên kết liên quan.','Links must begin with http:// or https://.':'Liên kết phải bắt đầu bằng http:// hoặc https://.','This file type is not supported.':'Định dạng tệp này không được hỗ trợ.','This task has reached its shared 50 MB upload limit.':'Công việc này đã đạt giới hạn tải lên dùng chung 50 MB.','Attachment not found.':'Không tìm thấy tệp đính kèm.','Stored file not found.':'Không tìm thấy tệp đã lưu.','Endpoint not found.':'Không tìm thấy điểm truy cập.','No valid fields supplied.':'Không có trường dữ liệu hợp lệ.','Something went wrong. Please try again.':'Đã xảy ra lỗi. Vui lòng thử lại.',
  'Visibility':'Quyền xem','All signed-in members':'Tất cả thành viên đã đăng nhập','Leaders and administrators only':'Chỉ Ban Điều Hành và Tổ trưởng/Tổ phó','Restricted':'Hạn chế','Only leaders and administrators may restrict a document.':'Chỉ Ban Điều Hành và Tổ trưởng/Tổ phó mới có thể hạn chế quyền xem văn bản.'
};
Object.assign(vi,{'Main activity proposal document':'Hồ sơ hoạt động','Main proposal document link (optional)':'Liên kết hồ sơ hoạt động (không bắt buộc)','Open activity proposal document':'Mở hồ sơ hoạt động','The activity proposal document must be a valid http:// or https:// link.':'Liên kết hồ sơ hoạt động phải bắt đầu bằng http:// hoặc https://.','vice leader':'Tổ phó','vice_leader':'Tổ phó','Vice leader':'Tổ phó','Leader':'Tổ trưởng','Member':'Thành viên','Team role':'Vai trò trong Tổ','Team role updated':'Đã cập nhật vai trò trong Tổ','View permission':'Quyền xem','Issuing team members':'Thành viên Tổ ban hành','Issuing team only':'Chỉ Tổ ban hành','All teams':'Tất cả các Tổ','Choose a valid team role.':'Chọn vai trò trong Tổ hợp lệ.','Team membership not found.':'Không tìm thấy quan hệ thành viên trong Tổ.','Team leaders and vice leaders may only propose work for teams they lead.':'Tổ trưởng và Tổ phó chỉ có thể đề xuất công việc cho Tổ mình phụ trách.','Team leaders and vice leaders may create accounts only in teams they lead.':'Tổ trưởng và Tổ phó chỉ có thể tạo tài khoản trong Tổ mình phụ trách.','Team leaders and vice leaders may only add member accounts.':'Tổ trưởng và Tổ phó chỉ có thể thêm tài khoản thành viên.','Edit document':'Sửa văn bản','Document updated':'Đã cập nhật văn bản','Document not found.':'Không tìm thấy văn bản.','You cannot edit this document.':'Bạn không thể sửa văn bản này.'});
Object.assign(vi,{'Notifications':'Thông báo','Kept for 7 days':'Lưu trong 7 ngày','No notifications yet.':'Chưa có thông báo.','Task due today':'Công việc đến hạn hôm nay'});
Object.assign(vi,{'Tag a person (optional)':'Gắn thẻ một người (không bắt buộc)','No person tagged':'Không gắn thẻ ai','You were tagged in a comment':'Bạn được gắn thẻ trong một bình luận'});
Object.assign(vi,{'Tag people (optional)':'Gắn thẻ nhiều người (không bắt buộc)','Hold Ctrl or Command to select multiple people.':'Giữ Ctrl hoặc Command để chọn nhiều người.'});
Object.assign(vi,{'Delete team':'Xóa Tổ','Delete this team?':'Xóa Tổ này?','Team deleted':'Đã xóa Tổ thành công','Team archived':'Đã lưu trữ Tổ','Remove from team':'Xóa khỏi Tổ','Member removed from team':'Đã xóa thành viên khỏi Tổ','Add member to team':'Thêm thành viên vào Tổ','Select account':'Chọn tài khoản','Team members management':'Quản lý thành viên Tổ','All active accounts already belong to this team.':'Tất cả tài khoản đang hoạt động đã thuộc Tổ này.','Change team role':'Đổi vai trò trong Tổ','Are you sure you want to delete':'Bạn có chắc chắn muốn xóa','Associated history will be safely preserved.':'Các dữ liệu lịch sử liên quan sẽ được lưu trữ an toàn.'});
Object.assign(vi,{
  'HUST STAFF / FACULTY':'CÁN BỘ / GIẢNG VIÊN HUST',
  'Welcome to TCKT Activity Hub':'Chào mừng đến với Cổng hoạt động TCKT',
  'For access, responsibilities, or more information, please contact an administrator or email':'Để được cấp quyền truy cập, phân công trách nhiệm hoặc biết thêm thông tin, vui lòng liên hệ quản trị viên hoặc gửi email đến',
  'I understand':'Tôi đã hiểu',
  'STUDENT INFORMATION':'THÔNG TIN SINH VIÊN',
  'Tell us your class':'Cho chúng tôi biết lớp của bạn',
  'Please declare your class number. You will be asked again after each sign-in until this is completed.':'Vui lòng khai báo lớp của bạn. Hệ thống sẽ tiếp tục hỏi sau mỗi lần đăng nhập cho đến khi bạn hoàn tất.',
  'Cohort unavailable':'Chưa xác định được khóa',
  'Inferred from your HUST student email':'Được xác định từ email sinh viên HUST của bạn',
  'Class number':'Lớp',
  'Save and continue':'Lưu và tiếp tục',
  'Student information saved':'Đã lưu thông tin sinh viên'
});
Object.assign(vi,{
  'Account management':'Quản lý tài khoản','Create and manage local and SSO accounts.':'Tạo và quản lý tài khoản cục bộ và SSO.','All accounts':'Tất cả tài khoản',
  'My tasks today':'Công việc hôm nay','Work due today, overdue, or waiting on your review.':'Công việc đến hạn hôm nay, quá hạn, hoặc đang chờ bạn duyệt.','Due today':'Đến hạn hôm nay','Waiting on your review':'Chờ bạn duyệt','Nothing due today':'Không có việc đến hạn hôm nay','Nothing overdue':'Không có việc quá hạn',
  'Kanban board':'Bảng Kanban','Back to activity':'Quay lại hoạt động','To do':'Cần làm','In progress':'Đang làm','Awaiting review':'Chờ duyệt','Done':'Hoàn thành',
  'Primary assignee':'Người phụ trách chính','Co-assignees (optional)':'Người phối hợp (không bắt buộc)','No other active members belong to this team.':'Không còn thành viên nào khác thuộc Tổ này.','Select a primary assignee.':'Chọn người phụ trách chính.',
  'Proposal history':'Lịch sử xét duyệt','submit':'gửi xét duyệt','approve':'phê duyệt','reject':'từ chối','request changes':'yêu cầu sửa đổi','changes requested':'yêu cầu sửa đổi',
  'FEEDBACK':'PHẢN HỒI','Submit':'Gửi','NGHIỆM THU':'NGHIỆM THU',
  'Accounts':'Quản lý tài khoản','Kanban':'Bảng Kanban','→ In progress':'→ Đang làm',
  'Calendar':'Lịch chung','Schedule of activities and task deadlines across TCKT.':'Lịch hoạt động và hạn chót công việc của các Tổ.','Month':'Tháng','Agenda':'Danh sách','Today':'Hôm nay','Mon':'T2','Tue':'T3','Wed':'T4','Thu':'T5','Fri':'T6','Sat':'T7','Sun':'CN','No activities or tasks scheduled this month.':'Không có sự kiện hoặc công việc nào trong tháng này.','Search accounts…':'Tìm kiếm tài khoản…','All auth types':'Tất cả hình thức đăng nhập','Local account':'Tài khoản cục bộ','SSO account':'Tài khoản SSO','Acknowledge':'Xác nhận nhận việc','View details':'Xem chi tiết','Confirm':'Xác nhận','Approve':'Duyệt đạt','Request rework':'Yêu cầu làm lại','Dismiss':'Bác bỏ','Bác bỏ':'Bác bỏ','Bác bỏ công việc':'Bác bỏ công việc','Rút lại công việc này':'Rút lại công việc này','Rút lại công việc':'Rút lại công việc','Bạn có chắc chắn muốn rút lại công việc tự ghi nhận này không?':'Bạn có chắc chắn muốn rút lại công việc tự ghi nhận này không?','Đã bác bỏ công việc':'Đã bác bỏ công việc','Đã rút lại công việc':'Đã rút lại công việc','Vui lòng nêu rõ lý do khi bác bỏ.':'Vui lòng nêu rõ lý do khi bác bỏ.','Drag card to change status':'Kéo thả thẻ để đổi trạng thái',
  'Self-logged work':'Công việc tự ghi nhận','Log work':'Tự ghi nhận việc','Tự ghi nhận việc':'Tự ghi nhận việc','Self-logged':'Tự ghi nhận','Weight':'Trọng số','Weight preset':'Preset Trọng số','Weight presets':'Cấu hình Preset Trọng số (0 - 10)','Add preset':'Thêm Preset','Edit preset':'Sửa Preset','Preset name':'Tên Preset','Preset points':'Điểm trọng số (0 - 10)','Points':'Điểm','Evidence link':'Liên kết minh chứng','Evidence file':'Tệp minh chứng','Send for review':'Gửi nghiệm thu',
  'vice admin':'Phó Ban','Vice admin':'Phó Ban','vice_admin':'Phó Ban','admin':'Trưởng Ban','Admin':'Trưởng Ban','leader':'Tổ trưởng','Leader':'Tổ trưởng','vice_leader':'Tổ phó','Vice leader':'Tổ phó','member':'Thành viên','Member':'Thành viên','All roles':'Tất cả vai trò',
  'Thứ tự hiển thị':'Thứ tự hiển thị','Chưa có preset nào':'Chưa có preset nào','Nhấn Thêm Preset để tạo mức trọng số mới.':'Nhấn Thêm Preset để tạo mức trọng số mới.','Đã xóa preset':'Đã xóa preset','Đã thêm preset':'Đã thêm preset','Đã cập nhật preset':'Đã cập nhật preset','Cấu hình các mức trọng số định sẵn (0 - 10) để thành viên chọn khi tự ghi nhận công việc.':'Cấu hình các mức trọng số định sẵn (0 - 10) để thành viên chọn khi tự ghi nhận công việc.'
});
const translate=s=>lang==='vi'?(vi[s]||s):s;
const t=translate;
if(typeof window!=='undefined'){window.t=translate;window.translate=translate;}
let activityCommentPickerLoading=false;
async function addActivityCommentTagPicker(){
  const form=$('#update-form');
  if(!form||form.dataset.tagsEnhanced||activityCommentPickerLoading)return;
  const match=location.hash.match(/^#activity\/(\d+)/);
  if(!match)return;
  form.dataset.tagsEnhanced='loading';
  activityCommentPickerLoading=true;
  try{
    const detail=await api(`/api/activities/${match[1]}`);
    if(!form.isConnected)return;
    $$('.timeline-item').forEach((item,index)=>{
      const update=detail.updates?.[index];
      for(const person of update?.tagged_users||[]){
        const tag=document.createElement('span');
        tag.className='comment-person-tag';
        tag.textContent=`@${person.name}`;
        $('.meta',item)?.append(tag);
      }
    });
    const label=document.createElement('div');
    label.className='comment-tag-field';
    label.innerHTML=`<span class="comment-tag-label">${t('Tag people (optional)')}</span><div class="comment-tag-picker"><div class="comment-tag-selected"></div><input class="comment-tag-search" type="search" autocomplete="off" placeholder="${t('Search people to tag…')}" aria-label="${t('Search people to tag…')}"><div class="comment-tag-results hidden"></div></div><input type="hidden" name="tagged_user_ids">`;
    form.querySelector('textarea').before(label);
    const people=detail.taggablePeople||[],selected=new Map,kind=form.elements.kind,search=$('.comment-tag-search',label),results=$('.comment-tag-results',label),selectedBox=$('.comment-tag-selected',label),tagIds=$('input[type="hidden"]',label),fold=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();
    const renderSelected=()=>{selectedBox.innerHTML=[...selected.values()].map(person=>`<button type="button" class="comment-tag-chip" data-remove-tag="${person.id}" aria-label="${t('Remove')} ${esc(person.name)}">@${esc(person.name)} <span>×</span></button>`).join('');tagIds.value=kind.value==='comment'?[...selected.keys()].join(','):''};
    const renderResults=()=>{const query=fold(search.value.trim()),matches=people.filter(person=>!selected.has(Number(person.id))&&(!query||fold(person.name).includes(query))).slice(0,8);results.innerHTML=matches.length?matches.map(person=>`<button type="button" data-add-tag="${person.id}">${esc(person.name)}<small>${esc(person.role||'')}</small></button>`).join(''):`<p>${t('No matching people')}</p>`;results.classList.remove('hidden')};
    const sync=()=>{const commenting=kind.value==='comment';label.classList.toggle('hidden',!commenting);search.disabled=!commenting;renderSelected()};
    kind.addEventListener('change',sync);
    search.addEventListener('input',renderResults);
    search.addEventListener('focus',renderResults);
    label.addEventListener('click',event=>{const add=event.target.closest('[data-add-tag]'),remove=event.target.closest('[data-remove-tag]');if(add){const person=people.find(item=>Number(item.id)===Number(add.dataset.addTag));if(person)selected.set(Number(person.id),person);search.value='';renderSelected();renderResults();search.focus()}else if(remove){selected.delete(Number(remove.dataset.removeTag));renderSelected();renderResults();search.focus()}});
    document.addEventListener('click',event=>{if(!label.contains(event.target))results.classList.add('hidden')},{signal:form.tagPickerAbort||(form.tagPickerAbort=new AbortController()).signal});
    sync();
    form.dataset.tagsEnhanced='true';
  }catch(error){delete form.dataset.tagsEnhanced;console.warn('Comment tag picker failed.',error)}finally{activityCommentPickerLoading=false}
}
new MutationObserver(()=>addActivityCommentTagPicker()).observe(document.body,{childList:true,subtree:true});
const translatedText=raw=>{const value=raw.trim();if(!value)return raw;let out=vi[value];if(!out){const action=value.match(/^([＋↗⇩]\s*)(.+)$/);if(action&&vi[action[2]])out=action[1]+vi[action[2]]}if(!out){out=value.replace(/^(\d+) people$/,'$1 người').replace(/^(\d+) tasks$/,'$1 công việc').replace(/^(\d+) completed tasks$/,'$1 công việc hoàn thành').replace(/^(\d+) open · (\d+) completed$/,'$1 đang mở · $2 hoàn thành').replace(/^(\d+)\/(\d+) tasks( · )/,'$1/$2 công việc$3').replace(/^(\d+)\/(\d+) checklist$/,'$1/$2 việc cần làm').replace(/^(admin|vice_admin|leader|vice_leader|member) · Edit account$/,(_,role)=>`${vi[role]||role} · ${vi['Edit account']}`).replace(/ · (admin|vice_admin|leader|vice_leader|member)$/,(_,role)=>` · ${vi[role]||role}`).replace(/^By /,'Người tạo: ').replace(/^Requested by /,'Được yêu cầu bởi: ').replace(/^Created /,'Ngày tạo: ').replace(/^Last updated /,'Cập nhật gần nhất: ').replace(/^Start /,'Bắt đầu: ').replace(/^Deadline /,'Hạn hoàn thành: ').replace(/^Edit /,'Sửa ').replace(/^before the event$/,'Trước sự kiện').replace(/^during the event$/,'Trong sự kiện').replace(/^after the event$/,'Sau sự kiện').replace(/ used · /,' đã dùng · ').replace(/ remaining$/,' còn lại')}return raw.replace(value,out)};
function translateDOM(root=document){if(lang!=='vi')return;document.body.dataset.lang='vi';document.documentElement.lang='vi';document.title='Cổng hoạt động TCKT';const stableOptions=new Set(['proposed','approved','active','completed','cancelled','low','medium','high','urgent','open','in_progress','review','done']);$$('option:not([value])',root).forEach(o=>{const original=o.textContent.trim();if(stableOptions.has(original))o.setAttribute('value',original)});const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while(n=walker.nextNode())n.nodeValue=translatedText(n.nodeValue);$$('[placeholder],[title],[aria-label]',root).forEach(el=>['placeholder','title','aria-label'].forEach(a=>{const v=el.getAttribute(a);if(v&&vi[v])el.setAttribute(a,vi[v])}))}
document.body.dataset.lang=lang;document.documentElement.lang=(lang==='vi'?'vi':'en');document.addEventListener('click',e=>{if(e.target.closest('[data-language]')){localStorage.setItem('tckt-language',lang==='vi'?'en':'vi');location.reload()}});new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType===1)translateDOM(n);else if(n.nodeType===3&&lang==='vi')n.nodeValue=translatedText(n.nodeValue)}))).observe(document.body,{childList:true,subtree:true});
const api=async(url,options={})=>{const res=await fetch(url,{headers:{'Content-Type':'application/json',...(options.headers||{})},...options});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||'Request failed');if(/^\/api\/activities\/\d+$/.test(url)){state.activityAttachments=data.attachments||[];state.showTaskEvidence=true}else if(url==='/api/bootstrap')state.showTaskEvidence=false;return data};
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]||c));
const icon=(name,options={})=>{const safeName=/^[a-z0-9-]+$/i.test(name)?name:'circle',weight=/^(?:bold|duotone)$/.test(options.weight)?options.weight:'bold',className=options.className?` ${esc(options.className)}`:'',label=options.label?` role="img" aria-label="${esc(options.label)}"`:' aria-hidden="true"';return `<i class="ph-${weight} ph-${safeName}${className}"${label}></i>`};
const pageHeader=(options={})=>`<header class="page-head">${options.eyebrow?`<span class="eyebrow">${esc(options.eyebrow)}</span>`:''}<div><h1>${esc(options.title||'')}</h1>${options.description?`<p>${esc(options.description)}</p>`:''}</div>${options.actions||''}</header>`;
const loadingState=(message=t('Loading…'))=>`<section class="loading-state" aria-busy="true">${icon('circle-notch',{className:'loading-state-icon'})}<p>${esc(message)}</p></section>`;
const emptyState=(options={})=>`<section class="empty-state">${icon(options.icon||'tray',{className:'state-icon'})}<div><h2>${esc(options.title||t('Nothing here yet.'))}</h2>${options.detail?`<p>${esc(options.detail)}</p>`:''}</div></section>`;
const errorState=(options={})=>`<section class="error-state" role="alert">${icon('warning-circle',{className:'state-icon'})}<div><h2>${esc(options.title||t('Something went wrong.'))}</h2>${options.detail?`<p>${esc(options.detail)}</p>`:''}</div></section>`;
const notice=(options={})=>{const tone=['info','success','warning','danger'].includes(options.tone)?options.tone:'info';return `<section class="notice notice-${tone}" role="status">${options.title?`<strong>${esc(options.title)}</strong>`:''}${options.detail?`<p>${esc(options.detail)}</p>`:''}</section>`};
const secureExternalLinks=root=>(root||document).querySelectorAll('a[target="_blank"]').forEach(a=>a.setAttribute('rel','noopener noreferrer'));
const initials=name=>String(name).split(' ').slice(-2).map(x=>x[0]).join('').toUpperCase();
const date=v=>v?new Intl.DateTimeFormat(lang==='vi'?'vi-VN':'en-GB',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(v)):t('Not set');
const shortDate=v=>{const d=new Date(v);return {day:String(d.getDate()).padStart(2,'0'),month:d.toLocaleString(lang==='vi'?'vi-VN':'en',{month:'short'}).toUpperCase()}};
const localDateStr=v=>{if(!v)return '';const d=new Date(v);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const dateOnlyDiffDays=v=>{const d=new Date(v),today=new Date();return Math.round((Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())-Date.UTC(today.getFullYear(),today.getMonth(),today.getDate()))/864e5)};
const isOverdue=v=>!!v&&dateOnlyDiffDays(v)<0;
const relative=(v,status)=>{if(status==='done')return date(v);const days=dateOnlyDiffDays(v);return lang==='vi'?(days<0?`Quá hạn ${Math.abs(days)} ngày`:days===0?'Hạn hôm nay':`Còn ${days} ngày`):(days<0?`${Math.abs(days)}d overdue`:days===0?'Due today':`Due in ${days}d`)};
const pct=(done,total)=>total?Math.round(done/total*100):0;
const toast=msg=>{const el=$('#toast');el.textContent=t(msg);el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2500)};
const countLabel=(n,singular)=>lang==='vi'?`${n} ${singular==='people'?'người':'công việc'}`:`${n} ${singular}${Number(n)===1?'':'s'}`;
const workloadLabel=(open,done)=>lang==='vi'?`${open} đang mở · ${done} hoàn thành`:`${open} open · ${done} completed`;
const isExec=()=>['admin','vice_admin'].includes(state.user?.role);
const canManage=()=>['admin','vice_admin','leader','vice_leader'].includes(state.user?.role);
const canManageTaskTeam=teamId=>isExec()||state.teams.some(x=>Number(x.id)===Number(teamId)&&x.can_manage);
const openModal=html=>{$('#modal-content').innerHTML=html;const m=$('#modal');m.showModal();m.oncancel=()=>m.close()};
function confirmModal(title,message,onConfirm,options={}){const danger=options.danger!==false,confirmText=options.confirmLabel||(danger?t('Delete'):t('Confirm')),cancelText=options.cancelLabel||t('Cancel');openModal(`<span class="eyebrow ${danger?'red':'green'}">${t('CONFIRMATION')}</span><h2>${esc(title)}</h2><p class="muted" style="margin:12px 0 20px">${esc(message)}</p><div style="display:flex;gap:10px;justify-content:flex-end"><button type="button" class="btn" data-close>${esc(cancelText)}</button><button type="button" class="btn ${danger?'danger':'primary'}" id="confirm-modal-action">${esc(confirmText)}</button></div>`);$('#confirm-modal-action')?.addEventListener('click',async e=>{e.currentTarget.disabled=true;try{await onConfirm();$('#modal')?.close()}catch(err){toast(err.message);e.currentTarget.disabled=false}})}
const stageLabel=stage=>t({before:'Before the event',during:'During the event',after:'After the event',general:'General'}[stage]||stage);
const empty=(title,text)=>emptyState({title,detail:text});
const badge=(v,customLabel)=>`<span class="badge ${esc(v)}"><span class="badge-dot"></span>${esc(customLabel||t(String(v).replace(/_/g,' ')))}</span>`;
const avatar=(name,color='#1E3A8A')=>`<span class="avatar" style="background:${esc(color)}">${initials(name)}</span>`;

async function setupPushNotifications(){
  const config=await api('/api/push/config');
  if(!config.enabled||!config.appId)return;
  window.OneSignalDeferred=window.OneSignalDeferred||[];
  return new Promise((resolve,reject)=>window.OneSignalDeferred.push(async OneSignal=>{
    try{
      await OneSignal.init({appId:config.appId,notifyButton:{enable:true},allowLocalhostAsSecureOrigin:['localhost','127.0.0.1'].includes(location.hostname)});
      const identify=()=>OneSignal.login(String(state.user.id));
      OneSignal.User.PushSubscription.addEventListener('change',event=>{
        if(event.current.optedIn&&event.current.token)identify().catch(error=>console.warn('Push user identification failed.',error));
      });
      if(OneSignal.User.PushSubscription.optedIn&&OneSignal.User.PushSubscription.token)await identify();
      resolve();
    }
    catch(error){reject(error)}
  }));
}

function logoutPushUser(){
  if(!window.OneSignalDeferred)return Promise.resolve();
  return new Promise(resolve=>window.OneSignalDeferred.push(async OneSignal=>{
    try{if(OneSignal.User.externalId)await OneSignal.logout()}catch(error){console.warn('Push notification logout failed.',error)}finally{resolve()}
  }));
}

async function logoutPushUserWithTimeout(){
  await Promise.race([
    logoutPushUser(),
    new Promise(resolve=>setTimeout(resolve,1500))
  ]);
}

async function init(){const s=await api('/api/session');const v=await api('/api/version').catch(()=>null);if(v&&$('#app-version'))$('#app-version').textContent=`v${v.version} · ${v.build}`;if(!s.user){$('#login').classList.remove('hidden');return}state.user=s.user;setupPushNotifications().catch(error=>console.warn('Push notification setup failed.',error));document.body.dataset.role=s.user.role;if(!canManage())$$('[data-manager-only]').forEach(x=>x.remove());if(!isExec())$$('[data-admin-only]').forEach(x=>x.remove());$('#app').classList.remove('hidden');const sUser=$('#sidebar-user');if(sUser){sUser.innerHTML=`${avatar(s.user.name,s.user.avatar_color)}<span><strong>${esc(s.user.name)}</strong><small>${esc(t(s.user.role))} · ${t('Edit account')}</small></span>`;sUser.onclick=selfAccountModal;sUser.title=t('Edit account');}const sideSearch=$('#sidebar-search');if(sideSearch){sideSearch.onkeydown=e=>{if(e.key==='Enter'&&sideSearch.value.trim()){location.hash='activities';setTimeout(()=>{const actSearch=$('#activity-search');if(actSearch){actSearch.value=sideSearch.value.trim();actSearch.dispatchEvent(new Event('input'))}},100)}};}window.addEventListener('hashchange',route);route();showHustOnboarding()}

function showHustOnboarding(){const onboarding=state.user?.onboarding;if(!onboarding?.required)return;const dialog=$('#onboarding-modal'),content=$('#onboarding-content');dialog.addEventListener('cancel',event=>event.preventDefault());if(onboarding.type==='faculty_notice'){content.innerHTML=`<span class="eyebrow green">HUST STAFF / FACULTY</span><h2 id="onboarding-title">Welcome to TCKT Activity Hub</h2><p class="muted">For access, responsibilities, or more information, please contact an administrator or email <a href="mailto:van.nguyendinh@hust.edu.vn">van.nguyendinh@hust.edu.vn</a>.</p><button class="btn primary wide" id="faculty-notice-confirm">I understand</button>`;$('#faculty-notice-confirm').onclick=async event=>{event.currentTarget.disabled=true;try{const result=await api('/api/onboarding/faculty-notice',{method:'POST'});state.user=result.user;dialog.close()}catch(error){toast(error.message);event.currentTarget.disabled=false}}}else{content.innerHTML=`<span class="eyebrow green">STUDENT INFORMATION</span><h2 id="onboarding-title">Tell us your class</h2><p class="muted">Please declare your class number. You will be asked again after each sign-in until this is completed.</p><div class="cohort-card"><strong>${esc(state.user.cohort||'Cohort unavailable')}</strong><small>${state.user.entrance_year?`Entrance year ${esc(state.user.entrance_year)}`:'Inferred from your HUST student email'}</small></div><form id="student-class-form" class="form"><label>Class number<input name="class_number" maxlength="100" placeholder="e.g. Điện 1, Điện tử 2" autocomplete="organization-title" required autofocus></label><button class="btn primary wide">Save and continue</button></form>`;$('#student-class-form').onsubmit=async event=>{event.preventDefault();const button=$('button',event.currentTarget);button.disabled=true;try{const classNumber=String(new FormData(event.currentTarget).get('class_number')||'').trim(),result=await api('/api/onboarding/student-class',{method:'POST',body:JSON.stringify({class_number:classNumber})});state.user=result.user;dialog.close();toast('Student information saved')}catch(error){toast(error.message);button.disabled=false}}}dialog.showModal()}
$('#login-form')?.addEventListener('submit',async e=>{e.preventDefault();const form=e.target,btn=$('button[type="submit"]',form),errorEl=$('#login-error');if(btn){btn.disabled=true;btn.setAttribute('aria-busy','true');btn.classList.add('busy')}if(errorEl){errorEl.classList.add('hidden');errorEl.textContent=''}try{await api('/api/login',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(form)))});location.reload()}catch(err){const msg=err.message||t('Login failed');if(errorEl){errorEl.textContent=msg;errorEl.classList.remove('hidden')}toast(msg);if(btn){btn.disabled=false;btn.removeAttribute('aria-busy');btn.classList.remove('busy')}}});
$('#logout')?.addEventListener('click',async()=>{await logoutPushUserWithTimeout();await api('/api/logout',{method:'POST'});location.reload()});
const sidebarMedia=window.matchMedia('(max-width: 760px)');
const setSidebarOpen=open=>{const sidebar=$('#sidebar'),menu=$('#mobile-menu'),overlay=$('#sidebar-overlay'),isOpen=Boolean(open)&&sidebarMedia.matches;if(!sidebar)return;sidebar.classList.toggle('open',isOpen);sidebar.dataset.open=String(isOpen);sidebar.setAttribute('aria-hidden',String(sidebarMedia.matches&&!isOpen));menu?.setAttribute('aria-expanded',String(isOpen));if(overlay)overlay.hidden=!isOpen;document.body.classList.toggle('sidebar-open',isOpen)};
sidebarMedia.addEventListener('change',()=>setSidebarOpen(false));
$('#mobile-menu')?.addEventListener('click',()=>setSidebarOpen(!$('#sidebar')?.classList.contains('open')));
$('#sidebar-overlay')?.addEventListener('click',()=>setSidebarOpen(false));
document.addEventListener('keydown',event=>{if(event.key==='Escape')setSidebarOpen(false)});
let modalPointerStartedOutside=false;
const isModalBackdropClick=(modal,e)=>{if(e.target!==modal)return false;const r=modal.getBoundingClientRect();return e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom};
$('#modal')?.addEventListener('pointerdown',e=>{modalPointerStartedOutside=isModalBackdropClick(e.currentTarget,e)});
$('#modal')?.addEventListener('mousedown',e=>{modalPointerStartedOutside=isModalBackdropClick(e.currentTarget,e)});
$('#modal')?.addEventListener('click',e=>{if(e.target.hasAttribute('data-close')||e.target.closest('[data-close]')){$('#modal')?.close();return}if(modalPointerStartedOutside&&isModalBackdropClick(e.currentTarget,e)){$('#modal')?.close()}modalPointerStartedOutside=false});

let calendarDate = new Date();
let calendarViewMode = 'month';
let calendarTeamFilter = 'all';

async function calendarView(){
  state.teams.length||(state.teams=await api('/api/teams'));
  const [activitiesData,bootstrapData]=await Promise.all([
    api('/api/activities'),
    api('/api/bootstrap')
  ]);
  const tasksData=bootstrapData.tasks||[];
  const year=calendarDate.getFullYear();
  const month=calendarDate.getMonth();
  const monthNamesVi=['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
  const monthNamesEn=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const monthLabel=lang==='vi'?`${monthNamesVi[month]} năm ${year}`:`${monthNamesEn[month]} ${year}`;

  const render=()=>{
    const filteredActivities=activitiesData.filter(a=>calendarTeamFilter==='all'||String(a.team_id)===String(calendarTeamFilter));
    const filteredTasks=tasksData.filter(tk=>calendarTeamFilter==='all'||String(tk.team_id)===String(calendarTeamFilter));
    let bodyHtml='';

    if(calendarViewMode==='month'){
      const firstDayOfMonth=new Date(year,month,1);
      const startDayOfWeek=(firstDayOfMonth.getDay()+6)%7;
      const daysInMonth=new Date(year,month+1,0).getDate();
      const prevMonthDays=new Date(year,month,0).getDate();
      const dayHeaders=lang==='vi'?['T2','T3','T4','T5','T6','T7','CN']:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
      const headersHtml=dayHeaders.map(h=>`<div class="calendar-day-head">${h}</div>`).join('');
      const totalCells=Math.ceil((startDayOfWeek+daysInMonth)/7)*7;
      let cellsHtml='';
      const todayIso=localDateStr(new Date());

      for(let i=0;i<totalCells;i++){
        let dayNum,cellDate,isOtherMonth=false;
        if(i<startDayOfWeek){
          dayNum=prevMonthDays-startDayOfWeek+i+1;
          cellDate=new Date(year,month-1,dayNum);
          isOtherMonth=true;
        }else if(i<startDayOfWeek+daysInMonth){
          dayNum=i-startDayOfWeek+1;
          cellDate=new Date(year,month,dayNum);
        }else{
          dayNum=i-(startDayOfWeek+daysInMonth)+1;
          cellDate=new Date(year,month+1,dayNum);
          isOtherMonth=true;
        }

        const dateIso=`${cellDate.getFullYear()}-${String(cellDate.getMonth()+1).padStart(2,'0')}-${String(cellDate.getDate()).padStart(2,'0')}`;
        const isToday=dateIso===todayIso;

        const dayActivities=filteredActivities.filter(a=>{
          const start=a.start_date?localDateStr(a.start_date):localDateStr(a.deadline);
          const end=a.deadline?localDateStr(a.deadline):start;
          return start<=dateIso&&dateIso<=end;
        });

        const dayTasks=filteredTasks.filter(tk=>tk.deadline&&localDateStr(tk.deadline)===dateIso);

        const itemsHtml=[
          ...dayActivities.map(a=>`<a class="calendar-pill activity-pill" href="#activity/${a.id}" style="--pill-color:${esc(a.team_color||'#2563EB')}" title="${esc(a.title)} (${esc(a.team_names||a.team_name)})"><span class="team-dot" style="background:${esc(a.team_color||'#2563EB')}"></span><span>${esc(a.title)}</span></a>`),
          ...dayTasks.map(tk=>`<div class="calendar-pill task-pill ${tk.status==='done'?'done':''}" data-task-view="${tk.id}" title="${esc(tk.title)}"><span class="task-icon">${icon('check')}</span><span>${esc(tk.title)}</span></div>`)
        ].join('');

        cellsHtml+=`<div class="calendar-cell ${isOtherMonth?'other-month':''} ${isToday?'today':''}"><div class="calendar-day-number">${dayNum}</div><div class="calendar-items">${itemsHtml}</div></div>`;
      }

      bodyHtml=`<div class="calendar-grid">${headersHtml}${cellsHtml}</div>`;
    }else{
      const monthPrefix=`${year}-${String(month+1).padStart(2,'0')}`;
      const dayMap=new Map();

      filteredActivities.forEach(a=>{
        const start=a.start_date?localDateStr(a.start_date):localDateStr(a.deadline);
        const end=a.deadline?localDateStr(a.deadline):start;
        if((start&&start.startsWith(monthPrefix))||(end&&end.startsWith(monthPrefix))){
          const key=end||start;
          const list=dayMap.get(key)||[];
          list.push({type:'activity',data:a});
          dayMap.set(key,list);
        }
      });

      filteredTasks.forEach(tk=>{
        const dateStr=tk.deadline?localDateStr(tk.deadline):'';
        if(dateStr.startsWith(monthPrefix)){
          const list=dayMap.get(dateStr)||[];
          list.push({type:'task',data:tk});
          dayMap.set(dateStr,list);
        }
      });

      const sortedDates=[...dayMap.keys()].sort();
      if(!sortedDates.length){
        bodyHtml=empty(t('No activities or tasks scheduled this month.'),'');
      }else{
        bodyHtml=`<div class="calendar-agenda">${sortedDates.map(dateStr=>{
          const items=dayMap.get(dateStr);
          return `<div class="calendar-agenda-day"><div class="calendar-agenda-date">${icon('calendar')} ${date(dateStr)}</div><div class="calendar-agenda-list">${items.map(item=>{
            if(item.type==='activity'){
              const a=item.data;
              return `<a class="event-row" href="#activity/${a.id}"><div class="meta"><span class="team-dot" style="background:${esc(a.team_color)}"></span><strong>${esc(a.title)}</strong><small>${esc(a.team_names||a.team_name)}</small></div>${badge(a.status)}</a>`;
            }else{
              const tk=item.data;
              return `<div class="task-row"><button class="task-title-link" data-task-view="${tk.id}"><strong>${esc(tk.title)}</strong></button><div class="meta"><span>${esc(tk.activity_title||'')}</span></div>${badge(tk.status)}</div>`;
            }
          }).join('')}</div></div>`;
        }).join('')}</div>`;
      }
    }

    $('#content').innerHTML=`
      ${pageHeader({title:t('Calendar'),description:t('Schedule of activities and task deadlines across TCKT.')})}
      <div class="calendar-view">
        <div class="calendar-toolbar">
          <div class="calendar-nav">
            <button class="btn small icon-btn" id="cal-prev" aria-label="Tháng trước" title="Tháng trước">${icon('caret-left')}</button>
            <h2>${monthLabel}</h2>
            <button class="btn small icon-btn" id="cal-next" aria-label="Tháng sau" title="Tháng sau">${icon('caret-right')}</button>
            <button class="btn small" id="cal-today">${t('Today')}</button>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <select id="cal-team">
              <option value="all">${t('All teams')}</option>
              ${state.teams.map(x=>`<option value="${x.id}" ${String(x.id)===String(calendarTeamFilter)?'selected':''}>${esc(x.name)}</option>`).join('')}
            </select>
            <div class="calendar-view-toggle">
              <button class="${calendarViewMode==='month'?'active':''}" id="cal-mode-month">${t('Month')}</button>
              <button class="${calendarViewMode==='agenda'?'active':''}" id="cal-mode-agenda">${t('Agenda')}</button>
            </div>
          </div>
        </div>
        ${bodyHtml}
      </div>
    `;

    $('#cal-prev').onclick=()=>{calendarDate.setMonth(calendarDate.getMonth()-1);render()};
    $('#cal-next').onclick=()=>{calendarDate.setMonth(calendarDate.getMonth()+1);render()};
    $('#cal-today').onclick=()=>{calendarDate=new Date();render()};
    $('#cal-team').onchange=e=>{calendarTeamFilter=e.target.value;render()};
    $('#cal-mode-month').onclick=()=>{calendarViewMode='month';render()};
    $('#cal-mode-agenda').onclick=()=>{calendarViewMode='agenda';render()};
  };

  render();
}

async function route(){const [page='dashboard',id]=location.hash.slice(1).split('/');$$('#nav a').forEach(a=>a.classList.toggle('active',a.dataset.page===page||(page==='team'&&a.dataset.page==='teams')||(page==='board'&&a.dataset.page==='activities')||(page==='calendar'&&a.dataset.page==='calendar')));setSidebarOpen(false);$('#content').innerHTML=loadingState(t('Loading…'));try{if(page==='dashboard')await dashboard();else if(page==='calendar')await calendarView();else if(page==='activities')await activities();else if(page==='activity'&&id)await activityDetail(id);else if(page==='board'&&id)await taskBoard(id);else if(page==='my-tasks')await myTasks();else if(page==='my-tasks-today')await myTasksToday();else if(page==='teams')await teams();else if(page==='team'&&id)await teamPage(id);else if(page==='people')await people();else if(page==='accounts'&&isExec())await accountsAdmin();else if(page==='documents')await documents();else if(page==='reports'&&canManage())await reports();else if(page==='archive')await archive();else location.hash='dashboard'}catch(e){$('#content').innerHTML=errorState({title:t('Unable to load this page'),detail:t(e.message)})}}

function nbEventRow(a){const d=shortDate(a.deadline),p=pct(a.done_count,a.task_count);return `<a class="nb-event-item" href="#activity/${a.id}"><div class="nb-date-block"><span class="nb-date-day">${d.day}</span><span class="nb-date-month">${d.month}</span></div><div class="nb-event-main"><h3>${esc(a.title)}</h3><div class="nb-event-meta"><span class="nb-team-tag"><i class="team-dot" style="background:${a.team_color}"></i>${esc(a.team_names||a.team_name)}</span><span>${countLabel(a.participant_count,'people')}</span></div><div class="nb-flat-progress"><span class="nb-flat-progress-bar" style="width:${p}%;background:${esc(a.team_color)}"></span></div></div>${badge(a.status)}</a>`}
function nbTaskRow(tk){const late=isOverdue(tk.deadline)&&tk.status!=='done',assigned=String(tk.assignee_ids||'').split(',').map(Number).includes(state.user?.id),canComplete=assigned&&['todo','in_progress'].includes(tk.status);const selfBadge=tk.is_self_logged?`<span class="nb-badge-self" title="${translate('Self-logged work')}">${translate('Self-logged')}</span>`:'';const weightBadge=(tk.weight!==undefined&&tk.weight!==null)?`<span class="nb-badge-weight" title="${translate('Weight')}: ${tk.weight}"><i class="ph-bold ph-lightning"></i> ${tk.weight}đ</span>`:'';return `<div class="nb-task-item"><button class="nb-check-btn" ${canComplete?`data-task-done="${tk.id}"`:'disabled'} title="${canComplete?'Mark complete':'View only'}">${tk.status==='done'?'<i class="ph-bold ph-check"></i>':''}</button><div class="nb-task-info"><div class="nb-task-title-row">${selfBadge}${weightBadge}<button class="nb-task-title" data-task-view="${tk.id}">${esc(tk.title)}</button></div><div class="nb-task-meta"><span>● ${esc(tk.activity_title||tk.team_name)}</span>${tk.assignee_name?`<span><i class="ph-bold ph-user"></i> ${esc(tk.assignee_name)}</span>`:''}</div></div><span class="nb-due-pill ${late?'late':''}">${relative(tk.deadline,tk.status)}</span></div>`}
function nbFeedItem(x){return `<div class="nb-feed-item"><div class="nb-feed-avatar">${avatar(x.user_name,x.avatar_color)}</div><div class="nb-feed-body"><p><strong>${esc(x.user_name)}</strong> · ${badge(x.kind)}<br>${esc(x.body)}</p><time>${date(x.created_at)} · <a href="#activity/${x.activity_id}">${esc(x.activity_title)}</a></time></div></div>`}

async function dashboard(){
  const d=await api('/api/bootstrap');
  state.bootstrap=d;
  state.teams=d.teams;
  const now=new Date();

  // Metrics calculation
  const completedMonth=Number(d.stats?.completedMonth||0);
  const openTasks=Number(d.stats?.openTasks||0);
  const overdueTasks=Number(d.stats?.overdueTasks||0);
  const activeActivities=Number(d.stats?.activeActivities||0);
  const totalTasks=Math.max(openTasks+completedMonth, 1);
  const efficiencyPct=Math.min(Math.round((completedMonth/totalTasks)*100), 100);
  const totalWeights=(d.tasks||[]).reduce((sum,tk)=>sum+Number(tk.weight||1), 0);

  const userTasks=(d.tasks||[]).filter(tk=>tk.status!=='cancelled');
  const upcomingEvents=(d.upcoming||[]).slice(0, 4);
  const recentFeed=(d.activity||[]).slice(0, 4);

  // State for task view: activeTab ('open', 'today', 'overdue', 'done', 'all'), viewMode ('cards', 'table'), searchQuery
  let activeTab='open';
  let viewMode='cards';
  let searchQuery='';

  const getFilteredTasks=(tab)=>{
    let list=userTasks;
    if(tab==='today'){
      list=list.filter(tk=>tk.deadline&&dateOnlyDiffDays(tk.deadline)<=0&&tk.status!=='done');
    } else if(tab==='open'){
      list=list.filter(tk=>tk.status!=='done');
    } else if(tab==='overdue'){
      list=list.filter(tk=>isOverdue(tk.deadline)&&tk.status!=='done');
    } else if(tab==='done'){
      list=list.filter(tk=>tk.status==='done');
    }

    if(searchQuery.trim()){
      const q=searchQuery.trim().toLowerCase();
      list=list.filter(tk=>
        (tk.title||'').toLowerCase().includes(q)||
        (tk.activity_title||'').toLowerCase().includes(q)||
        (tk.assignee_name||'').toLowerCase().includes(q)||
        (tk.team_name||'').toLowerCase().includes(q)
      );
    }
    return list;
  };

  const renderCardView=(list)=>{
    if(!list.length){
      return `
        <div class="empty" style="padding:36px 16px;">
          <b>${lang==='vi'?'Không tìm thấy công việc nào':'No tasks found'}</b>
          <p class="muted">${lang==='vi'?'Tuyệt vời! Không có nhiệm vụ nào trong mục này hoặc không khớp bộ lọc.':'All tasks completed or none match your filter.'}</p>
        </div>
      `;
    }
    return `
      <div class="notion-task-list">
        ${list.map(tk=>{
          const late=isOverdue(tk.deadline)&&tk.status!=='done';
          const assigned=String(tk.assignee_ids||'').split(',').map(Number).includes(state.user?.id);
          const canComplete=assigned&&['todo','in_progress'].includes(tk.status);
          const isDone=tk.status==='done';
          return `
            <div class="notion-task-row">
              <button class="notion-task-check ${isDone?'is-done':''}" ${canComplete?`data-task-done="${tk.id}"`:isDone?'':'disabled'} title="${canComplete?t('Mark complete'):'View only'}">
                ${isDone ? '<i class="ph-bold ph-check"></i>' : ''}
              </button>
              <div class="notion-task-main">
                <div class="notion-task-title-row">
                  <span class="notion-task-title" data-task-view="${tk.id}">${esc(tk.title)}</span>
                </div>
                <div class="notion-task-meta">
                  <span class="badge proposed"><span class="badge-dot"></span>${esc(tk.team_name||'TCKT')}</span>
                  ${tk.weight ? `<span class="badge weight"><span class="badge-dot"></span><i class="ph-bold ph-lightning"></i> ${tk.weight}đ</span>` : ''}
                  ${tk.is_self_logged ? `<span class="badge self-logged"><span class="badge-dot"></span>${lang==='vi'?'Tự ghi nhận':'Self-logged'}</span>` : ''}
                  <span class="notion-task-due ${late?'late':''}">
                    <i class="ph-bold ph-clock"></i> ${late?(lang==='vi'?'Quá hạn':'Overdue'):relative(tk.deadline,tk.status)}
                  </span>
                  ${tk.activity_title ? `<span class="muted">· ${esc(tk.activity_title)}</span>` : ''}
                </div>
              </div>
              <div>
                ${badge(tk.status)}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  };

  const renderTableView=(list)=>{
    if(!list.length){
      return `
        <div class="empty" style="padding:36px 16px;">
          <b>${lang==='vi'?'Không tìm thấy công việc nào':'No tasks found'}</b>
          <p class="muted">${lang==='vi'?'Không có nhiệm vụ nào khớp với bộ lọc hiện tại.':'No tasks match your current filter.'}</p>
        </div>
      `;
    }
    return `
      <div class="notion-table-container">
        <table class="notion-table-view">
          <thead>
            <tr>
              <th scope="col" style="width:36px;text-align:center;"><span class="sr-only">${lang==='vi'?'Chọn':'Select'}</span></th>
              <th scope="col" style="min-width:200px;"><i class="ph-bold ph-text-t" aria-hidden="true"></i> ${lang==='vi'?'Tên công việc':'Task name'}</th>
              <th scope="col" style="width:120px;"><i class="ph-bold ph-circle-dashed" aria-hidden="true"></i> ${lang==='vi'?'Trạng thái':'Status'}</th>
              <th scope="col" style="width:130px;"><i class="ph-bold ph-user" aria-hidden="true"></i> ${lang==='vi'?'Phụ trách':'Assignee'}</th>
              <th scope="col" style="width:90px;"><i class="ph-bold ph-lightning" aria-hidden="true"></i> ${lang==='vi'?'Điểm':'Points'}</th>
              <th scope="col" style="width:115px;"><i class="ph-bold ph-calendar" aria-hidden="true"></i> ${lang==='vi'?'Hạn chót':'Deadline'}</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(tk=>{
              const late=isOverdue(tk.deadline)&&tk.status!=='done';
              const assigned=String(tk.assignee_ids||'').split(',').map(Number).includes(state.user?.id);
              const canComplete=assigned&&['todo','in_progress'].includes(tk.status);
              const isDone=tk.status==='done';
              return `
                <tr>
                  <td style="text-align:center;">
                    <button class="check ${isDone?'is-done':''}" style="width:18px;height:18px;border-radius:4px;margin:0 auto;display:grid;place-items:center;" ${canComplete?`data-task-done="${tk.id}"`:isDone?'':'disabled'} title="${canComplete?t('Mark complete'):'View only'}">
                      ${isDone ? '<i class="ph-bold ph-check" style="font-size:12px;"></i>' : ''}
                    </button>
                  </td>
                  <td>
                    <button class="notion-task-table-title" data-task-view="${tk.id}">
                      ${esc(tk.title)}
                    </button>
                  </td>
                  <td>
                    ${badge(tk.status)}
                  </td>
                  <td>
                    <span style="display:inline-flex;align-items:center;gap:6px;font-size:12px;">
                      <span class="avatar" style="width:18px;height:18px;font-size:8px;">${(tk.assignee_name||'U').slice(0, 1).toUpperCase()}</span>
                      ${esc(tk.assignee_name||(lang==='vi'?'Chưa phân công':'Unassigned'))}
                    </span>
                  </td>
                  <td>
                    ${tk.weight ? `<span class="badge weight"><span class="badge-dot"></span><i class="ph-bold ph-lightning"></i> ${tk.weight}đ</span>` : `<span class="muted" style="font-size:11px;">—</span>`}
                  </td>
                  <td>
                    <span class="notion-table-due ${late?'late':''}">
                      ${shortDate(tk.deadline).day} ${shortDate(tk.deadline).month}
                    </span>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        <div class="notion-table-footer">
          <span class="notion-table-summary">∑ ${list.length} ${lang==='vi'?'công việc':'tasks'}</span>
        </div>
      </div>
    `;
  };

  const renderActiveTaskList=()=>{
    const list=getFilteredTasks(activeTab);
    return viewMode==='table' ? renderTableView(list) : renderCardView(list);
  };

  // Count metrics for quick filter badges
  const todayTasks=userTasks.filter(tk=>tk.deadline&&dateOnlyDiffDays(tk.deadline)<=0&&tk.status!=='done');
  const overdueTasksList=userTasks.filter(tk=>isOverdue(tk.deadline)&&tk.status!=='done');
  const doneTasksList=userTasks.filter(tk=>tk.status==='done');

  $('#content').innerHTML=`
    <div class="notion-dashboard">
      <!-- Minimalist Editorial Dashboard Header -->
      <div class="notion-doc-header">
        <div class="notion-doc-left">
          <div class="notion-doc-icon"><i class="ph-bold ph-shield-check" style="font-size:22px;color:#111111;"></i></div>
          <div class="notion-doc-title">
            <span class="minimal-mono-eyebrow">BAN TỔ CHỨC - KIỂM TRA · EXECUTIVE WORKSPACE</span>
            <h1>${lang==='vi'?'Ban Tổ chức - Kiểm tra':'Organization & Inspection Committee'}</h1>
            <p class="notion-doc-subtitle">
              ${lang==='vi'?`Xin chào <strong>${esc(state.user?.name||'Bạn')}</strong>! Bạn có <strong>${openTasks}</strong> nhiệm vụ cần làm${overdueTasks>0?`, trong đó <span class="minimal-text-alert">${overdueTasks} việc quá hạn</span>`:''}.`:`Welcome back <strong>${esc(state.user?.name||'User')}</strong>! You have <strong>${openTasks}</strong> open tasks.`}
            </p>
          </div>
        </div>
        <div class="notion-doc-actions">
          <button class="btn primary" data-new title="${t('Propose activity')}"><i class="ph-bold ph-plus"></i> ${lang==='vi'?'Đề xuất hoạt động':'Propose activity'}</button>
          <a class="btn" href="#calendar"><i class="ph-bold ph-calendar-blank"></i> ${lang==='vi'?'Lịch sự kiện':'Calendar'}</a>
          <a class="btn" href="#activities"><i class="ph-bold ph-kanban"></i> ${lang==='vi'?'Hoạt động':'Activities'}</a>
        </div>
      </div>

      <!-- Actionable Minimalist Bento KPI Grid -->
      <div class="notion-kpi-grid">
        <a class="notion-kpi-card" style="--i:1" href="#activities" title="${lang==='vi'?'Xem tất cả hoạt động':'View all activities'}">
          <div class="notion-kpi-top">
            <div class="notion-kpi-icon sky"><i class="ph-bold ph-rocket-launch"></i></div>
            <span class="badge completed"><span class="badge-dot"></span>${lang==='vi'?'Đang chạy':'Active'}</span>
          </div>
          <div class="notion-kpi-body">
            <div class="notion-kpi-value">${activeActivities}</div>
            <div class="notion-kpi-label">${lang==='vi'?'Hoạt động đang diễn ra':'Active Activities'}</div>
          </div>
        </a>

        <div class="notion-kpi-card" style="--i:2" id="kpi-open-tasks" style="cursor:pointer;" title="${lang==='vi'?'Click để lọc việc cần làm':'Filter open tasks'}">
          <div class="notion-kpi-top">
            <div class="notion-kpi-icon orange"><i class="ph-bold ph-clipboard-text"></i></div>
            <span class="badge self-logged"><span class="badge-dot"></span>${lang==='vi'?'Cần xử lý':'Open'}</span>
          </div>
          <div class="notion-kpi-body">
            <div class="notion-kpi-value">${openTasks}</div>
            <div class="notion-kpi-label">${lang==='vi'?'Nhiệm vụ đang mở':'Open Tasks'}</div>
          </div>
        </div>

        <div class="notion-kpi-card" style="--i:3" id="kpi-overdue-tasks" style="cursor:pointer;" title="${lang==='vi'?'Click để lọc việc quá hạn':'Filter overdue tasks'}">
          <div class="notion-kpi-top">
            <div class="notion-kpi-icon pink"><i class="ph-bold ph-warning-circle"></i></div>
            <span class="badge ${overdueTasks>0?'urgent':'completed'}"><span class="badge-dot"></span>${overdueTasks>0?(lang==='vi'?'Cần xử lý gấp':'Urgent'):(lang==='vi'?'Đúng tiến độ':'On time')}</span>
          </div>
          <div class="notion-kpi-body">
            <div class="notion-kpi-value ${overdueTasks>0?'alert':''}">${overdueTasks}</div>
            <div class="notion-kpi-label">${lang==='vi'?'Nhiệm vụ quá hạn':'Overdue Tasks'}</div>
          </div>
        </div>

        <div class="notion-kpi-card" style="--i:4">
          <div class="notion-kpi-top">
            <div class="notion-kpi-icon green"><i class="ph-bold ph-lightning"></i></div>
            <span class="badge completed"><span class="badge-dot"></span><i class="ph-bold ph-lightning"></i> ${totalWeights}đ</span>
          </div>
          <div class="notion-kpi-body">
            <div class="notion-kpi-value">${efficiencyPct}%</div>
            <div class="notion-kpi-label">${lang==='vi'?'Hiệu suất hoàn thành':'Completion Rate'}</div>
            <div class="notion-progress-bar" style="margin-top:6px;">
              <div class="notion-progress-fill" style="width:${efficiencyPct}%;"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Notion Workspace Grid (2 Columns: Tasks on Left, Insights & Events on Right) -->
      <div class="notion-workspace-grid">
        <!-- Left Column: Interactive Task Hub -->
        <div class="notion-db-card">
          <div class="notion-db-head">
            <div class="notion-db-title">
              <i class="ph-bold ph-check-square-offset"></i>
              <span>${lang==='vi'?'Quản lý nhiệm vụ':'Task Management'}</span>
            </div>

            <!-- View Switcher (Cards vs Table) -->
            <div style="display:flex;align-items:center;gap:8px;">
              <div class="notion-db-tabs">
                <button class="notion-tab-pill ${viewMode==='cards'?'active':''}" data-viewmode="cards" title="${lang==='vi'?'Dạng thẻ (Phím C)':'Card view (Key C)'}">
                  <kbd class="minimal-kbd">C</kbd> ${lang==='vi'?'Thẻ':'Cards'}
                </button>
                <button class="notion-tab-pill ${viewMode==='table'?'active':''}" data-viewmode="table" title="${lang==='vi'?'Dạng bảng (Phím T)':'Table view (Key T)'}">
                  <kbd class="minimal-kbd">T</kbd> ${lang==='vi'?'Bảng':'Table'}
                </button>
              </div>
            </div>
          </div>

          <!-- Filter Tabs & Quick Search Bar -->
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;border-bottom:1px solid var(--line);padding-bottom:12px;">
            <div class="notion-db-tabs" style="flex-wrap:wrap;">
              <button class="notion-tab-pill ${activeTab==='open'?'active':''}" data-tab="open">
                ${lang==='vi'?'Cần làm':'To Do'} (${openTasks})
              </button>
              <button class="notion-tab-pill ${activeTab==='today'?'active':''}" data-tab="today">
                ${lang==='vi'?'Hôm nay':'Today'} (${todayTasks.length})
              </button>
              <button class="notion-tab-pill ${activeTab==='overdue'?'active':''}" data-tab="overdue">
                ${lang==='vi'?'Quá hạn':'Overdue'} (${overdueTasksList.length})
              </button>
              <button class="notion-tab-pill ${activeTab==='done'?'active':''}" data-tab="done">
                ${lang==='vi'?'Đã xong':'Done'} (${doneTasksList.length})
              </button>
              <button class="notion-tab-pill ${activeTab==='all'?'active':''}" data-tab="all">
                ${lang==='vi'?'Tất cả':'All'} (${userTasks.length})
              </button>
            </div>

            <div class="notion-db-search" style="margin:0;width:200px;">
              <i class="ph-bold ph-magnifying-glass"></i>
              <input type="text" id="notion-task-search" placeholder="${lang==='vi'?'Lọc theo tên…':'Search tasks…'}" value="${esc(searchQuery)}" />
            </div>
          </div>

          <!-- Dynamic Task List Container -->
          <div id="notion-task-dynamic-wrap">
            ${renderActiveTaskList()}
          </div>

          <div class="notion-db-foot">
            <a class="notion-link-btn" href="#my-tasks">${lang==='vi'?'Xem toàn bộ công việc chi tiết ›':'View all tasks in detail ›'}</a>
            <span class="muted" style="font-size:12px;">${userTasks.length} ${lang==='vi'?'nhiệm vụ tổng thể':'total recorded tasks'}</span>
          </div>
        </div>

        <!-- Right Column: Operational Stack (Events, Activities, Activity Feed) -->
        <div class="notion-right-stack">
          <!-- Upcoming Events Block -->
          <div class="notion-card-block">
            <div class="notion-block-head">
              <h3><i class="ph-bold ph-calendar-blank" style="color:#2383e2;"></i> ${lang==='vi'?'Lịch sự kiện & Deadline':'Upcoming Calendar'}</h3>
              <a class="notion-link-btn" href="#calendar">${lang==='vi'?'Lịch đầy đủ ›':'Calendar ›'}</a>
            </div>
            <div style="display:flex;flex-direction:column;gap:8px;">
              ${upcomingEvents.length ? upcomingEvents.map(evt=>{
                const dTime=shortDate(evt.deadline);
                return `
                  <a class="notion-event-row" href="#activity/${evt.id}">
                    <div class="notion-event-date">
                      <small>${dTime.month}</small>
                      <strong>${dTime.day}</strong>
                    </div>
                    <div class="notion-event-info">
                      <h4>${esc(evt.title)}</h4>
                      <span><i class="team-dot" style="background:${evt.team_color||'#2383e2'};"></i>${esc(evt.team_names||evt.team_name||'TCKT')}</span>
                    </div>
                    <i class="ph-bold ph-caret-right" style="color:#a8a49c;font-size:14px;"></i>
                  </a>
                `;
              }).join('') : `<p class="muted" style="font-size:12.5px;margin:8px 0;">${lang==='vi'?'Không có sự kiện sắp tới':'No upcoming events'}</p>`}
            </div>
          </div>

          <!-- Active Activities Block with Progress -->
          <div class="notion-card-block">
            <div class="notion-block-head">
              <h3><i class="ph-bold ph-kanban" style="color:#2383e2;"></i> ${lang==='vi'?'Hoạt động đang diễn ra':'Active Activities'}</h3>
              <a class="notion-link-btn" href="#activities">${lang==='vi'?'Tất cả ›':'All ›'}</a>
            </div>
            <div class="notion-gallery-list">
              ${(d.upcoming||[]).filter(a=>a.status==='active'||a.status==='approved').slice(0, 3).map(a=>`
                <div class="notion-activity-item">
                  <div class="notion-activity-head">
                    <span class="notion-activity-title"><i class="team-dot" style="background:${a.team_color||'#2383e2'}"></i>${esc(a.title)}</span>
                    ${badge(a.status)}
                  </div>
                  <div class="notion-activity-lead">
                    <span>${esc(a.team_names||a.team_name||'TCKT')} · ${a.event_lead_name?`Trưởng BTC: ${esc(a.event_lead_name)}`:date(a.deadline)}</span>
                  </div>
                  <div class="notion-progress-bar">
                    <div class="notion-progress-fill" style="width:${pct(a.done_count, a.task_count)}%;background:#2383e2;"></div>
                  </div>
                  <div class="notion-activity-links" style="display:flex;gap:8px;font-size:11.5px;margin-top:2px;">
                    <a href="#board/${a.id}" style="color:#2383e2;text-decoration:none;"><i class="ph-bold ph-kanban"></i> Kanban</a>
                    <span class="muted">·</span>
                    <a href="#activity/${a.id}" style="color:#2383e2;text-decoration:none;"><i class="ph-bold ph-info"></i> ${lang==='vi'?'Chi tiết':'Details'}</a>
                  </div>
                </div>
              `).join('') || `<p class="muted" style="font-size:12.5px;margin:8px 0;">${lang==='vi'?'Chưa có hoạt động đang chạy':'No active activities'}</p>`}
            </div>
          </div>

          <!-- Activity Updates Feed -->
          <div class="notion-card-block">
            <div class="notion-block-head">
              <h3><i class="ph-bold ph-chat-centered-text" style="color:#2383e2;"></i> ${lang==='vi'?'Nhật ký hoạt động':'Recent Updates'}</h3>
            </div>
            <div class="notion-feed-list">
              ${recentFeed.length ? recentFeed.map(item=>`
                <div class="notion-feed-row">
                  <div class="avatar" style="width:26px;height:26px;font-size:10px;background:${item.avatar_color||'#2383e2'}">
                    ${(item.user_name||'TC').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p style="margin:0 0 2px;font-size:12px;line-height:1.4;"><strong>${esc(item.user_name)}</strong> · ${badge(item.kind)}<br>${esc(item.body)}</p>
                    <time style="font-size:10.5px;color:#8e8b86;">${relative(item.created_at)} · <a href="#activity/${item.activity_id}" style="color:#2383e2;text-decoration:none;">${esc(item.activity_title)}</a></time>
                  </div>
                </div>
              `).join('') : `<p class="muted" style="font-size:12.5px;margin:8px 0;">${lang==='vi'?'Chưa có cập nhật mới':'No recent updates'}</p>`}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Dynamic updates and bindings
  const updateTaskDom=()=>{
    const wrap=$('#notion-task-dynamic-wrap');
    if(wrap){
      wrap.innerHTML=renderActiveTaskList();
      bindTaskChecks();
      $$('[data-task-view]').forEach(b=>b.onclick=()=>taskDetailModal(b.dataset.taskView));
    }
  };

  // Bind Tab Switching
  $$('[data-tab]').forEach(btn=>{
    btn.onclick=()=>{
      $$('[data-tab]').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      activeTab=btn.dataset.tab;
      updateTaskDom();
    };
  });

  // Bind View Mode Switching (Cards vs Table)
  $$('[data-viewmode]').forEach(btn=>{
    btn.onclick=()=>{
      $$('[data-viewmode]').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      viewMode=btn.dataset.viewmode;
      updateTaskDom();
    };
  });

  // Bind KPI card shortcuts
  $('#kpi-open-tasks')?.addEventListener('click', ()=>{
    const targetTabBtn=$('[data-tab="open"]');
    targetTabBtn?.click();
    targetTabBtn?.scrollIntoView({ behavior:'smooth', block:'nearest' });
  });
  $('#kpi-overdue-tasks')?.addEventListener('click', ()=>{
    const targetTabBtn=$('[data-tab="overdue"]');
    targetTabBtn?.click();
    targetTabBtn?.scrollIntoView({ behavior:'smooth', block:'nearest' });
  });

  // Bind Search Filter
  const searchInput=$('#notion-task-search');
  if(searchInput){
    searchInput.oninput=(e)=>{
      searchQuery=e.target.value;
      updateTaskDom();
    };
  }

  bindNew();

  // Minimalist Key Navigation: 'c' for card view, 't' for table view
  const handleMinimalKeys = (e) => {
    if (location.hash !== '#dashboard' && location.hash !== '') {
      window.removeEventListener('keydown', handleMinimalKeys);
      return;
    }
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) || document.activeElement?.isContentEditable) return;
    if (e.key === 'c' || e.key === 'C') {
      const b = $('[data-viewmode="cards"]');
      if (b && !b.classList.contains('active')) b.click();
    } else if (e.key === 't' || e.key === 'T') {
      const b = $('[data-viewmode="table"]');
      if (b && !b.classList.contains('active')) b.click();
    }
  };
  window.addEventListener('keydown', handleMinimalKeys);
  bindTaskChecks();
  $$('[data-task-view]').forEach(b=>b.onclick=()=>taskDetailModal(b.dataset.taskView));
}


function eventRow(a){const d=shortDate(a.deadline);return `<a class="event-row" href="#activity/${a.id}"><div class="date-box"><strong>${d.day}</strong><small>${d.month}</small></div><div><h3>${esc(a.title)}</h3><div class="meta"><span><i class="team-dot" style="background:${a.team_color}"></i>${esc(a.team_names||a.team_name)}</span><span>${countLabel(a.participant_count,'people')}</span></div><div class="progress"><span style="width:${pct(a.done_count,a.task_count)}%"></span></div></div>${badge(a.status)}</a>`}
function taskRow(tk){const late=isOverdue(tk.deadline)&&tk.status!=='done',assigned=String(tk.assignee_ids||'').split(',').map(Number).includes(state.user?.id),canComplete=assigned&&['todo','in_progress'].includes(tk.status);const selfLoggedBadge=tk.is_self_logged?`<span class="badge self-logged" title="${translate('Self-logged work')}"><span class="badge-dot"></span>${translate('Self-logged')}</span> `:'';const weightBadge=(tk.weight!==undefined&&tk.weight!==null)?`<span class="badge weight" title="${translate('Weight')}: ${tk.weight}"><span class="badge-dot"></span>${icon('lightning')} ${tk.weight}đ</span> `:'';return `<div class="task-row"><button class="check" ${canComplete?`data-task-done="${tk.id}"`:'disabled'} title="${canComplete?'Mark complete':'View only'}"></button><div><h4><button class="task-title-link" data-task-view="${tk.id}">${selfLoggedBadge}${weightBadge}${esc(tk.title)}</button></h4><div class="meta"><span>${esc(tk.activity_title||tk.team_name)}</span>${tk.assignee_name?`<span>${esc(tk.assignee_name)}</span>`:''}</div></div><span class="due ${late?'late':''}">${relative(tk.deadline,tk.status)}</span></div>${state.showTaskEvidence?taskEvidence(tk,state.activityAttachments.filter(x=>x.task_id===tk.id)):''}`}
const fileSize=n=>n>=1048576?`${(n/1048576).toFixed(1)} MB`:n>=1024?`${Math.round(n/1024)} KB`:`${n} B`;
function taskEvidence(task,items){const used=items.reduce((sum,x)=>sum+Number(x.size_bytes||0),0);return `<div class="task-evidence"><div class="evidence-head"><span><strong>Files & relevant links</strong><small>${fileSize(used)} / 50 MB</small></span><button class="btn small" data-attach-task="${task.id}" data-task-title="${esc(task.title)}" data-used="${used}">${icon('plus')} Add</button></div>${items.length?`<div class="evidence-list">${items.map(x=>`<a class="evidence-item" href="${x.link_url?esc(x.link_url):`/api/task-attachments/${x.id}/content`}" target="_blank" rel="noopener noreferrer"><span class="file-icon">${x.mime_type?.startsWith('image/')?icon('image'):x.link_url?icon('arrow-square-out'):icon('file-text')}</span><span><strong>${esc(x.label)}</strong><small>${esc(x.user_name)} · ${badge(x.kind)} ${x.size_bytes?`· ${fileSize(x.size_bytes)}`:''}</small></span></a>`).join('')}</div>`:'<p class="muted evidence-empty">No files or links yet.</p>'}</div>`}
function feedItem(x){return `<div class="feed-item">${avatar(x.user_name,x.avatar_color)}<div><p><strong>${esc(x.user_name)}</strong> · ${badge(x.kind)}<br>${esc(x.body)}</p><time>${date(x.created_at)} · <a href="#activity/${x.activity_id}">${esc(x.activity_title)}</a></time></div></div>`}

async function activities(){state.teams.length||(state.teams=await api('/api/teams'));$('#content').innerHTML=`${pageHeader({title:'Activities',description:'Plan, coordinate and follow every initiative.',actions:`<button class=\"btn primary\" data-new>${icon('plus')} <span class=\"label\">Propose activity</span></button>`})}<div class="toolbar"><label class="search"><input id="activity-search" placeholder="Search activities…"></label><select id="status-filter"><option value="all">All statuses</option><option>proposed</option><option>approved</option><option>active</option><option>completed</option></select><select id="type-filter"><option value="all">All types</option><option value="event">Team events</option><option value="assigned">Assigned</option></select></div><div id="activity-grid" class="activity-grid"></div>`;bindNew();const load=async()=>{const rows=await api(`/api/activities?q=${encodeURIComponent($('#activity-search').value)}&status=${$('#status-filter').value}&type=${$('#type-filter').value}`);$('#activity-grid').innerHTML=rows.length?rows.map(activityCard).join(''):empty('No activities found','Try changing your search or filters.')};let timer;$('#activity-search').oninput=()=>{clearTimeout(timer);timer=setTimeout(load,250)};$('#status-filter').onchange=load;$('#type-filter').onchange=load;await load()}
function activityCard(a){return `<article class="activity-card" style="--activity-team:${esc(a.team_color)}"><div class="card-top"><span class="meta"><span><i class="team-dot" style="background:${a.team_color}"></i>${esc(a.team_names||a.team_name)}</span></span>${badge(a.status)}</div><h3><a class="activity-title-link" href="#activity/${a.id}">${esc(a.title)}</a></h3><p>${esc(a.description).slice(0,125)}${a.description.length>125?'…':''}</p>${a.proposal_document_url?`<a class="activity-document-link" href="${esc(a.proposal_document_url)}" target="_blank" rel="noopener noreferrer">${icon('arrow-square-out')} ${t('Main activity proposal document')}</a>`:''}<div class="card-bottom"><div class="meta"><span>${t(a.type==='event'?'Team event':'Leadership assigned')}</span><span>${countLabel(a.participant_count,'people')}</span><span>${date(a.deadline)}</span></div><div class="progress"><span style="width:${pct(a.done_count,a.task_count)}%;background:${esc(a.team_color)}"></span></div></div></article>`}

async function activityDetail(id){const d=await api(`/api/activities/${id}`),a=d.activity;state.teams.length||(state.teams=await api('/api/teams'));const stages=a.type==='event'?['before','during','after']:['general'];$('#content').innerHTML=`<a class="text-link" href="#activities">${icon('arrow-left')} ${t('Back to activities')}</a><section class="activity-hero-editorial"><div class="hero-eyebrow">${badge(a.status)} ${badge(a.priority)}</div><h1>${esc(a.title)}</h1><p>${esc(a.description)}</p><div class="hero-meta"><span><i class="ph-bold ph-users"></i> ${esc(d.activityTeams.map(x=>x.name).join(', '))}</span><span><i class="ph-bold ph-calendar"></i> ${date(a.start_date)} — ${date(a.deadline)}</span>${a.location?`<span><i class="ph-bold ph-map-pin"></i> ${esc(a.location)}</span>`:''}<span><i class="ph-bold ph-user"></i> ${esc(a.creator_name)}</span>${a.event_lead_name?`<span><i class="ph-bold ph-star"></i> Trưởng BTC: ${esc(a.event_lead_name)}</span>`:''}</div></section><div id="proposal-actions"></div><div class="grid-2"><div><section class="panel"><div class="panel-head"><h2>Work plan</h2><span style="display:flex;gap:8px"><a class="btn small" href="#board/${id}">${t('Kanban')}</a>${['approved','active'].includes(a.status)?`<button class="btn small primary" id="self-log-task-btn">${icon('plus')} ${t('Tự ghi nhận việc')}</button>`:''}${d.canManage?`<button class="btn small" data-add-task>${icon('plus')} ${t('Add task')}</button>`:''}</span></div>${stages.map(s=>`<div class="stage"><h3>${s} ${a.type==='event'?'the event':''}</h3>${d.tasks.filter(tk=>tk.stage===s&&tk.status!=='cancelled').map(tk=>taskRow(tk)+`<div class="meta task-schedule">${tk.start_date?`Start ${date(tk.start_date)} · `:''}Deadline ${date(tk.deadline)}${tk.deliverable?` · ${esc(tk.deliverable)}`:''}</div>`).join('')||'<p class="muted">No tasks in this stage.</p>'}</div>`).join('')}</section><section class="panel" style="margin-top:20px"><div class="panel-head"><h2>Updates & evidence</h2></div><form id="update-form" class="form"><div class="form-grid"><select name="kind"><option value="comment">Comment</option><option value="progress">Progress update</option><option value="issue">Issue</option><option value="evidence">Evidence</option></select><input name="attachment_url" type="url" placeholder="Document URL (optional)"></div><textarea name="body" placeholder="Share an update with the team…" required></textarea><button class="btn primary" style="justify-self:end">Post update</button></form><div class="timeline" style="margin-top:25px">${d.updates.map(x=>`<div class="timeline-item"><div class="meta"><strong>${esc(x.user_name)}</strong>${badge(x.kind)}<time>${date(x.created_at)}</time></div><p>${esc(x.body)}</p>${x.attachment_url?`<a class="text-link" target="_blank" rel="noopener noreferrer" href="${esc(x.attachment_url)}">View attachment ${icon('arrow-square-out')}</a>`:''}</div>`).join('')||'<p class="muted">No updates yet.</p>'}</div></section></div><aside><section class="panel"><div class="panel-head"><h2>Involved teams</h2></div>${d.activityTeams.map(x=>`<div class="team-line"><i class="team-dot" style="background:${x.color}"></i><div><strong>${esc(x.name)}</strong><p>${esc(x.responsibility||x.role)}</p></div>${badge(x.role)}</div>`).join('')}</section><section class="panel" style="margin-top:20px"><div class="panel-head"><h2>Participants</h2><button class="btn small" id="volunteer">Volunteer</button></div>${d.participants.map(p=>`<div class="person" style="border:0;padding:9px 0">${avatar(p.name,p.avatar_color)}<div><h3>${esc(p.name)} ${badge(p.state)}</h3><p>${esc(p.responsibility||p.role)}</p></div></div>`).join('')||'<p class="muted">No participants yet.</p>'}</section><section class="panel" style="margin-top:20px"><h2>Activity details</h2><p class="muted">${a.event_lead_name?`Trưởng BTC: <strong>${esc(a.event_lead_name)}</strong><br>`:''}${a.type==='assigned'&&a.requested_by?`Requested by ${esc(a.requested_by)}<br>`:''}Created ${date(a.created_at)}<br>Last updated ${date(a.updated_at)}</p>${d.canManage&&isExec()?`<label style="display:grid;gap:6px;font-size:11px;font-weight:700;margin-top:16px">Status<select id="activity-status" style="padding:9px;border:1px solid var(--line);border-radius:8px"><option ${a.status==='proposed'?'selected':''}>proposed</option><option ${a.status==='approved'?'selected':''}>approved</option><option ${a.status==='active'?'selected':''}>active</option><option ${a.status==='completed'?'selected':''}>completed</option><option ${a.status==='cancelled'?'selected':''}>cancelled</option></select></label>`:''}</section>${d.proposalHistory?.length?`<section class="panel" style="margin-top:20px"><div class="panel-head"><h2>Proposal history</h2></div><div class="proposal-timeline">${d.proposalHistory.map(p=>`<div class="proposal-entry"><div class="meta">${badge(p.action)}<strong>${esc(p.submitter_name)}</strong>${p.reviewer_name?`→ ${esc(p.reviewer_name)}`:''}<time>${date(p.created_at)}</time></div>${p.feedback_notes?`<p>${esc(p.feedback_notes)}</p>`:''}</div>`).join('')}</div></section>`:''}</aside></div>`;
if(a.proposal_document_url)$('.activity-hero-editorial p').insertAdjacentHTML('afterend',`<a class="hero-document-link" href="${esc(a.proposal_document_url)}" target="_blank" rel="noopener noreferrer">${icon('arrow-square-out')} ${t('Open activity proposal document')}</a>`);if(isExec()){$('.activity-hero-editorial').insertAdjacentHTML('afterbegin',`<div class="activity-admin-actions"><button class="btn small danger" id="delete-activity">${t('Delete activity')}</button><button class="btn small activity-edit-btn" id="edit-activity">${t('Edit activity')}</button></div>`);$('#edit-activity').onclick=()=>editActivityModal(id,a,d.activityTeams);$('#delete-activity').onclick=()=>deleteActivity(id,a.title)}const participantHead=$('#volunteer').closest('.panel-head');if(d.canManage&&participantHead){participantHead.insertAdjacentHTML('beforeend',`<button class="btn small" id="add-participants">${icon('plus')} ${t('Add members')}</button>`);$('#add-participants').onclick=()=>participantModal(id,d.people,d.participants)}$('#volunteer').onclick=async()=>{await api(`/api/activities/${id}/volunteer`,{method:'POST'});toast('Your interest has been recorded');activityDetail(id)};$('#update-form').onsubmit=async e=>{e.preventDefault();await api(`/api/activities/${id}/updates`,{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(e.target)))});toast('Update posted');activityDetail(id)};$('#activity-status')?.addEventListener('change',async e=>{const newStatus=e.target.value;if(newStatus==='cancelled'){confirmModal(t('Hủy hoạt động'),t('Hoạt động này sẽ bị xóa vĩnh viễn cùng toàn bộ công việc, cập nhật và tệp đính kèm liên quan. Không thể hoàn tác.'),async()=>{await api(`/api/activities/${id}`,{method:'PATCH',body:JSON.stringify({status:newStatus})});toast(t('Đã xóa hoạt động'));location.hash='activities'},{confirmLabel:t('Xóa vĩnh viễn')});e.target.value=a.status;return}await api(`/api/activities/${id}`,{method:'PATCH',body:JSON.stringify({status:newStatus})});toast('Status updated');activityDetail(id)});$('[data-add-task]')?.addEventListener('click',()=>taskModal(id,d.activityTeams,d.people));$('#self-log-task-btn')?.addEventListener('click',()=>selfLogTaskModal(id,d.activityTeams));bindTaskChecks();renderProposalActions(id,a,d)}
function feedbackPromptModal(title,onSubmit){openModal(`<span class="eyebrow green">FEEDBACK</span><h2>${esc(title)}</h2><form id="feedback-form" class="form"><textarea name="feedback" placeholder="Feedback…" required></textarea><button class="btn primary wide">Submit</button></form>`);$('#feedback-form').onsubmit=async e=>{e.preventDefault();try{await onSubmit(String(new FormData(e.target).get('feedback')||'').trim());$('#modal').close()}catch(err){toast(err.message)}}}
function renderProposalActions(id,a,d){const box=$('#proposal-actions');if(!box)return;const buttons=[];if(isExec()&&a.status==='proposed'){buttons.push(`<button class="btn small primary" id="proposal-approve">${t('Phê duyệt')}</button><button class="btn small" id="proposal-request-changes">${t('Yêu cầu sửa đổi')}</button><button class="btn small danger" id="proposal-reject">${t('Từ chối')}</button>`)}if(a.status==='changes_requested'&&d.canManage){buttons.push(`<button class="btn small primary" id="proposal-resubmit">${t('Nộp lại đề án')}</button>`)}if(!buttons.length){box.innerHTML='';return}box.innerHTML=`<div class="proposal-actions">${buttons.join('')}</div>`;$('#proposal-approve')?.addEventListener('click',async()=>{try{await api(`/api/activities/${id}/approve`,{method:'POST'});toast('Status updated');activityDetail(id)}catch(err){toast(err.message)}});$('#proposal-reject')?.addEventListener('click',()=>feedbackPromptModal(t('Từ chối'),async feedback=>{if(!feedback)throw new Error('Feedback is required.');await api(`/api/activities/${id}/reject`,{method:'POST',body:JSON.stringify({feedback})});toast(t('Đã từ chối và xóa đề án'));location.hash='activities'}));$('#proposal-request-changes')?.addEventListener('click',()=>feedbackPromptModal(t('Yêu cầu sửa đổi'),async feedback=>{if(!feedback)throw new Error('Feedback is required.');await api(`/api/activities/${id}/request-changes`,{method:'POST',body:JSON.stringify({feedback})});toast('Status updated');activityDetail(id)}));$('#proposal-resubmit')?.addEventListener('click',async()=>{try{await api(`/api/activities/${id}/submit`,{method:'POST'});toast('Activity proposed');activityDetail(id)}catch(err){toast(err.message)}})}

async function deleteActivity(activityId,title){const confirmation=prompt(`${t('Type the activity title to permanently delete it:')}\n\n${title}`);if(confirmation===null)return;if(confirmation!==title)return toast(t('The activity title did not match. Nothing was deleted.'));try{await api(`/api/activities/${activityId}`,{method:'DELETE'});location.hash='activities';toast(t('Activity permanently deleted'))}catch(error){toast(error.message)}}

function submitReviewModal(taskId,onDone){openModal(`<span class="eyebrow green">NGHIỆM THU</span><h2>Nộp nghiệm thu</h2><p class="muted">Đính kèm liên kết hoặc tệp minh chứng cùng ghi chú.</p><form id="kanban-submit-review-form" class="form" enctype="multipart/form-data"><input type="url" name="link_url" placeholder="Liên kết minh chứng (không bắt buộc)"><label class="upload-zone" style="opacity:.5;pointer-events:none" title="Tạm thời tắt tính năng tải tệp lên, vui lòng dùng liên kết minh chứng.">Tệp bàn giao (tạm thời tắt, vui lòng dùng liên kết)<input type="file" name="file" disabled accept=".jpg,.jpeg,.png,.gif,.webp,.heic,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"></label><textarea name="notes" placeholder="Ghi chú (không bắt buộc)"></textarea><button class="btn primary wide">Nộp nghiệm thu</button></form>`);$('#kanban-submit-review-form').onsubmit=async e=>{e.preventDefault();const button=$('button',e.target);button.disabled=true;try{const res=await fetch(`/api/tasks/${taskId}/submit-review`,{method:'POST',body:new FormData(e.target)}),data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||'Upload failed');$('#modal').close();toast('Đã nộp nghiệm thu');onDone?.()}catch(err){toast(err.message);button.disabled=false}}}
function reviewTaskAction(taskId,decision,onDone){if(decision==='reject'||decision==='cancel'){const promptTitle=decision==='cancel'?translate('Bác bỏ công việc'):translate('Yêu cầu làm lại');feedbackPromptModal(promptTitle,async feedback=>{if(!feedback)throw new Error(decision==='cancel'?translate('Vui lòng nêu rõ lý do khi bác bỏ.'):translate('Vui lòng nêu rõ lý do khi yêu cầu làm lại.'));await api(`/api/tasks/${taskId}/review`,{method:'POST',body:JSON.stringify({decision,feedback})});toast(decision==='cancel'?translate('Đã bác bỏ công việc'):translate('Đã yêu cầu làm lại'));onDone?.()});return}(async()=>{try{await api(`/api/tasks/${taskId}/review`,{method:'POST',body:JSON.stringify({decision:'approve'})});toast(translate('Đã duyệt đạt'));onDone?.()}catch(err){toast(err.message)}})()}
async function taskBoard(activityId){
  const d=await api(`/api/activities/${activityId}`),a=d.activity;
  state.teams.length||(state.teams=await api('/api/teams'));
  const teamColor=teamId=>state.teams.find(x=>Number(x.id)===Number(teamId))?.color||'#1E3A8A';
  const columns=[['todo','To do'],['in_progress','In progress'],['review','Awaiting review'],['done','Done']];

  const cardHtml=tk=>{
    const overdue=isOverdue(tk.deadline)&&tk.status!=='done';
    const manages=canManageTaskTeam(tk.team_id);
    const assigned=String(tk.assignee_ids||'').split(',').filter(Boolean).map(Number).includes(state.user.id);
    const selfBadge=tk.is_self_logged?`<span class="badge self-logged"><span class="badge-dot"></span>${t('Tự ghi nhận')}</span>`:'';
    const weightBadge=(tk.weight!==undefined&&tk.weight!==null)?`<span class="badge weight"><span class="badge-dot"></span>${icon('lightning')} ${tk.weight}đ</span>`:'';
    let actions='';
    if(tk.status==='todo'&&(assigned||manages))actions=`<button class="btn small" data-move="${tk.id}" data-to="in_progress">${icon('arrow-right')} ${t('In progress')}</button>`;
    else if(tk.status==='in_progress'&&assigned)actions=`<button class="btn small" data-submit-review="${tk.id}">Nộp nghiệm thu</button>`;
    else if(tk.status==='review'&&manages)actions=`<button class="btn small primary" data-review="${tk.id}" data-decision="approve">${t('Approve')}</button><button class="btn small" data-review="${tk.id}" data-decision="reject">${t('Request rework')}</button><button class="btn small danger" data-review="${tk.id}" data-decision="cancel">${t('Bác bỏ')}</button>`;

    return `<article class="kanban-card" draggable="true" data-task-card="${tk.id}" data-task-status="${tk.status}" data-task-team="${tk.team_id}" data-task-view="${tk.id}" style="--card-team:${esc(teamColor(tk.team_id))}">
      <div class="kanban-card-top">${badge(tk.priority)}${selfBadge}${weightBadge}${overdue?'<span class="badge overdue"><span class="badge-dot"></span>Overdue</span>':''}</div>
      <h4>${esc(tk.title)}</h4>
      <div class="meta">${tk.primary_assignee_name?avatar(tk.primary_assignee_name):''}<span>${esc(tk.primary_assignee_name||'Unassigned')}</span></div>
      <div class="meta"><span>${Number(tk.checklist_done||0)}/${Number(tk.checklist_total||0)} checklist</span><span class="due ${overdue?'late':''}">${date(tk.deadline)}</span></div>
      ${actions?`<div class="kanban-card-actions">${actions}</div>`:''}
    </article>`;
  };

  $('#content').innerHTML=`
    <a class="text-link" href="#activity/${activityId}">${icon('arrow-left')} ${t('Back to activity')}</a>
    ${pageHeader({title:esc(a.title),description:`${t('Kanban board')} · <small class=\"muted\">${t('Drag card to change status')}</small>`,actions:(a.status==='approved'||a.status==='active')?`<div class=\"page-actions\"><button class=\"btn primary small\" id=\"kanban-self-log-btn\">${icon('plus')} ${t('Tự ghi nhận việc')}</button></div>`:''})}
    <div class="kanban-board">
      ${columns.map(([status,label])=>`
        <div class="kanban-column" data-status="${status}">
          <h3>${t(label)} <span class="badge"><span class="badge-dot"></span>${d.tasks.filter(x=>x.status===status).length}</span></h3>
          <div class="kanban-column-body">
            ${d.tasks.filter(x=>x.status===status).map(cardHtml).join('')||`<p class="muted">${lang==='vi'?'Trống':'Empty'}</p>`}
          </div>
        </div>
      `).join('')}
    </div>
  `;

  $('#kanban-self-log-btn')?.addEventListener('click',()=>selfLogTaskModal(activityId,d.activityTeams,()=>taskBoard(activityId)));

  $$('[data-move]').forEach(b=>b.onclick=async e=>{
    e.stopPropagation();
    try{
      await api(`/api/tasks/${b.dataset.move}/status`,{method:'PATCH',body:JSON.stringify({status:b.dataset.to})});
      toast('Status updated');
      taskBoard(activityId);
    }catch(err){toast(err.message)}
  });
  $$('[data-submit-review]').forEach(b=>b.onclick=e=>{
    e.stopPropagation();
    submitReviewModal(b.dataset.submitReview,()=>taskBoard(activityId));
  });
  $$('[data-review]').forEach(b=>b.onclick=e=>{
    e.stopPropagation();
    reviewTaskAction(b.dataset.review,b.dataset.decision,()=>taskBoard(activityId));
  });

  // HTML5 Drag & Drop handlers
  $$('.kanban-card').forEach(card=>{
    card.addEventListener('dragstart',e=>{
      e.dataTransfer.setData('text/plain',JSON.stringify({
        id:card.dataset.taskCard,
        status:card.dataset.taskStatus,
        teamId:card.dataset.taskTeam
      }));
      card.classList.add('dragging');
    });
    card.addEventListener('dragend',()=>card.classList.remove('dragging'));
  });

  $$('.kanban-column').forEach(col=>{
    col.addEventListener('dragover',e=>{
      e.preventDefault();
      col.classList.add('drag-over');
    });
    col.addEventListener('dragleave',()=>col.classList.remove('drag-over'));
    col.addEventListener('drop',async e=>{
      e.preventDefault();
      col.classList.remove('drag-over');
      const dataStr=e.dataTransfer.getData('text/plain');
      if(!dataStr)return;
      try{
        const data=JSON.parse(dataStr);
        const toStatus=col.dataset.status;
        if(data.status===toStatus)return;
        if(toStatus==='review'){
          submitReviewModal(data.id,()=>taskBoard(activityId));
        }else if(toStatus==='done'){
          reviewTaskAction(data.id,'approve',()=>taskBoard(activityId));
        }else if(['todo','in_progress'].includes(toStatus)){
          await api(`/api/tasks/${data.id}/status`,{method:'PATCH',body:JSON.stringify({status:toStatus})});
          toast('Status updated');
          taskBoard(activityId);
        }
      }catch(err){toast(err.message)}
    });
  });
}

async function myTasksToday(){
  const d=await api('/api/my-tasks-today');
  const renderItem=(x,isReviewSection=false)=>{
    const isOverdue=isOverdue(x.deadline)&&x.status!=='done';
    const selfBadge=x.is_self_logged?`<span class="badge self-logged" style="font-size:11px;margin-left:4px"><span class="badge-dot"></span>${t('Tự ghi nhận')}</span>`:'';
    const weightBadge=(x.weight!==undefined&&x.weight!==null)?`<span class="badge weight" style="font-size:11px;margin-left:4px"><span class="badge-dot"></span>${icon('lightning')} ${x.weight}đ</span>`:'';
    let actions=`<button class="btn small" data-task-view="${x.id}">${t('View details')}</button>`;
    if(isReviewSection){
      actions=`<button class="btn small primary" data-review="${x.id}" data-decision="approve">${t('Approve')}</button><button class="btn small" data-review="${x.id}" data-decision="reject">${t('Request rework')}</button><button class="btn small danger" data-review="${x.id}" data-decision="cancel">${t('Bác bỏ')}</button>`+actions;
    }else if(!x.acknowledged_at){
      actions=`<button class="btn small primary" data-quick-ack="${x.id}">${icon('check')} ${t('Acknowledge')}</button>`+actions;
    }else if(['todo','in_progress'].includes(x.status)){
      actions=`<button class="btn small" data-submit-review="${x.id}">Nộp nghiệm thu</button>`+actions;
    }
    return `
      <div class="today-task-row">
        <div class="today-task-main">
          <h3><button class="task-title-link" data-task-view="${x.id}">${esc(x.title)}</button>${selfBadge}${weightBadge}</h3>
          <div class="meta">
            <a href="#activity/${x.activity_id}"><span>${esc(x.activity_title)}</span></a>
            ${x.team_name?`<span>· ${esc(x.team_name)}</span>`:''}
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          ${badge(x.status)}
          <span class="due ${isOverdue?'late':''}">${date(x.deadline)}</span>
        </div>
        <div class="today-actions">
          ${actions}
        </div>
      </div>
    `;
  };

  const section=(title,items,emptyText,isReview=false)=>`
    <section class="panel" style="margin-top:20px">
      <div class="panel-head">
        <h2>${title}</h2>
        <span class="badge"><span class="badge-dot"></span>${items.length}</span>
      </div>
      <div style="margin-top:12px">
        ${items.length?items.map(it=>renderItem(it,isReview)).join(''):empty(emptyText,'')}
      </div>
    </section>
  `;

  $('#content').innerHTML=`
    ${pageHeader({title:t('My tasks today'),description:t('Work due today, overdue, or waiting on your review.')})}
    ${section(t('Due today'),d.dueToday,t('Nothing due today'))}
    ${section(t('Overdue'),d.overdue,t('Nothing overdue'))}
    ${d.pendingMyReview.length?section(t('Waiting on your review'),d.pendingMyReview,'',true):''}
  `;

  $$('[data-quick-ack]').forEach(b=>b.onclick=async e=>{
    e.stopPropagation();
    b.disabled=true;
    try{
      await api(`/api/tasks/${b.dataset.quickAck}/acknowledge`,{method:'POST'});
      toast('Đã xác nhận nhận việc');
      myTasksToday();
    }catch(err){
      toast(err.message);
      b.disabled=false;
    }
  });
  $$('[data-submit-review]').forEach(b=>b.onclick=e=>{
    e.stopPropagation();
    submitReviewModal(b.dataset.submitReview,()=>myTasksToday());
  });
  $$('[data-review]').forEach(b=>b.onclick=e=>{
    e.stopPropagation();
    reviewTaskAction(b.dataset.review,b.dataset.decision,()=>myTasksToday());
  });
}
async function myTasks(){const d=await api('/api/bootstrap');$('#content').innerHTML=`${pageHeader({title:t('My tasks'),description:t('Work assigned to you and your teams.')})}<section class="panel"><div class="panel-head"><h2>Open work</h2><span class="badge"><span class="badge-dot"></span>${countLabel(d.tasks.length,'task')}</span></div><div class="task-list">${d.tasks.length?d.tasks.map(taskRow).join(''):empty('You’re all caught up','There are no open tasks in your queue.')}</div></section>`;bindTaskChecks()}
function bindTaskChecks(){$$('[data-task-done]').forEach(b=>b.onclick=()=>taskDetailModal(b.dataset.taskDone,true))}

async function teams(){const rows=await api('/api/teams');state.teams=rows;$('#content').innerHTML=`${pageHeader({title:translate('Teams'),description:translate('The people and groups that make activities happen.'),actions:isExec()?`<button class="btn primary" id="new-team">${icon('plus')} ${translate('Create a team')}</button>`:''})}<div class="team-grid">${rows.map((tm,i)=>`<article class="team-card" style="--team:${tm.color};--i:${i}"><div class="card-top"><h3><a href="#team/${tm.id}">${esc(tm.name)}</a></h3><span class="team-dot" style="background:${tm.color}"></span></div><p>${esc(tm.description||translate('No description yet.'))}</p><div style="display:flex;gap:28px;margin-top:22px"><div><strong style="display:block;font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:700;letter-spacing:-0.03em;color:#111111">${tm.member_count}</strong><p style="font-size:11px;color:#4A4843;margin:2px 0 0">${translate('members')}</p></div><div><strong style="display:block;font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:700;letter-spacing:-0.03em;color:#111111">${tm.active_count}</strong><p style="font-size:11px;color:#4A4843;margin:2px 0 0">${translate('active')}</p></div></div>${isExec()||tm.can_manage?`<div class="team-actions"><a class="btn small" href="#team/${tm.id}">${translate('View activities')}</a><button class="btn small manage-team" data-team="${tm.id}" data-name="${esc(tm.name)}">${translate('Manage members')}</button><button class="btn small edit-team" data-team="${tm.id}">${translate('Edit color')}</button>${isExec()?`<button class="btn small danger delete-team" data-team="${tm.id}" data-name="${esc(tm.name)}">${translate('Delete')}</button>`:''}</div>`:''}</article>`).join('')}</div>`;$('#new-team')?.addEventListener('click',teamModal);$$('.manage-team').forEach(b=>b.onclick=()=>membersModal(b.dataset.team,b.dataset.name));$$('.edit-team').forEach(b=>b.onclick=()=>editTeamModal(rows.find(tm=>tm.id===Number(b.dataset.team))));$$('.delete-team').forEach(b=>b.onclick=()=>deleteTeam(b.dataset.team,b.dataset.name))}
async function people(){state.teams.length||(state.teams=await api('/api/teams'));const rows=await api('/api/people');$('#content').innerHTML=`${pageHeader({title:'People',description:"Recognize every member's participation.",actions:canManage()?`<button class="btn primary" id="new-account">${icon('plus')} New account</button>`:''})}<div class="toolbar"><label class="search"><input id="people-search" placeholder="Search people…"></label><select id="people-team"><option value="all">All teams</option>${state.teams.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select><select id="people-role"><option value="all">${t('All roles')}</option><option value="admin">${t('admin')}</option><option value="vice_admin">${t('vice_admin')}</option><option value="leader">${t('leader')}</option><option value="vice_leader">${t('vice_leader')}</option><option value="member">${t('member')}</option></select></div><div id="people-grid" class="people-grid"></div>`;const render=()=>{const q=$('#people-search').value.trim().toLowerCase(),team=$('#people-team').value,role=$('#people-role').value,filtered=rows.filter(p=>(!q||`${p.name} ${p.email} ${p.teams||''}`.toLowerCase().includes(q))&&(team==='all'||String(p.team_ids||'').split(',').includes(team))&&(role==='all'||p.role===role));$('#people-grid').innerHTML=filtered.length?filtered.map((p,i)=>`<article class="person" style="--i:${i}"><div style="flex-shrink:0">${avatar(p.name,p.avatar_color)}</div><div style="min-width:0"><h3>${esc(p.name)}</h3><p>${badge(p.role)} <span class="muted">· ${esc(p.teams||t('No team'))}</span></p><p style="margin-top:8px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#111111;font-weight:700">${p.completed_tasks} <span style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:400;color:#4A4843;font-size:11px">${t('completed tasks')}</span></p><a class="text-link" href="mailto:${esc(p.email)}" style="display:block;margin-top:6px">${esc(p.email)}</a>${p.can_manage?`<div class="person-actions"><button class="btn small" data-edit-user="${p.id}">${t('Edit')}</button><button class="btn small danger" data-delete-user="${p.id}">${t('Delete')}</button></div>`:''}</div></article>`).join(''):empty('No people found','Try changing your search or filters.');$$('[data-edit-user]').forEach(b=>b.onclick=()=>editAccountModal(rows.find(p=>p.id===Number(b.dataset.editUser))));$$('[data-delete-user]').forEach(b=>b.onclick=()=>deleteAccount(b.dataset.deleteUser))};$('#people-search').oninput=render;$('#people-team').onchange=render;$('#people-role').onchange=render;$('#new-account')?.addEventListener('click',accountModal);render()}
async function accountsAdmin(){
  const rows=await api('/api/people');
  state.teams.length||(state.teams=await api('/api/teams'));

  $('#content').innerHTML=`
    <header class="page-head">
      <div>
        <h1>${t('Account management')}</h1>
        <p>${t('Create and manage local and SSO accounts.')}</p>
      </div>
    </header>
    <section class="panel">
      <div class="panel-head">
        <h2>${t('All accounts')}</h2>
        <span class="badge" id="account-total-badge"><span class="badge-dot"></span>${rows.length}</span>
      </div>
      <div class="toolbar" style="margin-top:12px;margin-bottom:12px">
        <label class="search">
          <input id="account-search" placeholder="${t('Search accounts…')}">
        </label>
        <select id="account-role-filter">
          <option value="all">${t('All roles')}</option>
          <option value="admin">${t('admin')}</option>
          <option value="vice_admin">${t('vice_admin')}</option>
          <option value="leader">${t('leader')}</option>
          <option value="vice_leader">${t('vice leader')}</option>
          <option value="member">${t('member')}</option>
        </select>
        <select id="account-auth-filter">
          <option value="all">${t('All auth types')}</option>
          <option value="microsoft">${t('SSO account')}</option>
          <option value="local">${t('Local account')}</option>
        </select>
      </div>
      <div id="accounts-table-body" class="accounts-table"></div>
    </section>

    <section class="panel" style="margin-top:20px">
      <div class="panel-head"><h2>Thêm tài khoản</h2></div>
      <div class="auth-toggle">
        <button type="button" class="btn small active" data-auth-toggle="local">Tài khoản cục bộ</button>
        <button type="button" class="btn small" data-auth-toggle="microsoft">Tài khoản SSO</button>
      </div>
      <form id="account-admin-form" class="form">
        <input type="hidden" name="auth_provider" value="local">
        <div class="form-grid">
          <label>Name<input name="name" required></label>
          <label>Email<input type="email" name="email" required></label>
          <label id="account-admin-password-field">Initial password<input type="password" name="password" minlength="8" required></label>
          <label>Role
            <select name="role">
              <option value="member">${t('member')}</option>
              <option value="vice_leader">${t('vice_leader')}</option>
              <option value="leader">${t('leader')}</option>
              <option value="vice_admin">${t('vice_admin')}</option>
              <option value="admin">${t('admin')}</option>
            </select>
          </label>
          <fieldset class="full choice-field">
            <legend>Teams</legend>
            ${choiceCards('team_ids',state.teams)}
          </fieldset>
          <label class="full">Phone<input name="phone"></label>
        </div>
        <button class="btn primary wide">Create account</button>
      </form>
    </section>

    <section class="panel" style="margin-top:20px">
      <div class="panel-head"><h2>Nhập danh sách hàng loạt</h2></div>
      <p class="muted">Mỗi dòng một cặp Tên,email.</p>
      <form id="bulk-import-form" class="form">
        <textarea name="rows" rows="6" placeholder="Nguyễn Văn A,a@example.com" required></textarea>
        <button class="btn primary wide">Nhập danh sách</button>
      </form>
    </section>

    <section class="panel" style="margin-top:20px" id="weight-presets-admin-panel">
      <div class="panel-head">
        <h2>${t('Weight presets')}</h2>
        <button class="btn small primary" id="add-weight-preset-btn">＋ ${t('Add preset')}</button>
      </div>
      <p class="muted">${t('Cấu hình các mức trọng số định sẵn (0 - 10) để thành viên chọn khi tự ghi nhận công việc.')}</p>
      <div id="weight-presets-list" class="preset-table"></div>
    </section>
  `;

  const renderTable=()=>{
    const q=($('#account-search')?.value||'').trim().toLowerCase();
    const roleFilter=$('#account-role-filter')?.value||'all';
    const authFilter=$('#account-auth-filter')?.value||'all';

    const filtered=rows.filter(p=>{
      const matchQ=!q||`${p.name} ${p.email} ${p.phone||''} ${p.teams||''}`.toLowerCase().includes(q);
      const matchRole=roleFilter==='all'||p.role===roleFilter;
      const matchAuth=authFilter==='all'||(p.auth_provider||'local')===authFilter;
      return matchQ&&matchRole&&matchAuth;
    });

    const body=$('#accounts-table-body');
    if(!body)return;
    const badgeCount=$('#account-total-badge');
    if(badgeCount)badgeCount.textContent=filtered.length;

    if(!filtered.length){
      body.innerHTML=empty(t('No people found'),t('Try changing your search or filters.'));
      return;
    }

    body.innerHTML=filtered.map(p=>`
      <div class="accounts-row">
        ${avatar(p.name,p.avatar_color)}
        <div>
          <h3>${esc(p.name)}</h3>
          <p>${esc(p.email)} ${p.phone?`· ${esc(p.phone)}`:''} · <em>${esc(p.teams||t('No team'))}</em></p>
        </div>
        ${badge(p.role)}
        <span class="badge auth-badge ${p.auth_provider==='microsoft'?'sso':'local'}"><span class="badge-dot"></span>
          ${p.auth_provider==='microsoft'?'SSO':'Cục bộ'}
        </span>
        <div class="account-actions">
          <button class="btn small" data-edit-account="${p.id}">${t('Edit')}</button>
          ${Number(p.id)!==Number(state.user.id)?`<button class="btn small danger" data-delete-account="${p.id}">${t('Delete')}</button>`:''}
        </div>
      </div>
    `).join('');

    $$('[data-edit-account]').forEach(b=>{
      b.onclick=()=>{
        const user=rows.find(x=>x.id===Number(b.dataset.editAccount));
        if(user)editAccountModal(user);
      };
    });

    $$('[data-delete-account]').forEach(b=>{
      b.onclick=async()=>{
        await deleteAccount(b.dataset.deleteAccount);
        accountsAdmin();
      };
    });
  };

  $('#account-search').oninput=renderTable;
  $('#account-role-filter').onchange=renderTable;
  $('#account-auth-filter').onchange=renderTable;
  renderTable();

  $$('[data-auth-toggle]').forEach(btn=>btn.onclick=()=>{
    $$('[data-auth-toggle]').forEach(b=>b.classList.toggle('active',b===btn));
    const isLocal=btn.dataset.authToggle==='local';
    $('#account-admin-form input[name="auth_provider"]').value=btn.dataset.authToggle;
    $('#account-admin-password-field').classList.toggle('hidden',!isLocal);
    $('#account-admin-form input[name="password"]').required=isLocal;
  });

  $('#account-admin-form').onsubmit=async e=>{
    e.preventDefault();
    try{
      const f=new FormData(e.target),payload=Object.fromEntries(f);
      payload.team_ids=f.getAll('team_ids');
      await api('/api/users',{method:'POST',body:JSON.stringify(payload)});
      toast('Account created');
      accountsAdmin();
    }catch(err){toast(err.message)}
  };

  $('#bulk-import-form').onsubmit=async e=>{
    e.preventDefault();
    try{
      const text=String(new FormData(e.target).get('rows')||'');
      const parsedRows=text.split('\n').map(l=>l.trim()).filter(Boolean).map(l=>{
        const [name,email]=l.split(',');
        return {name:(name||'').trim(),email:(email||'').trim()};
      });
      if(!parsedRows.length)throw new Error('Danh sách thành viên trống.');
      const result=await api('/api/users/bulk-import',{method:'POST',body:JSON.stringify({rows:parsedRows})});
      toast(`Đã tạo ${result.created}, bỏ qua ${result.skipped}`);
      accountsAdmin();
    }catch(err){toast(err.message)}
  };

  const loadWeightPresets=async()=>{
    try{
      const presets=await api('/api/weight-presets');
      const container=$('#weight-presets-list');
      if(!container)return;
      if(!presets.length){
        container.innerHTML=`<p class="muted">${t('Chưa có preset nào')}. ${t('Nhấn Thêm Preset để tạo mức trọng số mới.')}</p>`;
        return;
      }
      container.innerHTML=presets.map(p=>`
        <div class="preset-row">
          <span class="preset-points-badge">${icon('lightning')} ${p.points}đ</span>
          <div>
            <strong>${esc(p.name)}</strong>
            ${p.description?`<p class="muted" style="margin:2px 0 0;font-size:12px">${esc(p.description)}</p>`:''}
          </div>
          <span class="muted" style="font-size:12px">${t('Thứ tự hiển thị')}: ${p.sort_order}</span>
          <div class="preset-actions" style="display:flex;gap:6px">
            <button class="btn small" data-edit-preset="${p.id}">${t('Edit')}</button>
            <button class="btn small danger" data-delete-preset="${p.id}">${t('Delete')}</button>
          </div>
        </div>
      `).join('');

      $$('[data-edit-preset]').forEach(b=>{
        b.onclick=()=>{
          const preset=presets.find(x=>x.id===Number(b.dataset.editPreset));
          if(preset)weightPresetModal(preset,loadWeightPresets);
        };
      });

      $$('[data-delete-preset]').forEach(b=>{
        b.onclick=async()=>{
          confirmModal(t('Xóa preset'),t('Xóa preset này?'),async()=>{
            try{
              await api(`/api/admin/weight-presets/${b.dataset.deletePreset}`,{method:'DELETE'});
              toast(t('Đã xóa preset'));
              loadWeightPresets();
            }catch(err){toast(err.message)}
          });
        };
      });
    }catch(err){
      const container=$('#weight-presets-list');
      if(container)container.innerHTML=`<p class="form-error">${esc(err.message)}</p>`;
    }
  };

  $('#add-weight-preset-btn')?.addEventListener('click',()=>weightPresetModal(null,loadWeightPresets));
  loadWeightPresets();
}

function weightPresetModal(preset=null,onDone){
  const editing=Boolean(preset);
  openModal(`
    <span class="eyebrow green">${t('Weight preset')}</span>
    <h2>${editing?t('Edit preset'):t('Add preset')}</h2>
    <form id="weight-preset-form" class="form">
      <div class="form-grid">
        <label class="full">${t('Preset name')}
          <input name="name" maxlength="100" value="${esc(preset?.name||'')}" required placeholder="Ví dụ: Trực văn phòng, Trực bàn hỗ trợ, Thiết kế ấn phẩm...">
        </label>
        <label>${t('Preset points')}
          <input name="points" type="number" min="0" max="10" step="0.5" value="${preset?.points??1}" required>
        </label>
        <label>${t('Thứ tự hiển thị')}
          <input name="sort_order" type="number" value="${preset?.sort_order??0}">
        </label>
        <label class="full">${t('Description')}
          <textarea name="description" placeholder="Mô tả công việc áp dụng preset này...">${esc(preset?.description||'')}</textarea>
        </label>
      </div>
      <button class="btn primary wide" type="submit">${editing?t('Save changes'):t('Create')}</button>
    </form>
  `);

  $('#weight-preset-form').onsubmit=async e=>{
    e.preventDefault();
    const f=new FormData(e.target);
    const payload={
      name:String(f.get('name')||'').trim(),
      points:Number(f.get('points')),
      sort_order:Number(f.get('sort_order')||0),
      description:String(f.get('description')||'').trim()||null
    };
    try{
      if(editing){
        await api(`/api/admin/weight-presets/${preset.id}`,{method:'PATCH',body:JSON.stringify(payload)});
        toast(t('Đã cập nhật preset'));
      }else{
        await api('/api/admin/weight-presets',{method:'POST',body:JSON.stringify(payload)});
        toast(t('Đã thêm preset'));
      }
      $('#modal').close();
      if(onDone)onDone();
    }catch(err){toast(err.message)}
  };
}

async function selfLogTaskModal(activityId,activityTeams,onDone){
  const presets=await api('/api/weight-presets').catch(()=>[]);
  const teams=activityTeams?.length?activityTeams:state.teams;
  const userTeamIds=new Set(String(state.user.team_ids||'').split(',').filter(Boolean).map(Number));
  const defaultTeam=teams.find(tm=>userTeamIds.has(Number(tm.team_id||tm.id)))||teams[0];

  openModal(`
    <span class="eyebrow green">${t('Tự ghi nhận việc')}</span>
    <h2>${t('Log work')}</h2>
    <p class="muted">${t('Ghi nhận công việc cá nhân đã hoàn thành vào hoạt động để Tổ trưởng/Ban điều hành nghiệm thu.')}</p>
    <form id="self-log-form" class="form" enctype="multipart/form-data">
      <div class="form-grid">
        <label class="full">${t('Task title')}<input name="title" required placeholder="Ví dụ: Soạn thảo văn bản thông báo, Trực bàn hỗ trợ sinh viên..."></label>
        <label class="full">${t('Responsible team')}
          <select name="team_id" required>
            ${teams.map(tm=>`<option value="${tm.team_id||tm.id}" ${(tm.team_id||tm.id)==(defaultTeam?.team_id||defaultTeam?.id)?'selected':''}>${esc(tm.name)}</option>`).join('')}
          </select>
        </label>
        <div class="full" style="display:flex;flex-direction:column;gap:8px">
          <label>${t('Weight preset')} <small class="muted">(${t('Chọn mức định sẵn hoặc tự nhập điểm bên dưới')})</small>
            <select id="self-log-preset-select">
              <option value="">-- Chọn Preset định mức (0 - 10đ) --</option>
              ${presets.map(p=>`<option value="${p.id}" data-points="${p.points}" data-name="${esc(p.name)}">${p.points}đ - ${esc(p.name)}</option>`).join('')}
            </select>
          </label>
        </div>
        <label>${t('Preset points')}<input type="number" name="weight" id="self-log-weight" min="0" max="10" step="0.5" value="1" required></label>
        <label>${t('Stage')}
          <select name="stage">
            <option value="during">${t('During event')}</option>
            <option value="before">${t('Before event')}</option>
            <option value="after">${t('After event')}</option>
            <option value="general">${t('General')}</option>
          </select>
        </label>
        <label class="full">${t('Evidence link')} <small class="muted">(${t('không bắt buộc')})</small><input type="url" name="link_url" placeholder="https://drive.google.com/... hoặc https://github.com/..."></label>
        <label class="full upload-zone" style="opacity:.5;pointer-events:none" title="Tạm thời tắt tính năng tải tệp lên, vui lòng dùng liên kết minh chứng.">${t('Evidence file')} <small class="muted">(${t('Tạm thời tắt, vui lòng dùng liên kết')})</small><input type="file" name="file" disabled accept=".jpg,.jpeg,.png,.gif,.webp,.heic,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"></label>
        <label class="full">${t('Description')}<textarea name="description" placeholder="Nêu tóm tắt công việc đã thực hiện, kết quả đạt được..."></textarea></label>
      </div>
      <button class="btn primary wide" type="submit">${t('Gửi nghiệm thu')}</button>
    </form>
  `);

  $('#self-log-preset-select')?.addEventListener('change',e=>{
    const opt=e.target.selectedOptions[0];
    if(opt&&opt.dataset.points){
      $('#self-log-weight').value=opt.dataset.points;
      const titleInput=$('input[name="title"]',$('#self-log-form'));
      if(titleInput&&!titleInput.value.trim()){
        titleInput.value=opt.dataset.name;
      }
    }
  });

  $('#self-log-form').onsubmit=async e=>{
    e.preventDefault();
    const button=$('button[type="submit"]',e.target);
    button.disabled=true;
    try{
      const res=await fetch(`/api/activities/${activityId}/log-task`,{
        method:'POST',
        body:new FormData(e.target)
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok)throw new Error(data.error||'Ghi nhận công việc thất bại');
      $('#modal').close();
      toast('Đã ghi nhận công việc thành công. Đang chờ nghiệm thu.');
      if(onDone)onDone();
      else activityDetail(activityId);
    }catch(err){
      toast(err.message);
      button.disabled=false;
    }
  };
}
async function documents(){const initial=await api('/api/documents');$('#content').innerHTML=`${pageHeader({title:'Documents',description:'Shared document links issued by TCKT teams.',actions:`<button class=\"btn primary\" id=\"add-document\">${icon('plus')} Add document</button>`})}<div class="toolbar"><label class="search"><input id="document-search" placeholder="Search documents…"></label><select id="document-year"><option value="all">All years</option>${initial.years.map(x=>`<option value="${x}">${x}</option>`).join('')}</select><select id="document-team"><option value="all">All teams</option>${initial.filterTeams.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select></div><div id="document-grid" class="document-grid"></div>`;const render=rows=>{$('#document-grid').innerHTML=rows.length?rows.map(x=>`<article class="document-card" style="--document-team:${esc(x.team_color)}"><div class="document-meta"><span class="document-year">${x.applicable_year}</span><span><i class="team-dot" style="background:${esc(x.team_color)}"></i>${esc(x.team_name)}</span><span class="badge"><span class="badge-dot"></span>${t(x.visibility==='all_teams'?'All teams':'Issuing team only')}</span></div><h2>${esc(x.name)}</h2><p>${esc(x.description)}</p><div class="document-foot"><small>${t('By')} ${esc(x.creator_name)} · ${date(x.created_at)}</small><div class="document-actions">${x.can_edit?`<button class="btn small" data-edit-document="${x.id}">Edit</button>`:''}<a class="btn small" href="${esc(x.link_url)}" target="_blank" rel="noopener noreferrer">${icon('arrow-square-out')} Open document</a></div></div></article>`).join(''):empty('No documents found','Add the first document or change the filters.')};const load=async()=>{const params=new URLSearchParams({q:$('#document-search').value,year:$('#document-year').value,team_id:$('#document-team').value}),d=await api(`/api/documents?${params}`);render(d.documents);$$('[data-edit-document]').forEach(button=>button.onclick=()=>documentModal(d.issueTeams,d.documents.find(x=>x.id===Number(button.dataset.editDocument))))};let timer;$('#document-search').oninput=()=>{clearTimeout(timer);timer=setTimeout(load,250)};$('#document-year').onchange=load;$('#document-team').onchange=load;$('#add-document').onclick=()=>documentModal(initial.issueTeams);render(initial.documents);$$('[data-edit-document]').forEach(button=>button.onclick=()=>documentModal(initial.issueTeams,initial.documents.find(x=>x.id===Number(button.dataset.editDocument))))}
function documentModal(issueTeams,document=null){const currentYear=new Date().getFullYear(),editing=Boolean(document),visibilityField=`<label>View permission<select name="visibility"><option value="issuing_team" ${document?.visibility==='issuing_team'?'selected':''}>Issuing team members</option><option value="all_teams" ${document?.visibility==='all_teams'?'selected':''}>All teams</option></select></label>`;openModal(`<span class="eyebrow green">DOCUMENT DIRECTORY</span><h2>${editing?'Edit document':'Add a document'}</h2><form id="document-form" class="form"><div class="form-grid"><label class="full">Document name<input name="name" maxlength="200" value="${esc(document?.name||'')}" required></label><label class="full">Document link<input name="link_url" type="url" value="${esc(document?.link_url||'')}" placeholder="https://…" required></label><label>Applicable year<input name="applicable_year" type="number" min="1900" max="2100" value="${document?.applicable_year||currentYear}" required></label><label>Issuing team<select name="issuing_team_id" required><option value="">Select a team</option>${issueTeams.map(x=>`<option value="${x.id}" ${Number(document?.issuing_team_id)===Number(x.id)?'selected':''}>${esc(x.name)}</option>`).join('')}</select></label>${visibilityField}<label class="full">Document description<textarea name="description" maxlength="4000" placeholder="Describe its purpose and scope." required>${esc(document?.description||'')}</textarea></label></div><button class="btn primary wide">${editing?'Save changes':'Save document'}</button></form>`);$('#document-form').onsubmit=async e=>{e.preventDefault();try{await api(editing?`/api/documents/${document.id}`:'/api/documents',{method:editing?'PATCH':'POST',body:JSON.stringify(Object.fromEntries(new FormData(e.target)))});$('#modal').close();toast(editing?'Document updated':'Document added');documents()}catch(err){toast(err.message)}}}
async function reports(){state.teams.length||(state.teams=await api('/api/teams'));const allowed=isExec()?state.teams:state.teams.filter(x=>x.can_manage),today=new Date(),earlier=new Date(today);earlier.setDate(today.getDate()-30);const iso=d=>d.toISOString().slice(0,10);$('#content').innerHTML=`${pageHeader({title:'Reports',description:'Export activity, team task and participation data for a duration.'})}<section class="panel report-panel"><form id="report-form" class="form"><div class="form-grid"><label>Start date<input type="date" name="start" value="${iso(earlier)}" required></label><label>End date<input type="date" name="end" value="${iso(today)}" required></label><label class="full">Team<select name="team_id"><option value="">All available teams</option>${allowed.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select></label></div><p class="muted">The Excel workbook includes an activity summary and member task/participation details for activities overlapping this duration.</p><button class="btn primary" type="submit">${icon('download')} Export Excel report</button></form></section>`;$('#report-form').onsubmit=async e=>{e.preventDefault();const button=$('button[type="submit"]',e.target),params=new URLSearchParams(Object.fromEntries(new FormData(e.target)));params.set('lang',lang);button.disabled=true;try{const res=await fetch(`/api/reports/export?${params}`);if(!res.ok){const data=await res.json().catch(()=>({}));throw new Error(data.error||'Report export failed')}const blob=await res.blob(),url=URL.createObjectURL(blob),a=document.createElement('a'),disposition=res.headers.get('Content-Disposition')||'';a.href=url;a.download=disposition.match(/filename="([^"]+)"/)?.[1]||'tckt-report.xlsx';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Excel report exported')}catch(err){toast(err.message)}finally{button.disabled=false}}}
async function archive(){$('#content').innerHTML=`${pageHeader({title:'Activity archive',description:'Search the organization’s shared memory.'})}<div class="toolbar"><label class="search"><input id="archive-search" placeholder="Search past activities, outcomes, lessons…"></label></div><div id="archive-grid" class="activity-grid"></div>`;const load=async()=>{const rows=await api(`/api/archive?q=${encodeURIComponent($('#archive-search').value)}`);$('#archive-grid').innerHTML=rows.length?rows.map(activityCard).join(''):empty('No archived activities found','Completed activities will become part of the archive.')};let timer;$('#archive-search').oninput=()=>{clearTimeout(timer);timer=setTimeout(load,250)};load()}

async function teamPage(teamId){const d=await api(`/api/teams/${teamId}/overview`),total=Number(d.team.open_tasks)+Number(d.team.done_tasks),progress=pct(d.team.done_tasks,total);$('#content').innerHTML=`<a class="text-link" href="#teams">${icon('arrow-left')} ${translate('Back to teams')}</a><header class="page-head team-page-head"><div><span class="minimal-mono-eyebrow">${translate('TEAM OVERVIEW')}</span><h1>${esc(d.team.name)}</h1><p>${esc(d.team.description||translate('No description yet.'))}</p></div><div class="team-page-actions"><button class="btn manage-team-page">${translate('Manage members')}</button>${isExec()?`<button class="btn danger delete-team-page" data-team="${teamId}" data-name="${esc(d.team.name)}">${translate('Delete team')}</button>`:''}</div></header><section class="stats"><div class="stat"><span>${translate('Members')}</span><strong>${d.team.member_count}</strong><i class="ph-bold ph-users"></i></div><div class="stat"><span>${translate('Open tasks')}</span><strong>${d.team.open_tasks}</strong><i class="ph-bold ph-check-square"></i></div><div class="stat alert"><span>${translate('Overdue')}</span><strong>${d.team.overdue_tasks}</strong><i class="ph-bold ph-warning"></i></div><div class="stat"><span>${translate('Progress')}</span><strong>${progress}%</strong><i class="ph-bold ph-trend-up"></i></div></section><div class="grid-2"><div><section class="panel"><div class="panel-head"><h2>${translate('Current tasks & progress')}</h2><span class="badge"><span class="badge-dot"></span>${d.tasks.filter(x=>x.status!=='done').length} tasks</span></div><div class="overview-tasks">${d.tasks.filter(x=>x.status!=='done').map(x=>`<button class="overview-task" data-team-task="${x.id}"><span><strong>${esc(x.title)}</strong><small>${esc(x.activity_title)} · ${esc(x.assignee_name||'Unassigned')}</small></span>${badge(x.status)}<span class="due ${isOverdue(x.deadline)?'late':''}">${date(x.deadline)}</span></button>`).join('')||`<p class="muted">${translate('No current tasks.')}</p>`}</div></section><section class="panel" style="margin-top:20px"><div class="panel-head"><h2>${translate('Team activities')}</h2><span class="badge"><span class="badge-dot"></span>${d.activities.length}</span></div>${d.activities.map(a=>`<a class="overview-activity" href="#activity/${a.id}"><span><strong>${esc(a.title)}</strong><small>${a.done_count}/${a.task_count} tasks · ${date(a.deadline)}</small></span>${badge(a.status)}<div class="progress"><span style="width:${pct(a.done_count,a.task_count)}%"></span></div></a>`).join('')||`<p class="muted">${translate('No activities.')}</p>`}</section></div><aside class="panel"><div class="panel-head"><h2>${translate('Team members')}</h2><span class="badge"><span class="badge-dot"></span>${d.members.length}</span></div><div class="team-member-list">${d.members.map(m=>`<div class="person" style="border:0;padding:10px 0">${avatar(m.name,m.avatar_color)}<div><h3>${esc(m.name)} ${m.is_lead?`<span class="badge leader"><span class="badge-dot"></span>${translate('Tổ trưởng')}</span>`:m.is_vice_lead?`<span class="badge vice_leader"><span class="badge-dot"></span>${translate('Tổ phó')}</span>`:''}</h3><p style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#4A4843;margin-top:3px">${m.open_tasks} open · ${m.done_tasks} done</p><a class="text-link" href="mailto:${esc(m.email)}">${esc(m.email)}</a></div></div>`).join('')||`<p class="muted">${translate('No members.')}</p>`}</div></aside></div>`;$('.manage-team-page').onclick=()=>membersModal(teamId,d.team.name);$('.delete-team-page')?.addEventListener('click',e=>deleteTeam(e.currentTarget.dataset.team,e.currentTarget.dataset.name));$$('[data-team-task]').forEach(b=>b.onclick=()=>taskDetailModal(b.dataset.teamTask))}
const activityModalBase=activityModal;
activityModal=function(){activityModalBase();const description=$('#activity-form textarea[name="description"]')?.closest('label');description?.insertAdjacentHTML('beforebegin','<label class="full">Main activity proposal document<input name="proposal_document_url" type="url" maxlength="1000" placeholder="Main proposal document link (optional)"></label><label class="full"><span><input name="is_public" type="checkbox"> Show this activity on the public landing page</span></label><label class="full">Public image URL (optional)<input name="public_image_url" type="url" maxlength="1000" placeholder="https://example.com/activity.jpg"></label>')};
const editActivityModalBase=editActivityModal;
editActivityModal=function(activityId,activity,activityTeams){editActivityModalBase(activityId,activity,activityTeams);const description=$('#edit-activity-form textarea[name="description"]')?.closest('label');description?.insertAdjacentHTML('beforebegin',`<label class="full">Main activity proposal document<input name="proposal_document_url" type="url" maxlength="1000" value="${esc(activity.proposal_document_url||'')}" placeholder="Main proposal document link (optional)"></label><label class="full"><span><input name="is_public" type="checkbox" ${activity.is_public?'checked':''}> Show this activity on the public landing page</span></label><label class="full">Public image URL (optional)<input name="public_image_url" type="url" maxlength="1000" value="${esc(activity.public_image_url||'')}" placeholder="https://example.com/activity.jpg"></label>`)};
function bindNew(){$$('[data-new]').forEach(b=>b.onclick=activityModal)}
function choiceCards(name,items,selected=[]){return `<div class="choice-grid">${items.map(item=>`<label class="choice-card"><input type="checkbox" name="${name}" value="${item.id}" ${selected.map(Number).includes(Number(item.id))?'checked':''}><span class="choice-check"><i class="ph-bold ph-check" aria-hidden="true"></i></span><span><strong>${esc(item.name)}</strong>${item.subtitle?`<small>${esc(item.subtitle)}</small>`:''}</span></label>`).join('')}</div>`}
function activityModal(){const allowed=isExec()?state.teams:state.teams.filter(tm=>tm.can_manage);openModal(`<span class="eyebrow green">NEW PROPOSAL</span><h2>Propose an activity</h2><p class="muted">Select a coordinating team and every supporting team involved.</p><form id="activity-form" class="form"><div class="form-grid"><label class="full">Title<input name="title" required placeholder="e.g. Engineering Open Day"></label><label>Activity type<select name="type"><option value="event">Team-proposed event</option><option value="assigned">Leadership-assigned</option></select></label><label>Coordinating team<select name="team_id" required><option value="">Select a team</option>${allowed.map(tm=>`<option value="${tm.id}">${esc(tm.name)}</option>`).join('')}</select></label><fieldset class="full choice-field"><legend>Involved teams</legend>${choiceCards('team_ids',allowed)}</fieldset><label class="full">Trưởng Ban Tổ Chức (không bắt buộc)<select name="event_lead_id" id="activity-event-lead"><option value="">Không chọn (phân công theo Ban chủ trì)</option></select></label><label>Start date<input type="date" name="start_date"></label><label>Overall deadline<input type="date" name="deadline" required></label><label>Priority<select name="priority"><option value="medium">medium</option><option value="high">high</option><option value="urgent">urgent</option><option value="low">low</option></select></label><label>Location<input name="location" placeholder="Optional"></label><label class="full">Requested by<input name="requested_by" placeholder="For leadership-assigned work"></label><label class="full">Description<textarea name="description" required placeholder="What is the activity trying to achieve?"></textarea></label></div><button class="btn primary wide">Create proposal</button></form>`);api('/api/people').then(people=>{const sel=$('#activity-event-lead');if(sel)sel.innerHTML='<option value="">Không chọn (phân công theo Ban chủ trì)</option>'+people.map(p=>`<option value="${p.id}">${esc(p.name)} (${esc(p.role)})</option>`).join('')}).catch(()=>{});const primary=$('[name="team_id"]');primary.onchange=()=>{const box=$(`[name="team_ids"][value="${primary.value}"]`);if(box)box.checked=true};$('#activity-form').onsubmit=async e=>{e.preventDefault();try{const f=new FormData(e.target),payload=Object.fromEntries(f);payload.team_ids=f.getAll('team_ids');payload.event_lead_id=payload.event_lead_id||null;if(!payload.team_ids.length)throw new Error('Select at least one involved team.');if(payload.team_id&&!payload.team_ids.includes(payload.team_id))payload.team_ids.push(payload.team_id);const x=await api('/api/activities',{method:'POST',body:JSON.stringify(payload)});$('#modal').close();toast('Activity proposed');location.hash=`activity/${x.id}`}catch(err){toast(err.message)}}}
function taskModal(activityId,activityTeams){const allowed=isExec()?activityTeams:activityTeams.filter(tm=>state.teams.some(x=>x.id===tm.team_id&&x.can_manage));openModal(`<span class="eyebrow green">WORK PLAN</span><h2>Add a task</h2><p class="muted">Each sub-item has its own schedule, responsible team, and assignees.</p><form id="task-form" class="form"><div class="form-grid"><label class="full">Task title<input name="title" required></label><label>Stage<select name="stage"><option value="before">Before event</option><option value="during">During event</option><option value="after">After event</option><option value="general">General</option></select></label><label>Responsible team<select name="team_id" id="task-team" required>${allowed.map(tm=>`<option value="${tm.team_id}">${esc(tm.name)}</option>`).join('')}</select></label><label>Start date<input type="date" name="start_date"></label><label>Separate deadline<input type="date" name="deadline" required></label><label>Priority<select name="priority"><option value="medium">medium</option><option value="high">high</option><option value="urgent">urgent</option><option value="low">low</option></select></label><label class="full">Primary assignee<select name="primary_assignee_id" id="task-primary" required><option value="">Loading team members…</option></select></label><fieldset class="full choice-field"><legend>Co-assignees (optional)</legend><div id="task-co-assignees"><p class="muted">Loading team members…</p></div></fieldset><label class="full">Deliverable<input name="deliverable" placeholder="What should be produced?"></label><label class="full">Description<textarea name="description"></textarea></label></div><button class="btn primary wide">Add task</button></form>`);let request=0,members=[];const renderCoAssignees=()=>{const primaryId=$('#task-primary').value,others=members.filter(m=>String(m.id)!==String(primaryId));$('#task-co-assignees').innerHTML=others.length?choiceCards('co_assignee_ids',others):'<p class="muted">No other active members belong to this team.</p>';translateDOM($('#task-co-assignees'))};const fill=async()=>{const current=++request,teamId=$('#task-team').value;$('#task-primary').innerHTML='<option value="">Loading team members…</option>';$('#task-co-assignees').innerHTML='<p class="muted">Loading team members…</p>';try{const d=await api(`/api/teams/${teamId}/members`);if(current!==request)return;members=d.members.map(p=>({id:p.id,name:p.name,subtitle:p.is_lead?'leader':p.is_vice_lead?'vice leader':p.role}));$('#task-primary').innerHTML=members.length?`<option value="">${t('Select a person')}</option>${members.map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join('')}`:`<option value="">${t('No active members belong to this team.')}</option>`;renderCoAssignees();translateDOM($('#task-primary').closest('label'))}catch(err){if(current===request)$('#task-co-assignees').innerHTML=`<p class="form-error">${esc(err.message)}</p>`}};$('#task-team').onchange=fill;fill();$('#task-form').addEventListener('change',e=>{if(e.target.id==='task-primary')renderCoAssignees()});$('#task-form').onsubmit=async e=>{e.preventDefault();try{const f=new FormData(e.target),payload=Object.fromEntries(f);payload.co_assignee_ids=f.getAll('co_assignee_ids');if(!payload.primary_assignee_id)throw new Error('Select a primary assignee.');await api(`/api/activities/${activityId}/tasks`,{method:'POST',body:JSON.stringify(payload)});$('#modal').close();toast('Task added');activityDetail(activityId)}catch(err){toast(err.message)}}}
function teamModal(){openModal(`<span class="eyebrow green">ORGANIZATION</span><h2>Create a team</h2><form id="team-form" class="form"><label>Team name<input name="name" required></label><label>Description<textarea name="description"></textarea></label><label>Team color<input name="color" type="color" value="#1E3A8A"></label><button class="btn primary wide">Create team</button></form>`);$('#team-form').onsubmit=async e=>{e.preventDefault();try{await api('/api/teams',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(e.target)))});$('#modal').close();toast('Team created');teams()}catch(err){toast(err.message)}}}
function editTeamModal(team){openModal(`<span class="eyebrow green">TEAM SIGNATURE</span><h2>Edit ${esc(team.name)}</h2><form id="edit-team-form" class="form">${isExec()?`<label>Team name<input name="name" value="${esc(team.name)}" required></label><label>Description<textarea name="description">${esc(team.description||'')}</textarea></label>`:`<input type="hidden" name="name" value="${esc(team.name)}">`}<label>Team color<input name="color" type="color" value="${esc(team.color)}" required></label><button class="btn primary wide">Save team</button></form>`);$('#edit-team-form').onsubmit=async e=>{e.preventDefault();try{await api(`/api/teams/${team.id}`,{method:'PATCH',body:JSON.stringify(Object.fromEntries(new FormData(e.target)))});$('#modal').close();toast('Team updated');teams()}catch(err){toast(err.message)}}}
function participantModal(activityId,people,participants){const memberships=person=>(Array.isArray(person.team_ids)?person.team_ids:String(person.team_ids||'').split(',')).map(String).filter(Boolean),teamLabel=person=>(Array.isArray(person.team_names)?person.team_names.join(', '):person.teams)||t('No team'),joined=new Set(participants.map(x=>Number(x.user_id))),eligible=people.filter(x=>!joined.has(Number(x.id))),teamIds=new Set(eligible.flatMap(memberships)),selected=new Set;openModal(`<span class="eyebrow green">ACTIVITY PARTICIPANTS</span><h2>Add members</h2><p class="muted">Select active members to confirm their participation in this activity.</p>${eligible.length?`<form id="participant-form" class="form"><label>Team filter<select id="participant-team"><option value="all">All teams</option>${state.teams.filter(x=>teamIds.has(String(x.id))).map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select></label><fieldset class="choice-field"><legend>Members</legend><div id="participant-choices"></div></fieldset><label>Responsibility<input name="responsibility" maxlength="255" placeholder="Activity participant"></label><button class="btn primary wide">Add selected members</button></form>`:'<p class="muted">All eligible members have already joined this activity.</p>'}`);const render=()=>{const team=$('#participant-team').value,visible=eligible.filter(x=>team==='all'||memberships(x).includes(team)).map(x=>({...x,subtitle:teamLabel(x)}));$('#participant-choices').innerHTML=visible.length?choiceCards('user_ids',visible,[...selected]):'<p class="muted">No members match this team.</p>';$$('input[name="user_ids"]',$('#participant-choices')).forEach(x=>x.onchange=()=>x.checked?selected.add(x.value):selected.delete(x.value))};$('#participant-team')?.addEventListener('change',render);if($('#participant-team'))render();$('#participant-form')?.addEventListener('submit',async e=>{e.preventDefault();try{const payload={user_ids:[...selected],responsibility:new FormData(e.target).get('responsibility')};if(!payload.user_ids.length)throw new Error('Select at least one member.');await api(`/api/activities/${activityId}/participants`,{method:'POST',body:JSON.stringify(payload)});$('#modal').close();toast('Members added to activity');activityDetail(activityId)}catch(err){toast(err.message)}})}
function editActivityModal(activityId,a,activityTeams){const selected=activityTeams.map(x=>Number(x.team_id)),day=v=>v?String(v).slice(0,10):'';openModal(`<span class="eyebrow green">ACTIVITY MANAGEMENT</span><h2>Edit activity</h2><form id="edit-activity-form" class="form"><div class="form-grid"><label class="full">Title<input name="title" value="${esc(a.title)}" required></label><label>Activity type<select name="type"><option value="event" ${a.type==='event'?'selected':''}>Team event</option><option value="assigned" ${a.type==='assigned'?'selected':''}>Leadership assigned</option></select></label><label>Status<select name="status"><option value="proposed" ${a.status==='proposed'?'selected':''}>proposed</option><option value="approved" ${a.status==='approved'?'selected':''}>approved</option><option value="active" ${a.status==='active'?'selected':''}>active</option><option value="completed" ${a.status==='completed'?'selected':''}>completed</option><option value="cancelled" ${a.status==='cancelled'?'selected':''}>cancelled</option></select></label><label>Coordinating team<select name="team_id" required>${state.teams.map(tm=>`<option value="${tm.id}" ${Number(a.team_id)===Number(tm.id)?'selected':''}>${esc(tm.name)}</option>`).join('')}</select></label><label class="full">Trưởng Ban Tổ Chức (không bắt buộc)<select name="event_lead_id" id="edit-activity-event-lead"><option value="">Không chọn (phân công theo Ban chủ trì)</option></select></label><label>Priority<select name="priority"><option value="low" ${a.priority==='low'?'selected':''}>low</option><option value="medium" ${a.priority==='medium'?'selected':''}>medium</option><option value="high" ${a.priority==='high'?'selected':''}>high</option><option value="urgent" ${a.priority==='urgent'?'selected':''}>urgent</option></select></label><fieldset class="full choice-field"><legend>Involved teams</legend>${choiceCards('team_ids',state.teams,selected)}</fieldset><label>Start date<input type="date" name="start_date" value="${day(a.start_date)}"></label><label>Deadline<input type="date" name="deadline" value="${day(a.deadline)}" required></label><label>Location<input name="location" value="${esc(a.location||'')}"></label><label>Requested by<input name="requested_by" value="${esc(a.requested_by||'')}"></label><label class="full">Description<textarea name="description" required>${esc(a.description)}</textarea></label><label class="full">Result summary<textarea name="result_summary">${esc(a.result_summary||'')}</textarea></label></div><button class="btn primary wide">Save activity</button></form>`);api('/api/people').then(people=>{const sel=$('#edit-activity-event-lead');if(sel)sel.innerHTML='<option value="">Không chọn (phân công theo Ban chủ trì)</option>'+people.map(p=>`<option value="${p.id}" ${Number(a.event_lead_id)===Number(p.id)?'selected':''}>${esc(p.name)} (${esc(p.role)})</option>`).join('')}).catch(()=>{});$('#edit-activity-form').onsubmit=async e=>{e.preventDefault();try{const f=new FormData(e.target),payload=Object.fromEntries(f);payload.team_ids=f.getAll('team_ids');payload.event_lead_id=payload.event_lead_id||null;if(!payload.team_ids.includes(String(payload.team_id)))throw new Error('The coordinating team must also be an involved team.');if(payload.status==='cancelled'&&a.status!=='cancelled'&&!confirm(t('Hoạt động này sẽ bị xóa vĩnh viễn cùng toàn bộ công việc, cập nhật và tệp đính kèm liên quan. Không thể hoàn tác. Tiếp tục?')))return;const result=await api(`/api/activities/${activityId}`,{method:'PATCH',body:JSON.stringify(payload)});$('#modal').close();if(result.deleted){toast(t('Đã xóa hoạt động'));location.hash='activities';return}toast('Activity updated');activityDetail(activityId)}catch(err){toast(err.message)}}}
function refreshAccountViews(){
  if(location.hash.startsWith('#accounts')){
    accountsAdmin();
  }else if(location.hash.startsWith('#people')){
    people();
  }else{
    route();
  }
}

async function deleteTeam(teamId,teamName){
  confirmModal(`${translate('Xóa Tổ')} "${teamName}"?`,`${translate('Bạn có chắc chắn muốn xóa')} "${teamName}"? ${translate('Các dữ liệu lịch sử liên quan sẽ được lưu trữ an toàn.')}`,async()=>{
    try{
      const res=await api(`/api/teams/${teamId}`,{method:'DELETE'});
      toast(res.deactivated?translate('Đã lưu trữ Tổ'):translate('Đã xóa Tổ thành công'));
      state.teams=await api('/api/teams');
      if(location.hash.startsWith('#team/')){location.hash='teams'}else{teams()}
    }catch(err){toast(err.message)}
  });
}

function accountModal(){const teams=isExec()?state.teams:state.teams.filter(x=>x.can_manage);openModal(`<span class="eyebrow green">${translate('USER MANAGEMENT')}</span><h2>${translate('Create an account')}</h2><p class="muted">${translate('Members must belong to at least one team.')}</p><form id="account-form" class="form"><div class="form-grid"><label>${translate('Name')}<input name="name" required></label><label>${translate('Email')}<input type="email" name="email" required></label><label>${translate('Initial password')}<input type="password" name="password" minlength="8" required></label>${isExec()?`<label>${translate('Role')}<select name="role"><option value="member">${translate('member')}</option><option value="vice_leader">${translate('vice_leader')}</option><option value="leader">${translate('leader')}</option><option value="vice_admin">${translate('vice_admin')}</option><option value="admin">${translate('admin')}</option></select></label>`:'<input type="hidden" name="role" value="member">'}<fieldset class="full choice-field"><legend>${translate('Teams')}</legend>${choiceCards('team_ids',teams)}</fieldset><label class="full">${translate('Phone')}<input name="phone"></label></div><button class="btn primary wide">${translate('Create account')}</button></form>`);$('#account-form').onsubmit=async e=>{e.preventDefault();try{const f=new FormData(e.target),payload=Object.fromEntries(f);payload.team_ids=f.getAll('team_ids');await api('/api/users',{method:'POST',body:JSON.stringify(payload)});$('#modal').close();toast(translate('Account created'));refreshAccountViews()}catch(err){toast(err.message)}}}
function selfAccountModal(){const u=state.user;openModal(`<span class="eyebrow green">${translate('ACCOUNT SETTINGS')}</span><h2>${esc(u.name)}</h2><p class="muted">${translate('Your account name and role can only be changed by an authorized manager.')}</p><form id="self-account-form" class="form"><div class="form-grid"><label>${translate('Email')}<input type="email" name="email" value="${esc(u.email)}" required></label><label>${translate('Phone')}<input name="phone" value="${esc(u.phone||'')}"></label><label>${translate('Avatar color')}<input type="color" name="avatar_color" value="${esc(u.avatar_color)}" required></label><label>${translate('New password')}<input type="password" name="password" minlength="8" placeholder="${translate('Leave blank to keep current')}"></label></div><button class="btn primary wide">${translate('Save account')}</button></form>`);$('#self-account-form').onsubmit=async e=>{e.preventDefault();try{const payload=Object.fromEntries(new FormData(e.target));const d=await api('/api/account',{method:'PATCH',body:JSON.stringify(payload)});state.user=d.user;$('#modal').close();toast(translate('Account updated'));location.reload()}catch(err){toast(err.message)}}}
function editAccountModal(user){const allowed=isExec()?state.teams:state.teams.filter(x=>x.can_manage),selected=String(user.team_ids||'').split(',').map(Number);openModal(`<span class="eyebrow green">${translate('USER MANAGEMENT')}</span><h2>${translate('Edit account')}</h2><form id="edit-account-form" class="form"><div class="form-grid"><label>${translate('Name')}<input name="name" value="${esc(user.name)}" required></label><label>${translate('Email')}<input type="email" name="email" value="${esc(user.email)}" required></label><label>${translate('Phone')}<input name="phone" value="${esc(user.phone||'')}"></label><label>${translate('Avatar color')}<input type="color" name="avatar_color" value="${esc(user.avatar_color)}"></label>${isExec()?`<label>${translate('Role')}<select name="role"><option value="member" ${user.role==='member'?'selected':''}>${translate('member')}</option><option value="leader" ${user.role==='leader'?'selected':''}>${translate('leader')}</option><option value="vice_leader" ${user.role==='vice_leader'?'selected':''}>${translate('vice_leader')}</option><option value="vice_admin" ${user.role==='vice_admin'?'selected':''}>${translate('vice_admin')}</option><option value="admin" ${user.role==='admin'?'selected':''}>${translate('admin')}</option></select></label>`:'<input type="hidden" name="role" value="member">'}<label>${translate('New password')}<input type="password" name="password" minlength="8" placeholder="${translate('Leave blank to keep current')}"></label><fieldset class="full choice-field"><legend>${translate('Teams')}</legend>${choiceCards('team_ids',allowed.map(x=>({...x,subtitle:selected.includes(x.id)?translate('Current team'):''})),selected)}</fieldset></div><button class="btn primary wide">${translate('Save changes')}</button></form>`);$('#edit-account-form').onsubmit=async e=>{e.preventDefault();try{const f=new FormData(e.target),payload=Object.fromEntries(f);payload.team_ids=f.getAll('team_ids');await api(`/api/users/${user.id}`,{method:'PATCH',body:JSON.stringify(payload)});$('#modal').close();toast(translate('Account updated'));refreshAccountViews()}catch(err){toast(err.message)}}}
async function deleteAccount(id){confirmModal(translate('Delete this account?'),translate('Delete this account? Accounts referenced by retained history will be deactivated instead.'),async()=>{try{const d=await api(`/api/users/${id}`,{method:'DELETE'});toast(d.removed_from_managed_teams?translate('Account removed from your teams'):d.deactivated?translate('Account deactivated to preserve history'):translate('Account deleted'));refreshAccountViews()}catch(err){toast(err.message)}})}
async function membersModal(teamId,teamName){const d=await api(`/api/teams/${teamId}/members`);openModal(`<span class="eyebrow green">${translate('THÀNH VIÊN TỔ')}</span><h2>${translate('Tổ')} ${esc(teamName)}</h2><p class="muted">${countLabel(d.members.length,translate('thành viên'))} · ${translate('Quản lý danh sách thành viên và phân quyền Tổ trưởng / Tổ phó.')}</p><div class="team-member-mgmt-list">${d.members.map(m=>{const isSelf=Number(m.id)===Number(state.user?.id);const roleLabel=m.is_lead?translate('Tổ trưởng'):m.is_vice_lead?translate('Tổ phó'):translate('Thành viên');const canEditRole=isExec()&&m.role!=='admin'&&m.role!=='vice_admin';const canRemove=isExec()||(isLeadership(state.user)&&!m.is_lead&&!m.is_vice_lead&&m.role==='member');return `<div class="team-member-mgmt-row">${avatar(m.name,m.avatar_color)}<div class="member-mgmt-info"><div class="member-mgmt-name-row"><strong>${esc(m.name)}</strong>${m.is_lead?`<span class="badge leader"><span class="badge-dot"></span>${translate('Tổ trưởng')}</span>`:m.is_vice_lead?`<span class="badge vice_leader"><span class="badge-dot"></span>${translate('Tổ phó')}</span>`:`<span class="badge member"><span class="badge-dot"></span>${translate('Thành viên')}</span>`}${m.role==='admin'||m.role==='vice_admin'?`<span class="badge ${m.role}"><span class="badge-dot"></span>${translate(m.role)}</span>`:''}</div><small class="member-mgmt-email">${esc(m.email)}</small></div><div class="member-mgmt-actions">${canEditRole?`<select class="member-role-select" data-member-role="${m.id}" title="${translate('Đổi vai trò trong Tổ')}"><option value="member" ${!m.is_lead&&!m.is_vice_lead?'selected':''}>${translate('Thành viên')}</option><option value="vice_leader" ${m.is_vice_lead?'selected':''}>${translate('Tổ phó')}</option><option value="leader" ${m.is_lead?'selected':''}>${translate('Tổ trưởng')}</option></select>`:`<span class="member-role-static">${roleLabel}</span>`}${canRemove&&!isSelf?`<button type="button" class="btn small danger remove-member-btn" data-team="${teamId}" data-user="${m.id}" data-name="${esc(m.name)}" title="${translate('Xóa khỏi Tổ')}">${translate('Xóa')}</button>`:''}</div></div>`}).join('')||`<p class="muted">${translate('Chưa có thành viên nào trong Tổ này.')}</p>`}</div>${d.available.length?`<div class="team-add-member-section"><h3>${translate('Thêm thành viên vào Tổ')}</h3><form id="member-form" class="form team-add-member-form"><div class="form-grid"><label class="full">${translate('Chọn tài khoản')}<select name="user_id" required><option value="">-- ${translate('Chọn một người')} --</option>${d.available.map(u=>`<option value="${u.id}">${esc(u.name)} (${esc(u.email)}) · ${translate(u.role)}</option>`).join('')}</select></label>${isExec()?`<label class="full">${translate('Vai trò trong Tổ')}<select name="team_role"><option value="member">${translate('Thành viên')}</option><option value="vice_leader">${translate('Tổ phó')}</option><option value="leader">${translate('Tổ trưởng')}</option></select></label>`:''}</div><button class="btn primary wide">${icon('plus')} ${translate('Thêm vào Tổ')}</button></form></div>`:`<div class="team-add-member-section empty"><p class="muted">${icon('check')} ${translate('Tất cả tài khoản đang hoạt động đã thuộc Tổ này.')}</p></div>`}`);$('#member-form')?.addEventListener('submit',async e=>{e.preventDefault();try{const f=new FormData(e.target);await api(`/api/teams/${teamId}/members`,{method:'POST',body:JSON.stringify({user_id:f.get('user_id'),team_role:f.get('team_role')||'member'})});toast(translate('Đã thêm thành viên vào Tổ'));membersModal(teamId,teamName);if(location.hash===`#team/${teamId}`)teamPage(teamId)}catch(err){toast(err.message)}});$$('[data-member-role]').forEach(select=>select.onchange=async()=>{try{await api(`/api/teams/${teamId}/members/${select.dataset.memberRole}`,{method:'PATCH',body:JSON.stringify({team_role:select.value})});toast(translate('Đã cập nhật vai trò'));membersModal(teamId,teamName);if(location.hash===`#team/${teamId}`)teamPage(teamId)}catch(err){toast(err.message)}});$$('.remove-member-btn').forEach(btn=>{btn.onclick=()=>{const uName=btn.dataset.name;confirmModal(translate('Xóa khỏi Tổ'),`${translate('Xác nhận xóa')} "${uName}" ${translate('khỏi Tổ')} "${teamName}"?`,async()=>{try{await api(`/api/teams/${teamId}/members/${btn.dataset.user}`,{method:'DELETE'});toast(translate('Đã xóa thành viên khỏi Tổ'));membersModal(teamId,teamName);if(location.hash===`#team/${teamId}`)teamPage(teamId)}catch(err){toast(err.message)}})}})}
async function teamOverviewModal(teamId){try{const d=await api(`/api/teams/${teamId}/overview`),total=Number(d.team.open_tasks)+Number(d.team.done_tasks),progress=pct(d.team.done_tasks,total);openModal(`<span class="eyebrow green">TEAM OVERVIEW</span><h2>${esc(d.team.name)}</h2><p class="muted">${esc(d.team.description||'No description yet.')}</p><div class="stats team-stats"><div class="stat"><span>Members</span><strong>${d.team.member_count}</strong></div><div class="stat"><span>Open tasks</span><strong>${d.team.open_tasks}</strong></div><div class="stat alert"><span>Overdue</span><strong>${d.team.overdue_tasks}</strong></div><div class="stat"><span>Progress</span><strong>${progress}%</strong></div></div><section class="modal-section"><h2>Team members</h2><div class="overview-members">${d.members.map(m=>`<div class="person">${avatar(m.name,m.avatar_color)}<div><h3>${esc(m.name)} ${m.is_lead?badge('leader'):m.is_vice_lead?badge('vice leader'):''}</h3><p>${m.open_tasks} open · ${m.done_tasks} completed</p></div></div>`).join('')||'<p class="muted">No members.</p>'}</div></section><section class="modal-section"><h2>Current tasks & progress</h2><div class="overview-tasks">${d.tasks.filter(x=>x.status!=='done').map(x=>`<button class="overview-task" data-team-task="${x.id}"><span><strong>${esc(x.title)}</strong><small>${esc(x.activity_title)} · ${esc(x.assignee_name||'Unassigned')}</small></span>${badge(x.status)}<span class="due ${isOverdue(x.deadline)?'late':''}">${date(x.deadline)}</span></button>`).join('')||'<p class="muted">No current tasks.</p>'}</div></section><section class="modal-section"><h2>Activities</h2>${d.activities.map(a=>`<a class="overview-activity" href="#activity/${a.id}" data-close-overview><span><strong>${esc(a.title)}</strong><small>${a.done_count}/${a.task_count} tasks · ${date(a.deadline)}</small></span>${badge(a.status)}<div class="progress"><span style="width:${pct(a.done_count,a.task_count)}%"></span></div></a>`).join('')||'<p class="muted">No activities.</p>'}</section>`);$$('[data-team-task]').forEach(b=>b.onclick=()=>taskDetailModal(b.dataset.teamTask));$$('[data-close-overview]').forEach(a=>a.onclick=()=>$('#modal').close())}catch(err){toast(err.message)}}
function attachmentModal(taskId,taskTitle,used){const remaining=Math.max(0,50*1024*1024-Number(used));openModal(`<span class="eyebrow green">TASK MATERIALS</span><h2>${esc(taskTitle)}</h2><p class="muted">Add a relevant link, document, or photo as clarification, evidence, an issue, or a deliverable.</p><div class="quota"><span style="width:${Math.min(100,Number(used)/(50*1024*1024)*100)}%"></span></div><p class="quota-label">${fileSize(used)} used · ${fileSize(remaining)} remaining</p><form id="attachment-form" class="form" enctype="multipart/form-data"><div class="form-grid"><label>Purpose<select name="kind"><option value="clarification">Clarification</option><option value="evidence">Evidence</option><option value="issue">Issue</option><option value="deliverable">Deliverable</option></select></label><label>Display label<input name="label" maxlength="180" placeholder="Short description"></label><label class="full">Relevant link<input type="url" name="link_url" placeholder="https://…"></label><div class="or full"><span>or upload a file</span></div><label class="full upload-zone" style="opacity:.5;pointer-events:none" title="Tạm thời tắt tính năng tải tệp lên, vui lòng dùng liên kết.">Document or photo (tạm thời tắt, vui lòng dùng liên kết)<input type="file" name="file" disabled accept=".jpg,.jpeg,.png,.gif,.webp,.heic,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"><small>Maximum 50 MB shared across this task. Supported: images, PDF, Office, text, CSV, and ZIP.</small></label></div><button class="btn primary wide">Add to task</button></form>`);$('#attachment-form').onsubmit=async e=>{e.preventDefault();const button=$('button[type="submit"],button.btn.primary',e.target);button.disabled=true;try{const res=await fetch(`/api/tasks/${taskId}/attachments`,{method:'POST',body:new FormData(e.target)}),data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||'Upload failed');$('#modal').close();toast('Task material added');route()}catch(err){toast(err.message);button.disabled=false}}}
async function taskDetailModal(taskId,completeFocus=false){try{const d=await api(`/api/tasks/${taskId}`),tk=d.task,used=d.attachments.reduce((s,x)=>s+Number(x.size_bytes||0),0);const assigneeIds=String(tk.assignee_ids||'').split(',').filter(Boolean).map(Number),isAssignee=assigneeIds.includes(state.user.id),manages=canManageTaskTeam(tk.team_id),isReviewer=manages,ackAt=isAssignee?(d.myAcknowledgedAt||(d.assignees?.find(a=>a.user_id===state.user.id)?.acknowledged_at)):null;const canCancelSelfLog=Boolean(tk.is_self_logged&&isAssignee&&!['done','cancelled'].includes(tk.status));const assigneesDisplay=d.assignees?.length?d.assignees.map(a=>`${esc(a.name)}${a.is_primary?' (chính)':''}${a.acknowledged_at?' '+icon('check'):' '+icon('clock')}`).join(', '):esc(tk.assignee_name||'Unassigned');openModal(`<span class="eyebrow green">TASK DETAIL</span><div class="task-detail-title"><div><h2>${esc(tk.title)}</h2><p class="muted">${esc(tk.activity_title)} · ${esc(tk.team_name)}</p></div>${badge(tk.status)}${tk.is_self_logged?` <span class="badge self-logged"><span class="badge-dot"></span>${translate('Tự ghi nhận')}</span>`:''}${tk.weight!==undefined&&tk.weight!==null?` <span class="badge weight"><span class="badge-dot"></span>${icon('lightning')} ${tk.weight}đ</span>`:''}</div>${tk.description?`<p class="task-description">${esc(tk.description)}</p>`:''}<div class="detail-facts"><div><small>Start date</small><strong>${date(tk.start_date)}</strong></div><div><small>Deadline</small><strong>${date(tk.deadline)}</strong></div><div><small>Priority</small><strong>${tk.priority}</strong></div><div><small>Assignees</small><strong>${assigneesDisplay}</strong></div></div>${tk.deliverable?`<div class="deliverable-box"><small>Required deliverable</small><strong>${esc(tk.deliverable)}</strong></div>`:''}${isAssignee?`<section class="modal-section"><h2>Xác nhận nhận việc</h2>${ackAt?`<p class="ack-confirmed">${icon('check')} Đã xác nhận · ${date(ackAt)}</p>`:'<button class="btn small" id="ack-task">Xác nhận nhận việc</button>'}</section>`:''}<section class="modal-section"><div class="panel-head"><h2>Checklist</h2></div>${d.checklist.length?`<div class="checklist-list">${d.checklist.map(item=>`<label class="checklist-item"><input type="checkbox" data-checklist-item="${item.id}" ${item.is_done?'checked':''} ${d.canUpdate?'':'disabled'}><span>${esc(item.title)}</span></label>`).join('')}</div>`:'<p class="muted">Chưa có việc con.</p>'}${d.canUpdate?`<form id="checklist-add-form" class="form compact-form" style="margin-top:10px"><input name="title" maxlength="255" placeholder="Thêm việc con…" required><button class="btn small">Thêm</button></form>`:''}</section><section class="modal-section"><div class="panel-head"><h2>Files & relevant links</h2><button class="btn small" data-modal-attachment>${icon('plus')} Add material</button></div><p class="quota-label">${fileSize(used)} / 50 MB</p>${d.attachments.length?`<div class="evidence-list">${d.attachments.map(x=>`<a class="evidence-item" href="${x.link_url?esc(x.link_url):`/api/task-attachments/${x.id}/content`}" target="_blank" rel="noopener noreferrer"><span class="file-icon">${x.mime_type?.startsWith('image/')?icon('image'):x.link_url?icon('arrow-square-out'):icon('file-text')}</span><span><strong>${esc(x.label)}</strong><small>${esc(x.user_name)} · ${badge(x.kind)} ${x.size_bytes?`· ${fileSize(x.size_bytes)}`:''}</small></span></a>`).join('')}</div>`:'<p class="muted">No files or links yet.</p>'}</section><section class="modal-section"><h2>Task comments</h2>${d.updates.length?`<div class="mini-timeline">${d.updates.map(x=>`<div><strong>${esc(x.user_name)}</strong>${badge(x.kind)}<p>${esc(x.body)}</p><small>${date(x.created_at)}</small></div>`).join('')}</div>`:'<p class="muted">No task comments yet.</p>'}<form id="task-comment-form" class="form compact-form"><textarea name="body" placeholder="Add a comment or progress note…" required></textarea><div><select name="kind"><option value="comment">Comment</option><option value="progress">Progress update</option><option value="issue">Issue</option><option value="evidence">Evidence</option></select><button class="btn small">Post comment</button></div></form></section>${isAssignee&&['todo','in_progress'].includes(tk.status)?`<section class="complete-box" id="submit-review-box"><h2>Nộp nghiệm thu</h2><p class="muted">Đính kèm liên kết hoặc tệp minh chứng cùng ghi chú, sau đó gửi để ban điều hành hoặc tổ trưởng duyệtk.</p><form id="submit-review-form" class="form" enctype="multipart/form-data"><input type="url" name="link_url" placeholder="Liên kết minh chứng (không bắt buộc)"><label class="upload-zone" style="opacity:.5;pointer-events:none" title="Tạm thời tắt tính năng tải tệp lên, vui lòng dùng liên kết minh chứng.">Tệp bàn giao (tạm thời tắt, vui lòng dùng liên kết)<input type="file" name="file" disabled accept=".jpg,.jpeg,.png,.gif,.webp,.heic,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"></label><textarea name="notes" placeholder="Ghi chú (không bắt buộc)"></textarea><button class="btn primary wide">Nộp nghiệm thu</button></form></section>`:''}${isReviewer&&tk.status==='review'?`<section class="complete-box" id="review-box"><h2>Nghiệm thu công việc</h2><p class="muted">Xem lại minh chứng ở trên rồi quyết định.</p><div class="review-actions"><button class="btn primary" id="review-approve">${translate('Approve')}</button><button class="btn" id="review-reject">${translate('Request rework')}</button><button class="btn danger" id="review-cancel">${translate('Bác bỏ')}</button></div></section>`:''}${canCancelSelfLog?`<section class="modal-section" style="display:flex;justify-content:flex-end;padding-top:10px"><button type="button" class="btn small danger" id="cancel-self-task">${icon('x')} ${translate('Rút lại công việc này')}</button></section>`:''}`);$('[data-modal-attachment]').onclick=()=>attachmentModal(tk.id,tk.title,used);$('#task-comment-form').onsubmit=async e=>{e.preventDefault();try{const payload=Object.fromEntries(new FormData(e.target));await api(`/api/activities/${tk.activity_id}/updates`,{method:'POST',body:JSON.stringify({...payload,task_id:tk.id})});toast('Comment posted');taskDetailModal(tk.id)}catch(err){toast(err.message)}};$('#ack-task')?.addEventListener('click',async e=>{e.currentTarget.disabled=true;try{await api(`/api/tasks/${tk.id}/acknowledge`,{method:'POST'});toast('Đã xác nhận nhận việc');taskDetailModal(tk.id)}catch(err){toast(err.message);e.currentTarget.disabled=false}});$('#checklist-add-form')?.addEventListener('submit',async e=>{e.preventDefault();const button=$('button',e.target);button.disabled=true;try{const title=String(new FormData(e.target).get('title')||'').trim();if(!title)throw new Error('Nội dung việc con là bắt buộc.');await api(`/api/tasks/${tk.id}/checklist`,{method:'POST',body:JSON.stringify({title})});taskDetailModal(tk.id)}catch(err){toast(err.message);button.disabled=false}});$$('[data-checklist-item]').forEach(box=>box.onchange=async()=>{box.disabled=true;try{await api(`/api/tasks/${tk.id}/checklist/${box.dataset.checklistItem}`,{method:'PATCH',body:JSON.stringify({is_done:box.checked})});taskDetailModal(tk.id)}catch(err){toast(err.message);box.disabled=false;box.checked=!box.checked}});$('#submit-review-form')?.addEventListener('submit',async e=>{e.preventDefault();const button=$('button',e.target);button.disabled=true;try{const res=await fetch(`/api/tasks/${tk.id}/submit-review`,{method:'POST',body:new FormData(e.target)}),data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||'Upload failed');$('#modal').close();toast('Đã nộp nghiệm thu');route()}catch(err){toast(err.message);button.disabled=false}});$('#review-approve')?.addEventListener('click',async e=>{e.currentTarget.disabled=true;try{await api(`/api/tasks/${tk.id}/review`,{method:'POST',body:JSON.stringify({decision:'approve'})});$('#modal').close();toast('Đã duyệt đạt');route()}catch(err){toast(err.message);e.currentTarget.disabled=false}});$('#review-reject')?.addEventListener('click',()=>feedbackPromptModal(translate('Yêu cầu làm lại'),async feedback=>{if(!feedback)throw new Error(translate('Vui lòng nêu rõ lý do khi yêu cầu làm lại.'));await api(`/api/tasks/${tk.id}/review`,{method:'POST',body:JSON.stringify({decision:'reject',feedback})});toast(translate('Đã yêu cầu làm lại'));route()}));$('#review-cancel')?.addEventListener('click',()=>feedbackPromptModal(translate('Bác bỏ công việc'),async feedback=>{if(!feedback)throw new Error(translate('Vui lòng nêu rõ lý do khi bác bỏ.'));await api(`/api/tasks/${tk.id}/review`,{method:'POST',body:JSON.stringify({decision:'cancel',feedback})});toast(translate('Đã bác bỏ công việc'));route()}));$('#cancel-self-task')?.addEventListener('click',()=>confirmModal(translate('Rút lại công việc'),translate('Bạn có chắc chắn muốn rút lại công việc tự ghi nhận này không?'),async()=>{try{await api(`/api/tasks/${tk.id}/cancel`,{method:'POST'});$('#modal').close();toast(translate('Đã rút lại công việc'));route()}catch(err){toast(err.message)}}));if(completeFocus)requestAnimationFrame(()=>$('#submit-review-box')?.scrollIntoView({behavior:'smooth'}))}catch(err){toast(err.message)}}
document.addEventListener('click',e=>{
  const attach=e.target.closest('[data-attach-task]'),view=e.target.closest('[data-task-view]'),done=e.target.closest('[data-task-done]');
  if(attach)attachmentModal(attach.dataset.attachTask,attach.dataset.taskTitle,attach.dataset.used);
  if(view)taskDetailModal(view.dataset.taskView);
  if(done)taskDetailModal(done.dataset.taskDone,true);
});
const renderPeoplePage=people;
function testEmailModal(){openModal('<span class="eyebrow green">EMAIL NOTIFICATION</span><h2>Gửi email kiểm tra</h2><p class="muted">Nhập địa chỉ sẽ nhận email kiểm tra từ Gmail đã cấu hình.</p><form id="test-email-form" class="form"><label>Địa chỉ email<input type="email" name="to" autocomplete="email" placeholder="name@example.com" required></label><button class="btn primary wide">Gửi email kiểm tra</button></form>');$('#test-email-form').onsubmit=async event=>{event.preventDefault();const button=$('button',event.currentTarget),to=String(new FormData(event.currentTarget).get('to')||'').trim();button.disabled=true;button.textContent='Đang gửi…';try{const result=await api('/api/email/test',{method:'POST',body:JSON.stringify({to})});$('#modal').close();toast(`Đã gửi email kiểm tra đến ${result.to}`)}catch(error){toast(error.message);button.disabled=false;button.textContent='Gửi email kiểm tra'}}}
people=async function(){await renderPeoplePage();if(!isExec())return;const header=$('.page-head');header.insertAdjacentHTML('beforeend',`<button class="btn" id="test-email">${icon('envelope')} Test email</button>`);$('#test-email').onclick=testEmailModal};
translateDOM(document);secureExternalLinks(document);init().catch(e=>{console.error(e);$('#login').classList.remove('hidden');toast(lang==='vi'?'Không thể kết nối đến máy chủ':'Could not connect to the server')});
