export const getRoleLabel = (role?: string): string => {
  switch (role) {
    case 'admin':
      return 'Trưởng Ban TCKT';
    case 'vice_admin':
      return 'Phó Ban TCKT';
    case 'leader':
    case 'Tổ Trưởng':
      return 'Tổ Trưởng';
    case 'vice_leader':
    case 'Tổ Phó':
      return 'Tổ Phó';
    default:
      return 'Thành Viên';
  }
};

export const getRoleStyle = (role?: string) => {
  switch (role) {
    case 'admin':
    case 'vice_admin':
      return { bg: '#FFE380', color: '#172B4D', dot: '#FF8B00' };
    case 'leader':
    case 'Tổ Trưởng':
      return { bg: '#FFF0B3', color: '#825800', dot: '#FFAB00' };
    case 'vice_leader':
    case 'Tổ Phó':
      return { bg: '#DEEBFF', color: '#0747A6', dot: '#0052CC' };
    default:
      return { bg: '#F4F5F7', color: '#42526E', dot: '#6B778C' };
  }
};

/** Vai trò admin được chọn khi tạo/sửa tài khoản (thứ tự như UI cũ). */
export const ROLE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'member', label: 'Thành Viên' },
  { value: 'leader', label: 'Tổ Trưởng' },
  { value: 'vice_leader', label: 'Tổ Phó' },
  { value: 'vice_admin', label: 'Phó Ban TCKT' },
  { value: 'admin', label: 'Trưởng Ban TCKT' },
];
